import importActivityReports from './importActivityReports';

const args = process.argv.slice(2);

const defaultFiles = Array.from({ length: 12 }, (_, i) => `./data/R${i + 1}ActivityReports.csv`);
const files = args.length ? args : defaultFiles;

files.forEach((f) => {
  importActivityReports(f);
});
