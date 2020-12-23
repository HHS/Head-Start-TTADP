import { option } from 'yargs';
import importGoals from './importPlanGoals';

const { argv } = option('file', {
  alias: 'f',
  description: 'Input .csv file',
  type: 'string',
}).option('region', {
  alias: 'r',
  description: 'grant\'s region',
  type: 'number',
})
  .help()
  .alias('help', 'h');

const defaultInputFile = './GranteeTTAPlan.csv';
const defaultRegion = 14;

let file;
let region;
if (argv.file) {
  file = argv.file;
} else {
  file = defaultInputFile;
}

if (argv.region) {
  region = argv.region;
} else {
  region = defaultRegion;
}

importGoals(file, region);
