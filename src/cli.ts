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
import { buildPlacesDataFromWorkbook } from './models/place';
import { importGsiMuni } from './models/gsimuni';
import { prismaClient } from './utils/prisma-common';
import { saveToLocalFileFromString, saveToLocalFileFromBuffer, loadSpreadSheetRowObject } from './utils/util';
import { exportToInsertSQL } from './utils/data-exporters';
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
    const downloadInfoFilePath = path.join('resources', 'master-data', 'download-file-info.csv');
    const crawlerUrlCategoryId = {};
    const newCrawlerObjs: {
      origin_url: string;
      origin_file_ext: string;
      need_manual_edit?: boolean;
    }[] = [];
    const alreadyUrlExistCrawlers = await prismaClient.crawler.findMany({
      select: {
        origin_url: true,
      },
    });
    const alreadyExistOriginUrlSet: Set<string> = new Set(
      alreadyUrlExistCrawlers.map((alreadyUrlExistCrawler) => alreadyUrlExistCrawler.origin_url),
    );
    loadSpreadSheetRowObject(downloadInfoFilePath, async (sheetName: string, rowObj: any) => {
      if (!alreadyExistOriginUrlSet.has(rowObj.url)) {
        const targetCategoryModel = categoryModels.find((categoryModel) => categoryModel.title === rowObj.categoryTitle);
        const newCrawlerObj: {
          origin_url: string;
          origin_file_ext: string;
          need_manual_edit?: boolean;
        } = {
          origin_url: rowObj.url,
          origin_file_ext: path.extname(rowObj.url),
          need_manual_edit: Boolean(rowObj.needManualEdit),
        };
        if (targetCategoryModel) {
          crawlerUrlCategoryId[newCrawlerObj.origin_url] = targetCategoryModel?.id;
        }
        newCrawlerObjs.push(newCrawlerObj);
      }
    });
    await prismaClient.crawler.createMany({ data: newCrawlerObjs });
    const createCrawlerModels = await prismaClient.crawler.findMany({
      where: {
        origin_url: {
          in: Object.keys(crawlerUrlCategoryId),
        },
      },
      select: {
        id: true,
        origin_url: true,
      },
    });
    await prismaClient.crawlerCategory.createMany({
      data: createCrawlerModels.map((crawler) => {
        return {
          crawler_id: crawler.id,
          category_id: crawlerUrlCategoryId[crawler.origin_url],
        };
      }),
    });
  });

dataCommand
  .command('download')
  .description('')
  .action(async (options: any) => {
    const crawlerModels = await prismaClient.crawler.findMany({
      where: {
        need_manual_edit: false,
      },
      include: {
        crawler_categories: { include: { category: true } },
        crawler_keywords: { include: { keyword: true } },
      },
    });
    for (const crawlerModel of crawlerModels) {
      const extFileName = path.extname(crawlerModel.origin_url);
      const willSaveFilePath: string = path.join(...getSaveOriginFilePathParts(crawlerModel));
      const response = await axios.get(crawlerModel.origin_url, { responseType: 'arraybuffer' });
      if (extFileName === '.xlsx') {
        saveToLocalFileFromBuffer(willSaveFilePath, response.data);
      } else if (extFileName === '.csv') {
        const detectedEncoding = Encoding.detect(response.data);
        let textData: string = '';
        if (detectedEncoding === 'SJIS') {
          textData = new TextDecoder('shift-jis').decode(response.data.buffer);
        } else if (detectedEncoding === 'UTF8' || detectedEncoding === 'UTF32') {
          textData = response.data.toString();
        } else {
          textData = response.data.toString();
        }
        saveToLocalFileFromString(willSaveFilePath, textData);
      }
      await prismaClient.crawler.update({
        where: {
          id: crawlerModel.id,
        },
        data: {
          last_updated_at: new Date(),
          checksum: crypto.createHash('sha512').update(response.data.buffer.toString('hex')).digest('hex'),
        },
      });
    }
  });

