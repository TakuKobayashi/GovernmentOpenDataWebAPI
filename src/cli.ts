import { program, Command } from 'commander';
import packageJson from '../package.json';
import XLSX, { WorkBook } from 'xlsx';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import fg from 'fast-glob';
import crypto from 'crypto';
import _ from 'lodash';
import Encoding from 'encoding-japanese';
import nodeHtmlParser from 'node-html-parser';
import romajiConv from '@koozaki/romaji-conv';
import { buildPlacesDataFromWorkbook } from './models/place';
import { importGsiMuni } from './models/gsimuni';
import { prismaClient } from './utils/prisma-common';
import { saveToLocalFileFromString, saveToLocalFileFromBuffer, loadSpreadSheetRowObject } from './utils/util';
import { exportToInsertSQL } from './utils/data-exporters';
import { requestKeyphrase, requestAnalysisParse } from './utils/yahoo-api';
import { sleep } from './utils/util';
import { config } from 'dotenv';
config();

program.storeOptionsAsProperties(false);

program.version(packageJson.version, '-v, --version');

const API_VERSION_NAME = 'v1';

const dataCommand = new Command('data');

dataCommand
  .command('import:master')
  .description('')
  .action(async (options: any) => {
    await importGsiMuni();
    const categoryFilePath = path.join('resources', 'master-data', 'category.csv');
    const newCategoryObjs: { title: string; description: string }[] = [];
    loadSpreadSheetRowObject(categoryFilePath, (sheetName: string, rowObj: any) => {
      newCategoryObjs.push({ title: rowObj.title, description: rowObj.description });
    });
    const categoryModels = await prismaClient.$transaction(
      newCategoryObjs.map((newCategoryObj) => {
        return prismaClient.category.upsert({
          where: {
            title: newCategoryObj.title,
          },
          update: {
            description: newCategoryObj.description,
          },
          create: newCategoryObj,
        });
      }),
    );
    const titleCategory = _.keyBy(categoryModels, (categoryModel) => categoryModel.title);

    const downloadInfoFilePath = path.join('resources', 'master-data', 'download-file-info.csv');
    const crawlerUrlCategory: {
      [url: string]: {
        id: number;
        title: string;
        description: string | null;
      };
    } = {};
    const newCrawlerObjs: {
      origin_url: string;
      origin_file_ext: string;
      need_manual_edit?: boolean;
    }[] = [];
    const alreadyExistOriginUrlSet: Set<string> = new Set();
    await crawlerFindInBatches({}, 1000, async (crawlers) => {
      for (const crawler of crawlers) {
        alreadyExistOriginUrlSet.add(crawler.origin_url);
      }
    });
    loadSpreadSheetRowObject(downloadInfoFilePath, async (sheetName: string, rowObj: any) => {
      if (!alreadyExistOriginUrlSet.has(rowObj.url)) {
        const rowUrl = new URL(rowObj.url);
        const newCrawlerObj: {
          origin_url: string;
          origin_file_ext: string;
          need_manual_edit?: boolean;
        } = {
          origin_url: rowUrl.href,
          origin_file_ext: path.extname(rowUrl.pathname),
          need_manual_edit: Boolean(rowObj.needManualEdit),
        };
        if (rowObj.categoryTitle) {
          crawlerUrlCategory[newCrawlerObj.origin_url] = titleCategory[rowObj.categoryTitle];
        }
        newCrawlerObjs.push(newCrawlerObj);
      }
    });
    if (newCrawlerObjs.length > 0) {
      const currentCrawlers = await prismaClient.crawler.findMany({
        where: {
          origin_url: {
            in: newCrawlerObjs.map((newCrawlerObj) => newCrawlerObj.origin_url),
          },
        },
        select: {
          origin_url: true,
        },
      });
      const currentCrawlerSet = new Set(currentCrawlers.map((currentCrawler) => currentCrawler.origin_url));
      const willCreateCrawlerObjs = newCrawlerObjs.filter((newCrawlerObj) => !currentCrawlerSet.has(newCrawlerObj.origin_url));
      await prismaClient.$transaction(async (tx) => {
        await tx.crawler.createMany({ data: willCreateCrawlerObjs });
        const createCrawlerModels = await tx.crawler.findMany({
          where: {
            origin_url: {
              in: willCreateCrawlerObjs.map((willCreateCrawlerObj) => willCreateCrawlerObj.origin_url),
            },
          },
          select: {
            id: true,
            origin_url: true,
          },
        });
        const existCategoryCrawlerModels = createCrawlerModels.filter((crawler) => {
          return crawlerUrlCategory[crawler.origin_url];
        });
        if (existCategoryCrawlerModels.length > 0) {
          await tx.crawlerCategory.createMany({
            data: existCategoryCrawlerModels.map((crawler) => {
              return {
                crawler_id: crawler.id,
                crawler_type: 'Crawler',
                category_id: crawlerUrlCategory[crawler.origin_url].id,
              };
            }),
          });
        }
      });
    }

    const currentCrawlerRootModels = await prismaClient.crawlerRoot.findMany({
      select: {
        url: true,
      },
    });
    const currentRootUrlSet: Set<String> = new Set(currentCrawlerRootModels.map((currentCrawlerRootModel) => currentCrawlerRootModel.url));
    const rootUrlCategory: {
      [url: string]: {
        id: number;
        title: string;
        description: string | null;
      };
    } = {};
    const newRootUrlSet: Set<string> = new Set();
    const downloadRootFilePath = path.join('resources', 'master-data', 'download-root-info.csv');
    loadSpreadSheetRowObject(downloadRootFilePath, (sheetName: string, rowObj: any) => {
      if (!currentRootUrlSet.has(rowObj.url)) {
        newRootUrlSet.add(rowObj.url);
        if (titleCategory[rowObj.categoryTitle]) {
          rootUrlCategory[rowObj.url] = titleCategory[rowObj.categoryTitle];
        }
      }
    });
    await prismaClient.$transaction(async (tx) => {
      await tx.crawlerRoot.createMany({
        data: Array.from(newRootUrlSet).map((rootUrl) => {
          return {
            url: rootUrl,
          };
        }),
      });
      const cratedCrawlerRoots = await tx.crawlerRoot.findMany({
        where: {
          url: {
            in: Array.from(newRootUrlSet),
          },
        },
        select: {
          id: true,
          url: true,
        },
      });
      const existCategoryRootModels = cratedCrawlerRoots.filter((crawlerRoot) => {
        return crawlerUrlCategory[crawlerRoot.url];
      });
      if (existCategoryRootModels.length > 0) {
        await tx.crawlerCategory.createMany({
          data: existCategoryRootModels.map((crawlerRoot) => {
            return {
              crawler_id: crawlerRoot.id,
              crawler_type: 'CrawlerRoot',
              category_id: rootUrlCategory[crawlerRoot.url].id,
            };
          }),
        });
      }
    });
  });

