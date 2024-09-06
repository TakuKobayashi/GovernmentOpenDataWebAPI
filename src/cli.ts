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
    const downloadMuniJSFileBinaryResponse = await axios.get('https://maps.gsi.go.jp/js/muni.js', { responseType: 'arraybuffer' });
    const textData = downloadMuniJSFileBinaryResponse.data.toString();
    const muniJSFilePath = path.join('resources', 'libraries', 'muni.js');
    saveToLocalFileFromString(muniJSFilePath, textData);
    const matches = textData.match(/'(.*?)'/g) || [];
    const csvLines = matches.map((matched) => matched.substr(1, matched.length - 2));
    const newGsiMuniObjs: { prefecture_number: number; prefecture_name: string; municd: number; municipality: string }[] = [];
    for (const csvLine of csvLines) {
      const cells = csvLine.split(',');
      newGsiMuniObjs.push({
        prefecture_number: Number(cells[0]),
        prefecture_name: cells[1],
        municd: Number(cells[2]),
        municipality: cells[3].toString().trim().normalize('NFKC'),
      });
    }
    await prismaClient.gsimuni.createMany({ data: newGsiMuniObjs, skipDuplicates: true });
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
    const newCrawlerObjs: {
      origin_url: string;
      need_manual_edit?: boolean;
      crawler_categories?: {
        create: { category_id: number }[];
      };
    }[] = [];
    const alreadyUrlExistCrawlers = await prismaClient.crawler.findMany({
      select: {
        origin_url: true,
      },
    });
    loadSpreadSheetRowObject(downloadInfoFilePath, async (sheetName: string, rowObj: any) => {
      if (alreadyUrlExistCrawlers.every((alreadyUrlExistCrawler) => alreadyUrlExistCrawler.origin_url !== rowObj.url)) {
        const targetCategoryModel = categoryModels.find((categoryModel) => categoryModel.title === rowObj.categoryTitle);
        const newCrawlerObj: {
          origin_url: string;
          need_manual_edit?: boolean;
          crawler_categories?: {
            create: { category_id: number }[];
          };
        } = {
          origin_url: rowObj.url,
          need_manual_edit: Boolean(rowObj.needManualEdit),
        };
        if (targetCategoryModel) {
          newCrawlerObj.crawler_categories = {
            create: [{ category_id: targetCategoryModel?.id }],
          };
        }
        newCrawlerObjs.push(newCrawlerObj);
      }
    });
    await prismaClient.$transaction(
      newCrawlerObjs.map((newCrawlerObj) => {
        return prismaClient.crawler.create({
          data: newCrawlerObj,
        });
      }),
    );
  });

