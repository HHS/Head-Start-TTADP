import { statSync } from 'fs';
import importActivityReports from './importActivityReports';

const args = process.argv.slice(2);

if (!args.length) {
  console.error('You must specify csv files to import');
} else {
  const files = args.filter((a) => a.endsWith('.csv'));

  files.forEach((f) => {
    const fStats = statSync(f);
    if (fStats.isFile()) {
      importActivityReports(f);
    }
  });
}