dataCommand
  .command('generate:keywords')
  .description('')
  .action(async (options: any) => {
    await crawlerFindInBatches(
      {
        origin_title: { not: null },
        state: { in: ['STANDBY', 'DOWNLOADED'] },
      },
      1000,
      async (crawlerModels) => {
        const currentCrawlerKeywords = await prismaClient.crawlerKeyword.findMany({
          where: {
            crawler_id: {
              in: crawlerModels.map((crawlerModel) => crawlerModel.id),
            },
          },
          select: {
            crawler_id: true,
          },
        });

        const checkCrawlerModels = crawlerModels.filter(
          (crawlerModel) =>
            crawlerModel.origin_title && currentCrawlerKeywords.every((crawlerKeyword) => crawlerKeyword.crawler_id !== crawlerModel.id),
        );
        for (const crawlerModel of checkCrawlerModels) {
          const keyphrase = await requestKeyphrase(crawlerModel.origin_title!!.normalize('NFKC'), crawlerModel.id);
          await sleep(200);
          const wordScores: { [word: string]: number } = {};
          for (const phrase of keyphrase.result.phrases) {
            const analysis = await requestAnalysisParse(phrase.text, crawlerModel.id);
            await sleep(200);
            for (const token of analysis.result.tokens) {
              if (token[3] !== '名詞') {
                continue;
              }
              if (token[0]) {
                wordScores[token[0]] = phrase.score;
              }
            }
          }
          await prismaClient.$transaction(async (tx) => {
            await tx.keyword.updateMany({
              where: {
                word: {
                  in: Object.keys(wordScores),
                },
              },
              data: {
                appear_count: {
                  increment: 1,
                },
              },
            });
            const currentKeywords = await tx.keyword.findMany({
              where: {
                word: {
                  in: Object.keys(wordScores),
                },
              },
            });
            const newWords = Object.keys(wordScores).filter((word) =>
              currentKeywords.every((keyword) => {
                const wordConv = romajiConv(word);
                return keyword.word !== wordConv.toHiragana().normalize('NFKC') && keyword.word !== wordConv.toKatakana().normalize('NFKC');
              }),
            );
            await tx.keyword.createMany({
              data: newWords.map((word) => {
                return { word: word, appear_count: 1 };
              }),
            });
            const keywords = await tx.keyword.findMany({
              where: {
                word: {
                  in: Object.keys(wordScores),
                },
              },
            });
            const currentCrawlerKeywords = await tx.crawlerKeyword.findMany({
              where: {
                crawler_id: crawlerModel.id,
                keyword_id: {
                  in: keywords.map((keyword) => keyword.id),
                },
              },
            });
            const newKeywords = keywords.filter((keyword) =>
              currentCrawlerKeywords.every((crawlerKeyword) => crawlerKeyword.keyword_id !== keyword.id),
            );
            await tx.crawlerKeyword.createMany({
              data: newKeywords.map((keyword) => {
                return {
                  crawler_id: crawlerModel.id,
                  keyword_id: keyword.id,
                  score: wordScores[keyword.word] || 0,
                };
              }),
            });
            await tx.crawler.updateMany({
              where: {
                id: crawlerModel.id,
              },
              data: {
                state: 'KEYWORD_GENERATED',
              },
            });
          });
        }
      },
    );
  });

