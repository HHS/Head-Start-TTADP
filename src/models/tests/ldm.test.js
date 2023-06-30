import fs from 'fs';
import simpleGit from 'simple-git';

function countOccurrencesInFile(fileContent, searchString) {
  const fileLines = fileContent.split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < fileLines.length; i++) { // eslint-disable-line no-plusplus
    if (fileLines[i].includes(searchString) && i < fileLines.length - 1) {
      matches.push(fileLines[i + 1]);
    }
  }

  return {
    count: matches ? matches.length : 0,
    matches,
  };
}

/**
 * Checks if a file has been modified in a git repository.
 *
 * @param {string} filePath - The path of the file to check.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the summary,
 * isFileModified flag, and diffs (if applicable).
 */
async function isFileModified(filePath) {
  // Initialize simpleGit instance
  const git = simpleGit();

  // Create an empty result object
  const result = {};

  // Get the diff summary for the specified file path
  result.summary = await git.diffSummary(['--', filePath]);

  // Check if the file has been modified
  result.isFileModified = result.summary.files.length > 0;

  // If the file has been modified, get the detailed diffs
  if (result.isFileModified) {
    // Create an empty diffs object
    result.diffs = {};

    // Fetch the diffs for each modified file
    await Promise.all(result.summary.files.map(async ({ file, changes }) => {
      // Only fetch diffs if there are changes in the file
      if (changes > 0) {
        // Get the diff for the specified file path
        result.diffs[file] = await git.diff(['--', filePath]);
      }
    }));
  }

  // Return the result object
  return result;
}

describe('Logical Data Model', () => {
  let fileContent = '';
  beforeAll(async () => {
    fileContent = fs.readFileSync('docs/logical_data_model.puml', 'utf-8');
  });
  describe('file', () => {
    it('changed from checkout', async () => {
      const result = await isFileModified('docs/logical_data_model.puml');
      expect(result?.diffs?.['docs/logical_data_model.puml']).toStrictEqual(undefined);
    });
  });

  describe('model', () => {
    it('model missing for table', () => {
      expect(countOccurrencesInFile(fileContent, 'model missing for table'))
        .toStrictEqual({ count: 0, matches: [] });
    });
  });
  describe('columns', () => {
    it('column missing from model', () => {
      expect(countOccurrencesInFile(fileContent, 'column missing from model'))
        .toStrictEqual({ count: 0, matches: [] });
    });
    it('column type does not match model', () => {
      expect(countOccurrencesInFile(fileContent, 'column type does not match model'))
        .toStrictEqual({ count: 0, matches: [] });
    });
    it('column allow null match model', () => {
      expect(countOccurrencesInFile(fileContent, 'column should not allow null'))
        .toStrictEqual({ count: 0, matches: [] });
      expect(countOccurrencesInFile(fileContent, 'column should allow null'))
        .toStrictEqual({ count: 0, matches: [] });
    });
  });
  describe('associations', () => {
    it('associations need to be defined both directions', () => {
      expect(countOccurrencesInFile(fileContent, 'associations need to be defined both directions'))
        .toStrictEqual({ count: 0, matches: [] });
    });
    it('associations need to be distinct', () => {
      expect(countOccurrencesInFile(fileContent, 'associations need to be distinct'))
        .toStrictEqual({ count: 0, matches: [] });
    });
    it('associations need to be camel case', () => {
      expect(countOccurrencesInFile(fileContent, 'associations need to be camel case'))
        .toStrictEqual({ count: 0, matches: [] });
    });
    it('association missing from models', () => {
      expect(countOccurrencesInFile(fileContent, 'association missing from models'))
        .toStrictEqual({ count: 0, matches: [] });
    });
  });
});
