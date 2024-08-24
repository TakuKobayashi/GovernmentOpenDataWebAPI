import { program, Command } from 'commander';
import packageJson from '../package.json';
import XLSX from 'xlsx';
import path from 'path'
import { config } from 'dotenv';
config();

program.storeOptionsAsProperties(false);

program.version(packageJson.version, '-v, --version');

const dataCommand = new Command('data');

dataCommand
  .command('download')
  .description('')
  .action(async (options: any) => {
    const workbook = XLSX.readFile(path.join('resources', 'master-data', 'download-file-info.csv'));
    const sheetNames = Object.keys(workbook.Sheets);
    const themeRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
    const downloadUrls = themeRows.map((themeRow: any) => {
      return themeRow.url
    })
    console.log(downloadUrls);
    console.log('data:download');
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
    console.log('data:import');
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