dataCommand
  .command('download')
  .description('')
  .action(async (options: any) => {
    await crawlerFindInBatches(
      {
        need_manual_edit: false,
        origin_file_ext: {
          in: ['.csv'],
        },
        state: { in: ['STANDBY', 'KEYWORD_GENERATED'] },
      },
      1000,
      async (crawlerModels) => {
        const crawlerCategories = await prismaClient.crawlerCategory.findMany({
          where: {
            crawler_id: {
              in: crawlerModels.map((crawlerModel) => crawlerModel.id),
            },
            crawler_type: 'Crawler',
          },
          include: {
            category: true,
          },
        });
        const crawlerIdCrawlerCategory = _.keyBy(crawlerCategories, (crawlerCategory) => crawlerCategory.crawler_id);

        const crawlerKeywords = await prismaClient.crawlerKeyword.findMany({
          where: {
            crawler_id: {
              in: crawlerModels.map((crawlerModel) => crawlerModel.id),
            },
          },
          include: {
            keyword: true,
          },
        });
        const crawlerIdcrawlerKeywords = _.groupBy(crawlerKeywords, (crawlerKeyword) => crawlerKeyword.crawler_id);

        for (const crawlerModel of crawlerModels) {
          const willUpdateCrawlerObj: {
            need_manual_edit: boolean;
            last_updated_at?: Date;
            checksum?: string;
            origin_file_encoder?: string;
            origin_file_size: number;
          } = {
            need_manual_edit: false,
            origin_file_size: 0,
          };
          const willSaveFilePath: string = path.join(
            ...getSaveOriginFilePathParts(
              crawlerModel,
              crawlerIdcrawlerKeywords[crawlerModel.id],
              crawlerIdCrawlerCategory[crawlerModel.id],
            ),
          );
          const response = await axios.get(crawlerModel.origin_url, { responseType: 'arraybuffer' }).catch(async (error) => {
            willUpdateCrawlerObj.need_manual_edit = true;
            await prismaClient.crawler.updateMany({
              where: {
                id: crawlerModel.id,
              },
              data: willUpdateCrawlerObj,
            });
          });
          if (!response?.data) {
            continue;
          }
          let saveData: Buffer;
          if (['.csv', '.json', '.txt', '.rdf', '.xml'].includes(crawlerModel.origin_file_ext)) {
            const detectedEncoding = Encoding.detect(response.data);
            let textData: string;
            // TextDecoder の一覧 https://developer.mozilla.org/ja/docs/Web/API/Encoding_API/Encodings
            if (detectedEncoding === 'SJIS' || detectedEncoding === 'UNICODE') {
              textData = new TextDecoder('shift-jis').decode(response.data.buffer);
            } else if (detectedEncoding === 'EUCJP') {
              textData = new TextDecoder('euc-jp').decode(response.data.buffer);
            } else if (detectedEncoding === 'ASCII') {
              textData = new TextDecoder('windows-1252').decode(response.data.buffer);
            } else if (detectedEncoding === 'UTF16BE') {
              textData = new TextDecoder('utf-16be').decode(response.data.buffer);
            } else if (detectedEncoding === 'UTF16LE' || detectedEncoding === 'UTF16') {
              textData = new TextDecoder('utf-16le').decode(response.data.buffer);
            } else if (detectedEncoding === 'UTF8' || detectedEncoding === 'UTF32') {
              textData = response.data.toString();
            } else {
              textData = response.data.toString();
            }
            saveData = Buffer.from(textData, 'utf8');
            willUpdateCrawlerObj.origin_file_encoder = detectedEncoding.toString();
          } else {
            saveData = response.data;
          }
          // 100MB以上のファイルはGitに乗らないのでダウンロードしない
          if (response.data.length < 99900000) {
            saveToLocalFileFromBuffer(willSaveFilePath, saveData);
            const stat = fs.statSync(willSaveFilePath);
            willUpdateCrawlerObj.origin_file_size = stat.size;
          } else {
            willUpdateCrawlerObj.need_manual_edit = true;
            willUpdateCrawlerObj.origin_file_size = response.data.length;
          }
          willUpdateCrawlerObj.last_updated_at = new Date();
          willUpdateCrawlerObj.checksum = crypto.createHash('sha512').update(response.data.buffer.toString('hex')).digest('hex');
          await prismaClient.crawler.updateMany({
            where: {
              id: crawlerModel.id,
            },
            data: willUpdateCrawlerObj,
          });
        }
      },
    );
  });

