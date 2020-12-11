import { option } from 'yargs';
import importGoals from './importPlanGoals';

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
})
  .help()
  .alias('help', 'h');

const defaultInputFile = './GranteeTTAPlan.csv';

let file;
if (argv.file) {
  file = argv.file;
} else {
  file = defaultInputFile;
}

importGoals(file);
