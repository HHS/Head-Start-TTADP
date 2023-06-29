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

async function isFileModified(filePath) {
  const git = simpleGit();
  const result = {};
  // Get the diff status for the file
  result.summary = await git.diffSummary(['--', filePath]);
  result.isModified = result.summary.files.length > 0;
  if (result.isModified) {
    result.diffs = {};
    await Promise.all(result.summary.files.map(async ({ file, changes }) => {
      if (changes > 0) {
        const diff = await git.diff(['--', filePath]);
        result.diffs[file] = diff;
      }
    }));
  }

  // Check if the file has been modified
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