dataCommand
  .command('import:origin')
  .description('')
  .action(async (options: any) => {
    const crawlerFilePathSet: Set<string> = new Set();
    await crawlerFindInBatches(
      {
        checksum: { not: null },
        last_updated_at: { not: null },
        origin_file_ext: {
          in: ['.xlsx', '.xls'],
        },
      },
      1000,
      async (crawlerModels) => {
        for (const crawlerModel of crawlerModels) {
          const originUrl = new URL(crawlerModel.origin_url);
          crawlerFilePathSet.add(originUrl.pathname);
        }
        await importOriginRoutine(crawlerModels);
      },
    );
    await crawlerFindInBatches(
      {
        checksum: { not: null },
        last_updated_at: { not: null },
        origin_file_ext: {
          in: ['.csv'],
        },
      },
      1000,
      async (crawlerModels) => {
        const csvCrawlerModels = crawlerModels.filter((crawlerModel) => {
          const originUrl = new URL(crawlerModel.origin_url);
          return !crawlerFilePathSet.has(originUrl.pathname);
        });
        await importOriginRoutine(csvCrawlerModels);
      },
    );
  });

dataCommand
  .command('export:master')
  .description('')
  .action(async (options: any) => {
    const downloadInfoFilePath = path.join('resources', 'master-data', 'download-file-info.csv');
    const downloadFileInfoCsvStream = fs.createWriteStream(downloadInfoFilePath);
    downloadFileInfoCsvStream.write(['url', 'categoryTitle', 'title', 'needManualEdit'].join(','));
    await crawlerFindInBatches({}, 1000, async (crawlerModels) => {
      const crawlerCategories = await prismaClient.crawlerCategory.findMany({
        where: {
          crawler_id: {
            in: crawlerModels.map((crawlerModel) => crawlerModel.id),
          },
          crawler_type: 'Crawler',
        },
        include: {
          category: true,
        },
      });
      const crawlerIdCrawlerCategory = _.keyBy(crawlerCategories, (crawlerCategory) => crawlerCategory.crawler_id);
      for (const crawlerModel of crawlerModels) {
        const crawlerCategory = crawlerIdCrawlerCategory[crawlerModel.id];
        const categoryTitle = crawlerCategory?.category?.title || '';
        downloadFileInfoCsvStream.write('\n');
        downloadFileInfoCsvStream.write(
          [
            crawlerModel.origin_url,
            categoryTitle,
            (crawlerModel.origin_title || '').replace(/\n/g, ''),
            Number(crawlerModel.need_manual_edit),
          ].join(','),
        );
      }
    });
    downloadFileInfoCsvStream.end();

    const crawlerRootModels = await prismaClient.crawlerRoot.findMany();
    const crawlerRootCategories = await prismaClient.crawlerCategory.findMany({
      where: {
        crawler_id: {
          in: crawlerRootModels.map((crawlerRootModel) => crawlerRootModel.id),
        },
        crawler_type: 'CrawlerRoot',
      },
      include: {
        category: true,
      },
    });
    const crawlerRootIdCrawlerCategory = _.keyBy(crawlerRootCategories, (crawlerCategory) => crawlerCategory.crawler_id);
    const downloadRootInfoFilePath = path.join('resources', 'master-data', 'download-root-info.csv');
    const downloadRootInfoCsvStream = fs.createWriteStream(downloadRootInfoFilePath);
    downloadRootInfoCsvStream.write(['url', 'categoryTitle'].join(','));
    for (const crawlerRootModel of crawlerRootModels) {
      const crawlerCategory = crawlerRootIdCrawlerCategory[crawlerRootModel.id];
      const categoryTitle = crawlerCategory?.category?.title || '';
      downloadRootInfoCsvStream.write('\n');
      downloadRootInfoCsvStream.write([crawlerRootModel.url, categoryTitle].join(','));
    }
    downloadRootInfoCsvStream.end();
  });

program.addCommand(dataCommand);

const sqlCommand = new Command('sql');

sqlCommand
  .command('export')
  .description('')
  .action(async (options: any) => {
    await exportToInsertSQL();
  });

program.addCommand(sqlCommand);

