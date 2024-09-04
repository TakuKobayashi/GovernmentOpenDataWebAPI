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
import { buildPlacesDataFromWorkbook } from './models/place';
import { prismaClient } from './utils/prisma-common';
import { saveToLocalFileFromString, saveToLocalFileFromBuffer, loadSpreadSheetRowObject } from './utils/util';
import { exportToInsertSQL } from './utils/data-exporters';
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
      category_id?: number;
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
          category_id?: number;
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
    });
    for (const crawlerModel of crawlerModels) {
      const downloadUrl = new URL(crawlerModel.origin_url);
      const response = await axios.get(downloadUrl.href, { responseType: 'arraybuffer' });
      const extFileName = path.extname(downloadUrl.pathname);
      const willSaveFilePath: string = path.join('resources', 'origin-data', downloadUrl.hostname, ...downloadUrl.pathname.split('/'));
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
      include: {
        crawler_categories: true,
      },
    });
    for (const crawlerModel of crawlerModels) {
      const downloadUrl = new URL(crawlerModel.origin_url);
      const filePathes = fg.sync(['resources', 'origin-data', downloadUrl.hostname, downloadUrl.pathname].join('/'));
      for (const filePath of filePathes) {
        let workbook: WorkBook | undefined;
        if (path.extname(filePath) === '.csv') {
          const readFileData = fs.readFileSync(filePath, 'utf8');
          workbook = XLSX.read(readFileData, { type: 'string' });
        } else if (path.extname(filePath) === '.xlsx') {
          workbook = XLSX.readFile(filePath);
        }
        if (workbook) {
          const newPlaceModels = await buildPlacesDataFromWorkbook(workbook);
          await prismaClient.$transaction(
            newPlaceModels.map((newPlaceModel) => {
              return prismaClient.place.create({
                data: {
                  ...newPlaceModel,
                  place_categories: {
                    create: crawlerModel.crawler_categories.map((crawlerCategoryModel) => {
                      return {
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
    const crawlerModels = await prismaClient.crawler.findMany({
      include: { crawler_categories: { include: { category: true } } },
    });
    const downloadFileInfoCsvAppendStream = fs.createWriteStream(downloadInfoFilePath, { flags: 'a' });
    const csvHeaders = ['url', 'categoryTitle', 'needManualEdit'];
    downloadFileInfoCsvAppendStream.write(csvHeaders.join(','));
    for (const crawlerModel of crawlerModels) {
      for (const crawlerCategory of crawlerModel.crawler_categories) {
        downloadFileInfoCsvAppendStream.write('\n');
        downloadFileInfoCsvAppendStream.write(
          [crawlerModel.origin_url, crawlerCategory.category.title, Number(crawlerModel.need_manual_edit)].join(','),
        );
      }
    }
    downloadFileInfoCsvAppendStream.end();
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
