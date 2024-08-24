import { program, Command } from 'commander';
import packageJson from '../package.json';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import fg from 'fast-glob';
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
      const textData = new TextDecoder('shift-jis').decode(response.data.buffer);
      const willSaveFilePath: string = path.join('resources', 'origin-data', downloadUrl.hostname, ...downloadUrl.pathname.split('/'));
      if (!fs.existsSync(path.dirname(willSaveFilePath))) {
        fs.mkdirSync(path.dirname(willSaveFilePath), { recursive: true });
      }
      fs.writeFileSync(willSaveFilePath, textData);
    }
  });

dataCommand
  .command('import')
  .description('')
  .action(async (options: any) => {
    console.log('data:import');
  });

dataCommand
  .command('export')
  .description('')
  .action(async (options: any) => {
    const convertedApiFormatObjs: any[] = [];
    const csvFilePathes = fg.sync(path.join('resources', 'origin-data', '**', '*.csv'));
    for (const csvFilePath of csvFilePathes) {
      const readFileData = fs.readFileSync(csvFilePath, 'utf8');
      const workbook = XLSX.read(readFileData, { type: 'string' });
      const sheetNames = Object.keys(workbook.Sheets);
      const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
      for(const rowObj of themeRows) {
        const apiFormat = {
          category: 'toilet',
          name: rowObj['施設名'],
          lat: rowObj['緯度'],
          lon: rowObj['経度'],
        }
        convertedApiFormatObjs.push(apiFormat)
      }
    }
    const willSaveFilePath: string = path.join('build', 'api', API_VERSION_NAME, 'category', 'toilet', 'list.json');
    if (!fs.existsSync(path.dirname(willSaveFilePath))) {
      fs.mkdirSync(path.dirname(willSaveFilePath), { recursive: true });
    }
    fs.writeFileSync(willSaveFilePath, JSON.stringify(convertedApiFormatObjs));
  });

program.addCommand(dataCommand);

program
  .command('build')
  .description('')
  .action(async (options: any) => {});

program
  .command('deploy')
  .description('')
  .action(async (options: any) => {});

program.parse(process.argv);
