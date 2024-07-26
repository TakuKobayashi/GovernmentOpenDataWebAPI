import { program, Command } from 'commander';
import packageJson from '../package.json';
import { config } from 'dotenv';
config();

program.storeOptionsAsProperties(false);

program.version(packageJson.version, '-v, --version');

const dataCommand = new Command('data');

dataCommand
  .command('download')
  .description('')
  .action(async (options: any) => {
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