program
  .command('build')
  .description('')
  .action(async (options: any) => {
    const categories = await prismaClient.category.findMany({
      include: {
        data_categories: true,
      },
    });
    for (const categoryModel of categories) {
      const placeCategories = categoryModel.data_categories.filter((placeCategoryModel) => placeCategoryModel.source_type === 'Place');
      const placeModels = await prismaClient.place.findMany({
        where: {
          id: {
            in: placeCategories.map((placeCategoryModel) => placeCategoryModel.source_id),
          },
        },
      });
      const categoryApiObjs = placeModels.map((placeModel) => convertToApiFormatDataObjs(placeModel));
      const willSaveFilePath: string = path.join('build', 'api', API_VERSION_NAME, 'category', categoryModel.title, 'list.json');
      saveToLocalFileFromString(willSaveFilePath, JSON.stringify({ category: categoryModel.title, data: categoryApiObjs }));
      const provincePlaceModels = _.groupBy(placeModels, (placeModel) => placeModel.province);
      for (const province of Object.keys(provincePlaceModels)) {
        const provincePlaces = provincePlaceModels[province];
        const cityPlaceModels = _.groupBy(provincePlaces, (placeModel) => placeModel.city);
        for (const city of Object.keys(cityPlaceModels)) {
          const provinceCityApiObjs = cityPlaceModels[city].map((placeModel) => convertToApiFormatDataObjs(placeModel));
          const willSaveFilePath: string = path.join('build', 'api', API_VERSION_NAME, province, city, `${categoryModel.title}.json`);
          saveToLocalFileFromString(willSaveFilePath, JSON.stringify({ category: categoryModel.title, data: provinceCityApiObjs }));
        }
      }
    }
  });

const crawlCommand = new Command('crawl');

crawlCommand
  .command('rooturl')
  .description('')
  .action(async (options: any) => {
    await crawlRootUrlFromDataset();
    const categoryModels = await prismaClient.category.findMany();
    const titleCategory = _.keyBy(categoryModels, (categoryModel) => categoryModel.title);
    const searchKeywordCategories: {
      keyword: string;
      category: {
        id: number;
        title: string;
        description: string | null;
      };
    }[] = [];
    const searchKeywordFilePath = path.join('resources', 'master-data', 'search-keyword.csv');
    loadSpreadSheetRowObject(searchKeywordFilePath, (sheetName: string, rowObj: any) => {
      searchKeywordCategories.push({ keyword: rowObj.keyword, category: titleCategory[rowObj.categoryTitle] });
    });
    for (const keywordCategory of searchKeywordCategories) {
      await crawlRootUrlFromDataset(keywordCategory);
    }
  });