dataCommand
  .command('download')
  .description('')
  .action(async (options: any) => {
    const crawlerModels = await prismaClient.crawler.findMany({
      where: {
        need_manual_edit: false,
      },
      include: { crawler_categories: { include: { category: true } } },
    });
    for (const crawlerModel of crawlerModels) {
      const downloadUrl = new URL(crawlerModel.origin_url);
      const response = await axios.get(downloadUrl.href, { responseType: 'arraybuffer' });
      const extFileName = path.extname(downloadUrl.pathname);
      const categoryTitle = crawlerModel.crawler_categories[0]?.category?.title || 'unknown';
      const willSaveFilePath: string = path.join(
        'resources',
        'origin-data',
        categoryTitle,
        downloadUrl.hostname,
        ...downloadUrl.pathname.split('/'),
      );
      if (extFileName === '.xlsx') {
        saveToLocalFileFromBuffer(willSaveFilePath, response.data);
      } else {
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
      include: { crawler_categories: { include: { category: true } } },
    });
    for (const crawlerModel of crawlerModels) {
      const downloadUrl = new URL(crawlerModel.origin_url);
      const categoryTitle = crawlerModel.crawler_categories[0]?.category?.title || 'unknown';
      const filePathes = fg.sync(['resources', 'origin-data', categoryTitle, downloadUrl.hostname, downloadUrl.pathname].join('/'));
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
                in: buildPlaceModels.map((placeModel) => placeModel.hashcode),
              },
            },
            select: {
              hashcode: true,
            },
          });
          const newPlaceModels = buildPlaceModels.filter((placeModel) =>
            currentPlaceModels.every((currentPlaceModel) => placeModel.hashcode !== currentPlaceModel.hashcode),
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
        parents: { include: { crawler_root: true } },
      },
    });
    const downloadFileInfoCsvStream = fs.createWriteStream(downloadInfoFilePath);
    const downloadRootInfoCsvStream = fs.createWriteStream(downloadRootInfoFilePath);
    downloadRootInfoCsvStream.write(['url', 'categoryTitle'].join(','));
    downloadFileInfoCsvStream.write(['url', 'categoryTitle', 'title', 'needManualEdit'].join(','));
    for (const crawlerModel of crawlerModels) {
      for (const crawlerCategory of crawlerModel.crawler_categories) {
        for (const crawlerParentAndChild of crawlerModel.parents) {
          downloadRootInfoCsvStream.write('\n');
          downloadRootInfoCsvStream.write([crawlerParentAndChild.crawler_root.url, crawlerCategory.category.title].join(','));
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
        place_categories: true,
      },
    });
    for (const categoryModel of categories) {
      const placeModels = await prismaClient.place.findMany({
        where: {
          id: {
            in: categoryModel.place_categories.map((placeCategoryModel) => placeCategoryModel.place_id),
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
    const currentCrawlerRootModels = await prismaClient.crawler_root.findMany({
      select: {
        url: true,
      },
    });
    const currentUrlSet: Set<String> = new Set(currentCrawlerRootModels.map((currentCrawlerRootModel) => currentCrawlerRootModel.url));
    const rootUrlCategoryTitle: { [url: string]: string } = {};
    const newRootUrlObjFromCSV: { url: string; search_word?: string }[] = [];
    const downloadRootFilePath = path.join('resources', 'master-data', 'download-root-info.csv');
    loadSpreadSheetRowObject(downloadRootFilePath, (sheetName: string, rowObj: any) => {
      if (!currentUrlSet.has(rowObj.url)) {
        rootUrlCategoryTitle[rowObj.url] = rowObj.categoryTitle;
        newRootUrlObjFromCSV.push({
          url: rowObj.url,
        });
      }
    });
    await prismaClient.crawler_root.createMany({ data: newRootUrlObjFromCSV, skipDuplicates: true });

    const searchKeywordCategories: { keyword: string; categoryTitle: string }[] = [];
    const searchKeywordFilePath = path.join('resources', 'master-data', 'search-keyword.csv');
    loadSpreadSheetRowObject(searchKeywordFilePath, (sheetName: string, rowObj: any) => {
      searchKeywordCategories.push({ keyword: rowObj.keyword, categoryTitle: rowObj.categoryTitle });
    });
    for (const keywordCategory of searchKeywordCategories) {
      const searchUrl = new URL('https://catalog.data.metro.tokyo.lg.jp/dataset');
      let pageNumber = 1;
      while (true) {
        const newRootUrlObj: { url: string; search_word?: string }[] = [];
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
            if (!currentUrlSet.has(downloadRootUrl.href)) {
              newRootUrlObj.push({
                url: downloadRootUrl.href,
                search_word: keywordCategory.keyword,
              });
              rootUrlCategoryTitle[downloadRootUrl.href] = keywordCategory.categoryTitle;
            }
          }
        }
        await prismaClient.crawler_root.createMany({ data: newRootUrlObj, skipDuplicates: true });
        pageNumber = pageNumber + 1;
        await sleep(1000);
      }
    }
    const categoryModels = await prismaClient.category.findMany();
    const titleCategory = _.keyBy(categoryModels, (categoryModel) => categoryModel.title);
    const crawlerRootModels = await prismaClient.crawler_root.findMany();
    for (const crawlerRootModel of crawlerRootModels) {
      const response = await axios.get(crawlerRootModel.url);
      const root = nodeHtmlParser.parse(response.data.toString());
      const resourceItemDoms = root.querySelectorAll('li.resource-item');
      for (const resourceItemDom of resourceItemDoms) {
        const titleDom = resourceItemDom.querySelector('a.heading');
        const titleAttrs = titleDom?.attrs || {};
        const downloadLinkDom = resourceItemDom.querySelector('a.resource-url-analytics');
        const downloadLinkAttrs = downloadLinkDom?.attrs || {};
        if (downloadLinkAttrs.href) {
          await prismaClient.crawler.upsert({
            where: {
              origin_url: downloadLinkAttrs.href,
            },
            update: {},
            create: {
              origin_title: titleAttrs.title,
              origin_url: downloadLinkAttrs.href,
              crawler_categories: {
                create: [
                  {
                    category_id: titleCategory[rootUrlCategoryTitle[crawlerRootModel.url]].id,
                  },
                ],
              },
              parents: {
                create: [
                  {
                    crawler_root_id: crawlerRootModel.id,
                  },
                ],
              },
            },
          });
        }
      }
      await sleep(1000);
    }
  });

program.addCommand(crawlCommand);

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

async function scrapeOpendataFileUrls(downloadRootUrls: URL[]): Promise<URL[]> {
  const downloadFileUrls: URL[] = [];
  for (const url of downloadRootUrls) {
    const response = await axios.get(url.toString());
    const root = nodeHtmlParser.parse(response.data.toString());
    const downloadLinkDoms = root.querySelectorAll('a.resource-url-analytics');
    for (const downloadLinkDom of downloadLinkDoms) {
      const downloadLinkAttrs = downloadLinkDom.attrs || {};
      downloadFileUrls.push(new URL(downloadLinkAttrs.href));
    }
    await sleep(1000);
  }
  return downloadFileUrls;
}

program.parse(process.argv);
