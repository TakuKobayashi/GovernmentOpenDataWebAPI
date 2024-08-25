import { program, Command } from 'commander';
import packageJson from '../package.json';
import XLSX, { WorkBook } from 'xlsx';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import fg from 'fast-glob';
import Encoding from 'encoding-japanese';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

program.storeOptionsAsProperties(false);

program.version(packageJson.version, '-v, --version');

const API_VERSION_NAME = 'v1';

const dataCommand = new Command('data');

dataCommand
  .command('download')
  .description('')
  .action(async (options: any) => {
    const readFileData = fs.readFileSync(path.join('resources', 'master-data', 'download-file-info.csv'), 'utf8');
    const workbook = XLSX.read(readFileData, { type: 'string' });
    const sheetNames = Object.keys(workbook.Sheets);
    const themeRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
    const downloadUrls = themeRows.map((themeRow: any) => {
      return new URL(themeRow.url);
    });
    for (const downloadUrl of downloadUrls) {
      const response = await axios.get(downloadUrl.href, { responseType: 'arraybuffer' });
      const extFileName = path.extname(downloadUrl.pathname);
      const willSaveFilePath: string = path.join('resources', 'origin-data', downloadUrl.hostname, ...downloadUrl.pathname.split('/'));
      if (!fs.existsSync(path.dirname(willSaveFilePath))) {
        fs.mkdirSync(path.dirname(willSaveFilePath), { recursive: true });
      }
      if (extFileName === '.xlsx') {
        fs.writeFileSync(willSaveFilePath, response.data);
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
        fs.writeFileSync(willSaveFilePath, textData);
      }
    }
  });

dataCommand
  .command('import')
  .description('')
  .action(async (options: any) => {
    const prisma = new PrismaClient();
    const categories = await prisma.category.findMany();
    for (const categoryModel of categories) {
      const csvFilePathes = fg.sync(['resources', 'origin-data', '**', '*.csv'].join('/'));
      for (const csvFilePath of csvFilePathes) {
        const readFileData = fs.readFileSync(csvFilePath, 'utf8');
        const workbook = XLSX.read(readFileData, { type: 'string' });
        const convertedApiFormatDataObjs = importPlaceDataFromWorkbook(workbook, categoryModel.id);
        await prisma.place.createMany({ data: convertedApiFormatDataObjs });
      }
      const xlsxFilePathes = fg.sync(['resources', 'origin-data', '**', '*.xlsx'].join('/'));
      for (const xlsxFilePath of xlsxFilePathes) {
        const workbook = XLSX.readFile(xlsxFilePath);
        const convertedApiFormatDataObjs = importPlaceDataFromWorkbook(workbook, categoryModel.id);
        await prisma.place.createMany({ data: convertedApiFormatDataObjs });
      }
    }
    console.log('data:import');
  });

function importPlaceDataFromWorkbook(workbook: WorkBook, categoryId: number): any[] {
  const convertedApiFormatDataObjs: any[] = [];
  const sheetNames = Object.keys(workbook.Sheets);
  for (const sheetName of sheetNames) {
    const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    for (const rowObj of themeRows) {
      const newPlaceModel = {
        name: rowObj['施設名'] || rowObj['名称'],
        address: (rowObj['所在地'] || rowObj['住所'] || rowObj['所在地_連結表記']).normalize('NFKC'),
        lat: Number(rowObj['緯度'] || rowObj['X座標']),
        lon: Number(rowObj['経度'] || rowObj['Y座標']),
        category_id: categoryId,
        extra_info: {
          males_count: Number(rowObj['男性トイレ数'] || rowObj['男性トイレ_総数'] || rowObj['男性トイレ総数'] || 0),
          females_count: Number(rowObj['女性トイレ数'] || rowObj['女性トイレ_総数'] || rowObj['女性トイレ総数'] || 0),
          multipurposes_count: Number(rowObj['バリアフリートイレ数'] || rowObj['多機能トイレ_数'] || rowObj['多機能トイレ数'] || 0),
        },
      };
      if (newPlaceModel.name && newPlaceModel.lat && newPlaceModel.lon) {
        convertedApiFormatDataObjs.push(newPlaceModel);
      }
    }
  }
  return convertedApiFormatDataObjs;
}

dataCommand
  .command('export')
  .description('')
  .action(async (options: any) => {
    const convertedApiFormatDataObjs: any[] = [];
    const csvFilePathes = fg.sync(path.join('resources', 'origin-data', '**', '*.csv'));
    for (const csvFilePath of csvFilePathes) {
      const readFileData = fs.readFileSync(csvFilePath, 'utf8');
      const workbook = XLSX.read(readFileData, { type: 'string' });
      const sheetNames = Object.keys(workbook.Sheets);
      const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
      for (const rowObj of themeRows) {
        const apiFormat = {
          name: rowObj['施設名'],
          lat: rowObj['緯度'],
          lon: rowObj['経度'],
          males_count: rowObj['男性トイレ数'] || 0,
          females_count: rowObj['女性トイレ数'] || 0,
          multipurposes_count: rowObj['バリアフリートイレ数'] || 0,
        };
        convertedApiFormatDataObjs.push(apiFormat);
      }
    }
    const willSaveFilePath: string = path.join('build', 'api', API_VERSION_NAME, 'category', 'toilet', 'list.json');
    if (!fs.existsSync(path.dirname(willSaveFilePath))) {
      fs.mkdirSync(path.dirname(willSaveFilePath), { recursive: true });
    }
    fs.writeFileSync(willSaveFilePath, JSON.stringify({ category: 'toilet', data: convertedApiFormatDataObjs }));
  });

program.addCommand(dataCommand);

program
  .command('build')
  .description('')
  .action(async (options: any) => {
    const prisma = new PrismaClient();
    const categories = await prisma.category.findMany();
    for (const categoryModel of categories) {
      const placeModels = await prisma.place.findMany({
        where: { category_id: categoryModel.id },
      });
      const convertedApiFormatDataObjs = placeModels.map((placeModel) => {
        return {
          name: placeModel.name,
          lat: placeModel.lat,
          lon: placeModel.lon,
          ...(placeModel.extra_info as object),
        };
      });
      const willSaveFilePath: string = path.join('build', 'api', API_VERSION_NAME, 'category', categoryModel.title, 'list.json');
      if (!fs.existsSync(path.dirname(willSaveFilePath))) {
        fs.mkdirSync(path.dirname(willSaveFilePath), { recursive: true });
      }
      fs.writeFileSync(willSaveFilePath, JSON.stringify({ category: categoryModel.title, data: convertedApiFormatDataObjs }));
    }
  });

program
  .command('seeder')
  .description('')
  .action(async (options: any) => {
    const prisma = new PrismaClient();
    await prisma.category.create({
      data: {
        title: 'toilet',
      },
    });
  });

program
  .command('deploy')
  .description('')
  .action(async (options: any) => {});

program.parse(process.argv);