crawlCommand
  .command('master-file')
  .description('')
  .action(async (options: any) => {
    const crawlerRootModels = await prismaClient.crawlerRoot.findMany({
      where: {
        last_updated_at: null,
      },
    });
    const rootCrawlerCategories = await prismaClient.crawlerCategory.findMany({
      where: {
        crawler_id: {
          in: crawlerRootModels.map((crawlerRootModel) => crawlerRootModel.id),
        },
        crawler_type: 'CrawlerRoot',
      },
    });
    const rootIdCrawlerCategory = _.keyBy(rootCrawlerCategories, (rootCC) => rootCC.crawler_id);
    for (const crawlerRootModel of crawlerRootModels) {
      const newUrlRootId: { [url: string]: number } = {};
      const newCrawlerObjs: {
        origin_url: string;
        origin_title: string;
        origin_file_ext: string;
      }[] = [];
      const response = await axios.get(crawlerRootModel.url).catch((error) => console.log(error));
      if (!response?.data) {
        continue;
      }
      const root = nodeHtmlParser.parse(response.data.toString());
      const resourceItemDoms = root.querySelectorAll('li.resource-item');
      for (const resourceItemDom of resourceItemDoms) {
        const titleDom = resourceItemDom.querySelector('a.heading');
        const titleAttrs = titleDom?.attrs || {};
        const downloadLinkDom = resourceItemDom.querySelector('a.resource-url-analytics');
        const downloadLinkAttrs = downloadLinkDom?.attrs || {};
        if (downloadLinkAttrs.href) {
          const downloadUrl = new URL(downloadLinkAttrs.href);
          newCrawlerObjs.push({
            origin_title: titleAttrs.title,
            origin_url: downloadUrl.href,
            origin_file_ext: path.extname(downloadUrl.pathname),
          });
          newUrlRootId[downloadUrl.href] = crawlerRootModel.id;
        }
      }
      const newUniqCrawlerObjs = _.uniqBy(newCrawlerObjs, (newCrawlerObj) => newCrawlerObj.origin_url);
      const currentCrawlers = await prismaClient.crawler.findMany({
        where: {
          origin_url: {
            in: Object.keys(newUrlRootId),
          },
        },
        select: {
          origin_url: true,
        },
      });
      const currentCrawlerSet = new Set(currentCrawlers.map((currentCrawler) => currentCrawler.origin_url));
      const willCreateCrawlerObjs = newUniqCrawlerObjs.filter((newCrawlerObj) => !currentCrawlerSet.has(newCrawlerObj.origin_url));
      await prismaClient.$transaction(async (tx) => {
        await tx.crawler.createMany({ data: willCreateCrawlerObjs });
        const createCrawlers = await tx.crawler.findMany({
          where: {
            origin_url: {
              in: willCreateCrawlerObjs.map((willCreateCrawlerObj) => willCreateCrawlerObj.origin_url),
            },
          },
          select: {
            id: true,
            origin_url: true,
          },
        });
        if (rootIdCrawlerCategory[crawlerRootModel.id]) {
          const currentCrawlerCategories = await tx.crawlerCategory.findMany({
            where: {
              crawler_id: {
                in: createCrawlers.map((crawler) => crawler.id),
              },
              crawler_type: 'Crawler',
              category_id: rootIdCrawlerCategory[crawlerRootModel.id].category_id,
            },
          });
          const currentCrawlerIdCategoryId: { [crawlerId: number]: number } = {};
          for (const currentCrawlerCategory of currentCrawlerCategories) {
            currentCrawlerIdCategoryId[currentCrawlerCategory.crawler_id] = currentCrawlerCategory.category_id;
          }
          await tx.crawlerCategory.createMany({
            data: createCrawlers
              .filter((createCrawler) => {
                const categoryId = currentCrawlerIdCategoryId[createCrawler.id];
                return !(categoryId && categoryId == rootIdCrawlerCategory[crawlerRootModel.id].category_id);
              })
              .map((crawler) => {
                return {
                  crawler_id: crawler.id,
                  crawler_type: 'Crawler',
                  category_id: rootIdCrawlerCategory[crawlerRootModel.id].category_id,
                };
              }),
          });
        }

        const currentCrawlerRootRelations = await tx.crawlerRootRelation.findMany({
          where: {
            to_url: {
              in: createCrawlers.map((crawler) => crawler.origin_url),
            },
            to_crawler_type: 'Crawler',
          },
        });
        await tx.crawlerRootRelation.createMany({
          data: createCrawlers
            .filter((crawler) => {
              return currentCrawlerRootRelations.every(
                (rootRelation) =>
                  rootRelation.to_url !== crawler.origin_url && rootRelation.from_crawler_root_id !== newUrlRootId[crawler.origin_url],
              );
            })
            .map((crawler) => {
              return {
                to_url: crawler.origin_url,
                to_crawler_type: 'Crawler',
                from_crawler_root_id: newUrlRootId[crawler.origin_url],
              };
            }),
        });
        await tx.crawlerRoot.updateMany({
          where: {
            id: crawlerRootModel.id,
          },
          data: {
            last_updated_at: new Date(),
          },
        });
      });
      await sleep(1000);
    }
  });

program.addCommand(crawlCommand);