dataCommand
  .command('import:origin')
  .description('')
  .action(async (options: any) => {
    const crawlerModels = await prismaClient.crawler.findMany({
      where: {
        checksum: { not: null },
        last_updated_at: { not: null },
      },
      include: {
        crawler_categories: { include: { category: true } },
        crawler_keywords: { include: { keyword: true } },
      },
    });
    for (const crawlerModel of crawlerModels) {
      const filePathes = fg.sync(getSaveOriginFilePathParts(crawlerModel).join('/'));
      for (const filePath of filePathes) {
        let workbook: WorkBook | undefined;
        if (path.extname(filePath) === '.csv') {
          const readFileData = fs.readFileSync(filePath, 'utf8');
          workbook = XLSX.read(readFileData, { type: 'string' });
        } else if (path.extname(filePath) === '.xlsx') {
          workbook = XLSX.readFile(filePath);
        }
        if (workbook) {
          const buildPlaceModels = buildPlacesDataFromWorkbook(workbook);
          const currentPlaceModels = await prismaClient.place.findMany({
            where: {
              hashcode: {
                in: _.compact(buildPlaceModels.map((placeModel) => placeModel.hashcode)),
              },
            },
            select: {
              hashcode: true,
            },
          });
          const currentHashCodeSet: Set<string> = new Set(currentPlaceModels.map((currentPlaceModel) => currentPlaceModel.hashcode));
          const newPlaceModels = buildPlaceModels.filter(
            (placeModel) => placeModel.hashcode && !currentHashCodeSet.has(placeModel.hashcode),
          );
          await Promise.all(newPlaceModels.map((newPlaceModel) => newPlaceModel.setLocationInfo()));
          await prismaClient.$transaction(
            newPlaceModels.map((newPlaceModel) => {
              return prismaClient.place.create({
                data: {
                  ...newPlaceModel,
                  place_categories: {
                    create: crawlerModel.crawler_categories.map((crawlerCategoryModel) => {
                      return {
                        source_type: 'Place',
                        extra_info: newPlaceModel.getStashExtraInfo(),
                        category_id: crawlerCategoryModel.category_id,
                      };
                    }),
                  },
                },
              });
            }),
          );
        }
      }
    }
  });

