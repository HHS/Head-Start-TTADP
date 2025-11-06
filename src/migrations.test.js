const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const IGNORED_FILES = new Set([
  'src/migrations/20251201000000-add-activity-report-reason-gin-index.js',
]);

function getRenameCommand(file, date) {
  const dateTimePrefix = new Date()
    .toISOString()
    .replace(/[-:.]/g, '')
    .replace('T', '')
    .slice(0, 14);
  const renamedFileName = file.replace(date, dateTimePrefix);

  const windowsRenameCommand = `ren "${file}" "${renamedFileName}"`;
  const linuxRenameCommand = `git mv "${file}" "${renamedFileName}"`;

  return `\nWindows: ${windowsRenameCommand}\nLinux: ${linuxRenameCommand}`;
}

function checkFirstPart(target, values) {
  return values.some((value) => value === target.slice(0, value.length));
}

function getLatestFileDates(files, filePaths) {
  const filteredFiles = files.filter((file) => checkFirstPart(file, filePaths));

  const fileDates = filteredFiles.map((file) => {
    const fileName = path.basename(file);
    const datePrefix = fileName.match(/^\d+/);
    return datePrefix ? parseInt(datePrefix[0], 10) : null;
  });

  return fileDates;
}
async function listTree(branchName, filePath = '') {
  const git = simpleGit();

  try {
    const result = await git.raw(['ls-tree', branchName, filePath]);
    const entries = result.split('\n').filter(Boolean);

    const tree = await Promise.all(entries.map(async (entry) => {
      const [info, file] = entry.split('\t');
      const [, type, hash] = info.split(' ');

      if (type === 'tree') {
        return {
          name: file,
          type: 'directory',
          children: await listTree(branchName, `${filePath}${file}/`),
        };
      }

      return {
        name: file,
        type: 'file',
      };
    }));

    return tree;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error listing tree:', error.message);
    throw error;
  }
}

async function getCurrentBranch() {
  const git = simpleGit();

  try {
    const branchSummary = await git.branch();
    const currentBranch = branchSummary.current;
    return currentBranch;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting current branch:', error);
    throw error;
  }
}

async function checkFileDatePrefix() {
  const results = [];
  const paths = [
    'src/migrations/',
    'src/seeders/',
  ];
  const mainFiles = (await Promise.all(paths.map(async (p) => listTree('origin/main', p))))
    .flat()
    .map(({ name }) => name);
  const prFiles = (await Promise.all(paths.map(async (p) => listTree(await getCurrentBranch(), p))))
    .flat()
    .map(({ name }) => name);

  const filteredMainFiles = mainFiles.filter((file) => !IGNORED_FILES.has(file));
  const filteredPrFiles = prFiles.filter((file) => !IGNORED_FILES.has(file));

  const mainFileDates = getLatestFileDates(filteredMainFiles, paths);
  const prFileDates = getLatestFileDates(filteredPrFiles, paths);

  const tooManyDigits = prFileDates.filter((value) => value > 99999999999999);
  if (tooManyDigits && tooManyDigits.length) {
    results.push(`Some files are named incorrectly, the number prefix should only have 14 digits.
    The format should be YYYYMMDDHHmmss.`);
  } else {
    const cleanedMainFileDates = mainFileDates.map((mdf) => (mdf > 99999999999999
      ? Math.floor(mdf / (10 ** Math.floor(Math.log10(mdf)) - 99999999999999 + 1))
      : mdf));
    const latestMainFileDate = Math.max(...cleanedMainFileDates);
    const prFilesWithOlderDates = [];

    prFileDates.forEach((date, index) => {
      const fileName = filteredPrFiles[index];
      if (!filteredMainFiles.includes(fileName)
        && date <= latestMainFileDate) {
        prFilesWithOlderDates.push({ file: fileName, date });
      }
    });

    if (prFilesWithOlderDates.length === 0) {
      results.push('All files on the branch have a newer date than the latest file on the main branch');
    } else {
      results.push('Some files on the branch have dates older than or equal to the latest file on the main branch:');
      prFilesWithOlderDates.forEach(({ file, date }) => {
        const renameCommand = getRenameCommand(file, date);
        results.push(`- File ${file} needs to be renamed. Consider using the following command: ${renameCommand}`);
      });
    }
  }
  return results;
}

describe('Check File Date Prefix', () => {
  it('should pass when all files on the branch have a newer date than the latest file on main branch', async () => {
    const results = await checkFileDatePrefix();
    expect(results).toStrictEqual(['All files on the branch have a newer date than the latest file on the main branch']);
  });
});

/* eslint-disable max-len */
/* Example of error message:
    Some files on the branch have dates older than or equal to the latest file on the main branch:
    - File src/migrations/19700101000000-epoch-test.js needs to be renamed. Consider using the following command:
    Windows: ren "src/migrations/19700101000000-epoch-test.js" "src/migrations/20230629194640-epoch-test.js"
    Linux: git mv "src/migrations/19700101000000-epoch-test.js" "src/migrations/20230629194640-epoch-test.js"
*/