async function importOriginRoutine(
  crawlerModels: {
    id: number;
    origin_url: string;
    origin_file_ext: string;
    origin_title: string | null;
    origin_file_size: bigint;
    origin_file_encoder: string | null;
    checksum: string | null;
    need_manual_edit: boolean;
    last_updated_at: Date | null;
  }[],
) {
  const crawlerCategories = await prismaClient.crawlerCategory.findMany({
    where: {
      crawler_id: {
        in: crawlerModels.map((crawlerModel) => crawlerModel.id),
      },
      crawler_type: 'Crawler',
    },
    include: {
      category: true,
    },
  });
  const crawlerIdCrawlerCategory = _.keyBy(crawlerCategories, (crawlerCategory) => crawlerCategory.crawler_id);

  const crawlerKeywords = await prismaClient.crawlerKeyword.findMany({
    where: {
      crawler_id: {
        in: crawlerModels.map((crawlerModel) => crawlerModel.id),
      },
    },
    include: {
      keyword: true,
    },
  });
  const crawlerIdcrawlerKeywords = _.groupBy(crawlerKeywords, (crawlerKeyword) => crawlerKeyword.crawler_id);
  for (const crawlerModel of crawlerModels) {
    const crawlerCategory = crawlerIdCrawlerCategory[crawlerModel.id];
    const filePathes = fg.sync(
      getSaveOriginFilePathParts(crawlerModel, crawlerIdcrawlerKeywords[crawlerModel.id], crawlerCategory).join('/'),
    );
    for (const filePath of filePathes) {
      let workbook: WorkBook | undefined;
      try {
        if (path.extname(filePath) === '.csv') {
          const readFileData = fs.readFileSync(filePath, 'utf8');
          workbook = XLSX.read(readFileData, { type: 'string' });
        } else if (['.xlsx', '.xls'].includes(path.extname(filePath))) {
          workbook = XLSX.readFile(filePath);
        }
      } catch (error) {
        console.error({
          url: crawlerModel.origin_url,
          filePath: filePath,
          error: error,
        });
        continue;
      }
      if (workbook) {
        const buildPlaceModels = buildPlacesDataFromWorkbook(workbook);
        // TODO データ壊れている場合の情報の記録
        for (const buildPlaceModel of buildPlaceModels) {
          const logs = buildPlaceModel.getImportInvalidLogs();
          if (logs.length > 0) {
            console.log({
              url: crawlerModel.origin_url,
              filePath: filePath,
              ...logs,
            });
          }
        }
        const hashcodes = _.compact(buildPlaceModels.map((placeModel) => placeModel.hashcode));
        if (hashcodes.length <= 0) {
          continue;
        }
        const currentPlaceModels = await prismaClient.place.findMany({
          where: {
            hashcode: {
              in: hashcodes,
            },
          },
          select: {
            hashcode: true,
          },
        });
        const currentHashCodeSet: Set<string> = new Set(currentPlaceModels.map((currentPlaceModel) => currentPlaceModel.hashcode));
        const newPlaceModels = buildPlaceModels.filter((placeModel) => placeModel.hashcode && !currentHashCodeSet.has(placeModel.hashcode));
        if (newPlaceModels.length <= 0) {
          continue;
        }
        await Promise.all(newPlaceModels.map((newPlaceModel) => newPlaceModel.setLocationInfo()));
        const willSavePlaces = newPlaceModels.filter((newPlaceModel) => {
          const logs = newPlaceModel.getImportInvalidLogs();
          if (logs.length > 0) {
            console.log(logs);
          }
          return logs.length <= 0;
        });
        if (willSavePlaces.length <= 0) {
          continue;
        }
        if (newPlaceModels.length !== willSavePlaces.length) {
          console.warn({
            url: crawlerModel.origin_url,
            filePath: filePath,
          });
        }

        await prismaClient.$transaction(async (tx) => {
          await tx.place.createMany({
            data: willSavePlaces.map((newPlaceModel) => {
              return {
                name: newPlaceModel.name,
                hashcode: newPlaceModel.hashcode,
                province: newPlaceModel.province,
                city: newPlaceModel.city,
                address: newPlaceModel.address,
                lat: newPlaceModel.lat,
                lon: newPlaceModel.lon,
                geohash: newPlaceModel.geohash,
              };
            }),
          });
          if (crawlerCategory?.category_id) {
            const createdPlaces = await tx.place.findMany({
              where: {
                hashcode: {
                  in: willSavePlaces.map((newPlaceModel) => newPlaceModel.hashcode),
                },
              },
            });
            const currentPlaceCategories = await tx.dataCategory.findMany({
              where: {
                source_type: 'Place',
                source_id: {
                  in: createdPlaces.map((createdPlace) => createdPlace.id),
                },
                category_id: crawlerCategory.category_id,
              },
              select: {
                source_id: true,
              },
            });
            const currentPlaceIdSet = new Set(currentPlaceCategories.map((currentPlaceCategory) => currentPlaceCategory.source_id));
            const willCreateDataCategories: {
              source_id: number;
              source_type: 'Place';
              extra_info: { [key: string]: any };
              category_id: number;
            }[] = [];
            for (const newPlace of newPlaceModels) {
              const createdPlace = createdPlaces.find((createdPlace) => createdPlace.hashcode === newPlace.hashcode);
              if (createdPlace && !currentPlaceIdSet.has(createdPlace.id)) {
                willCreateDataCategories.push({
                  source_id: createdPlace.id,
                  source_type: 'Place',
                  extra_info: newPlace.getStashExtraInfo(),
                  category_id: crawlerCategory.category_id,
                });
              }
            }
            await tx.dataCategory.createMany({
              data: willCreateDataCategories,
            });
          }
        });
      }
    }
  }
}