dataCommand
  .command('export:master')
  .description('')
  .action(async (options: any) => {
    const downloadInfoFilePath = path.join('resources', 'master-data', 'download-file-info.csv');
    const downloadRootInfoFilePath = path.join('resources', 'master-data', 'download-root-info.csv');
    const crawlerModels = await prismaClient.crawler.findMany({
      include: {
        crawler_categories: { include: { category: true } },
        parents: { include: { parent_crawler_root: true } },
      },
    });
    const downloadFileInfoCsvStream = fs.createWriteStream(downloadInfoFilePath);
    const downloadRootInfoCsvStream = fs.createWriteStream(downloadRootInfoFilePath);
    downloadRootInfoCsvStream.write(['url', 'categoryTitle'].join(','));
    downloadFileInfoCsvStream.write(['url', 'categoryTitle', 'title', 'needManualEdit'].join(','));
    for (const crawlerModel of crawlerModels) {
      for (const crawlerCategory of crawlerModel.crawler_categories) {
        for (const crawlerRootRelation of crawlerModel.parents) {
          downloadRootInfoCsvStream.write('\n');
          downloadRootInfoCsvStream.write([crawlerRootRelation.parent_crawler_root.url, crawlerCategory.category.title].join(','));
        }
        downloadFileInfoCsvStream.write('\n');
        downloadFileInfoCsvStream.write(
          [crawlerModel.origin_url, crawlerCategory.category.title, crawlerModel.origin_title, Number(crawlerModel.need_manual_edit)].join(
            ',',
          ),
        );
      }
    }
    downloadRootInfoCsvStream.end();
    downloadFileInfoCsvStream.end();
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
  .command('master-file')
  .description('')
  .action(async (options: any) => {
    const currentCrawlerRootModels = await prismaClient.crawlerRoot.findMany({
      select: {
        url: true,
      },
    });
    const currentRootUrlSet: Set<String> = new Set(currentCrawlerRootModels.map((currentCrawlerRootModel) => currentCrawlerRootModel.url));
    const rootUrlCategoryTitle: { [url: string]: string } = {};
    const newRootUrlObjFromCSV: { url: string }[] = [];
    const downloadRootFilePath = path.join('resources', 'master-data', 'download-root-info.csv');
    loadSpreadSheetRowObject(downloadRootFilePath, (sheetName: string, rowObj: any) => {
      if (!currentRootUrlSet.has(rowObj.url)) {
        rootUrlCategoryTitle[rowObj.url] = rowObj.categoryTitle;
        newRootUrlObjFromCSV.push({ url: rowObj.url });
        currentRootUrlSet.add(rowObj.url);
      }
    });
    await prismaClient.crawlerRoot.createMany({ data: newRootUrlObjFromCSV, skipDuplicates: true });

    const searchKeywordCategories: { keyword: string; categoryTitle: string }[] = [];
    const searchKeywordFilePath = path.join('resources', 'master-data', 'search-keyword.csv');
    loadSpreadSheetRowObject(searchKeywordFilePath, (sheetName: string, rowObj: any) => {
      searchKeywordCategories.push({ keyword: rowObj.keyword, categoryTitle: rowObj.categoryTitle });
    });
    for (const keywordCategory of searchKeywordCategories) {
      const searchUrl = new URL('https://catalog.data.metro.tokyo.lg.jp/dataset');
      let pageNumber = 1;
      while (true) {
        const newRootUrlObjs: { url: string }[] = [];
        const searchParams = new URLSearchParams({ q: keywordCategory.keyword, page: pageNumber.toString() });
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
            if (!currentRootUrlSet.has(downloadRootUrl.href)) {
              newRootUrlObjs.push({ url: downloadRootUrl.href });
              currentRootUrlSet.add(downloadRootUrl.href);
              rootUrlCategoryTitle[downloadRootUrl.href] = keywordCategory.categoryTitle;
            }
          }
        }
        await prismaClient.crawlerRoot.createMany({ data: newRootUrlObjs, skipDuplicates: true });
        pageNumber = pageNumber + 1;
        await sleep(1000);
      }
    }

    const categoryModels = await prismaClient.category.findMany();
    const titleCategory = _.keyBy(categoryModels, (categoryModel) => categoryModel.title);
    const crawlerRootModels = await prismaClient.crawlerRoot.findMany();
    for (const crawlerRootModel of crawlerRootModels) {
      const newUrlCategoryId: { [url: string]: number } = {};
      const newUrlRootId: { [url: string]: number } = {};
      const newCrawlerObjs: {
        origin_url: string;
        origin_title: string;
        origin_file_ext: string;
      }[] = [];
      const response = await axios.get(crawlerRootModel.url);
      const root = nodeHtmlParser.parse(response.data.toString());
      const resourceItemDoms = root.querySelectorAll('li.resource-item');
      for (const resourceItemDom of resourceItemDoms) {
        const titleDom = resourceItemDom.querySelector('a.heading');
        const titleAttrs = titleDom?.attrs || {};
        const downloadLinkDom = resourceItemDom.querySelector('a.resource-url-analytics');
        const downloadLinkAttrs = downloadLinkDom?.attrs || {};
        if (downloadLinkAttrs.href) {
          newCrawlerObjs.push({
            origin_title: titleAttrs.title,
            origin_url: downloadLinkAttrs.href,
            origin_file_ext: path.extname(downloadLinkAttrs.href),
          });
          newUrlCategoryId[downloadLinkAttrs.href] = titleCategory[rootUrlCategoryTitle[crawlerRootModel.url]].id;
          newUrlRootId[downloadLinkAttrs.href] = crawlerRootModel.id;
        }
      }
      await prismaClient.crawler.createMany({ data: newCrawlerObjs, skipDuplicates: true });
      const createCrawlers = await prismaClient.crawler.findMany({
        where: {
          origin_url: {
            in: newCrawlerObjs.map((crawler) => crawler.origin_url),
          },
        },
        select: {
          id: true,
          origin_url: true,
        },
      });
      await prismaClient.crawlerCategory.createMany({
        data: createCrawlers.map((crawler) => {
          return {
            crawler_id: crawler.id,
            category_id: newUrlCategoryId[crawler.origin_url],
          };
        }),
        skipDuplicates: true,
      });
      await prismaClient.crawlerRootRelation.createMany({
        data: createCrawlers.map((crawler) => {
          return {
            to_url: crawler.origin_url,
            to_crawler_type: 'Crawler',
            from_crawler_root_id: newUrlRootId[crawler.origin_url],
          };
        }),
        skipDuplicates: true,
      });
      await sleep(1000);
    }
  });

program.addCommand(crawlCommand);

function getSaveOriginFilePathParts(crawlerModel: {
  origin_url: string;
  crawler_keywords: { keyword: { appear_count: number; word: string } }[];
  crawler_categories: { category: { title: string } }[];
}): string[] {
  const downloadUrl = new URL(crawlerModel.origin_url);
  const crawlerKeywordModel = _.maxBy(crawlerModel.crawler_keywords, (cKeyword) => {
    return cKeyword.keyword.appear_count;
  });
  const dirTitle = crawlerKeywordModel?.keyword?.word || crawlerModel.crawler_categories[0]?.category?.title || 'unknown';
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