async function crawlRootUrlFromDataset(
  keywordCategory: Partial<{
    keyword: string;
    category: {
      id: number;
      title: string;
      description: string | null;
    };
  }> = {},
) {
  const searchUrl = new URL('https://catalog.data.metro.tokyo.lg.jp/dataset');
  let pageNumber = 1;
  while (true) {
    const rootUrlSet: Set<string> = new Set<string>();
    const rootUrlCategory: { [url: string]: any } = {};
    const searchParams = new URLSearchParams({ page: pageNumber.toString() });
    if (keywordCategory.keyword) {
      searchParams.append('q', keywordCategory.keyword);
    }
    searchUrl.search = searchParams.toString();
    const response = await axios.get(searchUrl.toString());
    const root = nodeHtmlParser.parse(response.data.toString());
    const itemDoms = root.querySelectorAll('.dataset-item');
    if (itemDoms.length <= 0) {
      break;
    }
    for (const itemDom of itemDoms) {
      const datasetContents = itemDom.querySelectorAll('.dataset-content');
      for (const datasetContentItemDom of datasetContents) {
        const contentAtagDom = datasetContentItemDom.querySelector('a');
        const aTagAttrs = contentAtagDom?.attrs || {};
        const downloadRootUrl = new URL(searchUrl);
        downloadRootUrl.pathname = aTagAttrs.href || '/';
        downloadRootUrl.search = '';
        rootUrlSet.add(downloadRootUrl.href);
        if (keywordCategory.category) {
          rootUrlCategory[downloadRootUrl.href] = keywordCategory.category;
        }
      }
    }
    const currentRoots = await prismaClient.crawlerRoot.findMany({
      where: {
        url: {
          in: Array.from(rootUrlSet),
        },
      },
      select: {
        url: true,
      },
    });
    for (const currentRoot of currentRoots) {
      rootUrlSet.delete(currentRoot.url);
    }
    await prismaClient.$transaction(async (tx) => {
      await tx.crawlerRoot.createMany({
        data: Array.from(rootUrlSet).map((newUrl) => {
          return { url: newUrl };
        }),
      });
      if (keywordCategory.category) {
        const currentCrawlerRoots = await tx.crawlerRoot.findMany({
          where: {
            url: {
              in: Object.keys(rootUrlCategory),
            },
          },
          select: {
            id: true,
            url: true,
          },
        });
        const currentCrawlerCategories = await tx.crawlerCategory.findMany({
          where: {
            crawler_id: {
              in: currentCrawlerRoots.map((currentCrawlerRoot) => currentCrawlerRoot.id),
            },
            crawler_type: 'CrawlerRoot',
          },
          select: {
            crawler_id: true,
          },
        });
        const currentRootCrawlerIdSet = new Set(
          currentCrawlerCategories.map((currentCrawlerCategory) => currentCrawlerCategory.crawler_id),
        );
        await tx.crawlerCategory.createMany({
          data: currentCrawlerRoots
            .filter((currentCrawlerRoot) => !currentRootCrawlerIdSet.has(currentCrawlerRoot.id))
            .map((crawlerRoot) => {
              return {
                crawler_id: crawlerRoot.id,
                crawler_type: 'CrawlerRoot',
                category_id: rootUrlCategory[crawlerRoot.url].id,
              };
            }),
        });
      }
    });
    pageNumber = pageNumber + 1;
    await sleep(1000);
  }
}

async function crawlerFindInBatches(
  filter: { [columnName: string]: any } = {},
  batchSize: number = 1000,
  inBatches: (
    models: {
      id: number;
      origin_url: string;
      origin_file_ext: string;
      origin_title: string | null;
      origin_file_size: bigint;
      origin_file_encoder: string | null;
      checksum: string | null;
      need_manual_edit: boolean;
      last_updated_at: Date | null;
    }[],
  ) => Promise<void>,
) {
  const filterObj = {
    id: {
      gt: 0,
    },
    ...filter,
  };
  while (true) {
    const crawlerModels = await prismaClient.crawler.findMany({
      where: filterObj,
      take: batchSize,
      orderBy: [
        {
          id: 'asc',
        },
      ],
    });
    const maxId = _.maxBy(crawlerModels, (crawlerModel) => crawlerModel.id)?.id;
    if (maxId) {
      filterObj.id = {
        gt: maxId,
      };
    } else {
      break;
    }
    await inBatches(crawlerModels);
  }
}

function getSaveOriginFilePathParts(
  crawlerModel: {
    origin_url: string;
  },
  keywords: { keyword: { appear_count: number; word: string } }[] = [],
  crawlerCategory: { category: { title: string } } | undefined = undefined,
): string[] {
  const downloadUrl = new URL(crawlerModel.origin_url);
  const crawlerKeywordModel = _.maxBy(keywords, (cKeyword) => {
    return cKeyword.keyword.appear_count;
  });
  const dirTitle = crawlerKeywordModel?.keyword?.word || crawlerCategory?.category?.title || 'unknown';
  return ['resources', 'origin-data', dirTitle, downloadUrl.hostname, ...downloadUrl.pathname.split('/')];
}

function convertToApiFormatDataObjs(placeModel: any): any {
  return {
    name: placeModel.name,
    province: placeModel.province,
    city: placeModel.city,
    address: placeModel.address,
    lat: placeModel.lat,
    lon: placeModel.lon,
    ...(placeModel.extra_info as object),
  };
}

program.parse(process.argv);
