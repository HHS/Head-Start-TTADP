/* eslint-disable no-console */
// tests/merge-coverage.test.js

const fs = require('fs');
const pathModule = require('path'); // Avoid naming conflict with 'path' variable
const os = require('os');
const istanbulCoverage = require('istanbul-lib-coverage');
const {
  findCoverageFiles,
  mergeCoverageFiles,
  writeMergedCoverage,
  main,
  DEFAULT_COVERAGE_DIR,
} = require('./merge-coverage');

describe('merge-coverage script', () => {
  let tmpDir;

  beforeEach(() => {
    // Create a temporary directory for each test
    tmpDir = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'merge-coverage-test-'));
  });

  afterEach(() => {
    // Clean up the temporary directory after each test
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('findCoverageFiles', () => {
    it('should return an empty array when the directory is empty', () => {
      const coverageFiles = findCoverageFiles(tmpDir);
      expect(coverageFiles).toEqual([]);
    });

    it('should return an empty array when there are no coverage-final.json files', () => {
      const subdir = pathModule.join(tmpDir, 'subdir');
      fs.mkdirSync(subdir, { recursive: true });
      fs.writeFileSync(pathModule.join(tmpDir, 'file1.txt'), 'some content');
      fs.writeFileSync(pathModule.join(subdir, 'file2.txt'), 'other content');

      const coverageFiles = findCoverageFiles(tmpDir);
      expect(coverageFiles).toEqual([]);
    });

    it('should return an array with coverage-final.json files', () => {
      const subdir = pathModule.join(tmpDir, 'subdir');
      const anotherDir = pathModule.join(tmpDir, 'anotherDir');
      fs.mkdirSync(subdir, { recursive: true });
      fs.mkdirSync(anotherDir, { recursive: true });

      fs.writeFileSync(pathModule.join(tmpDir, 'coverage-final.json'), '{}');
      fs.writeFileSync(pathModule.join(subdir, 'coverage-final.json'), '{}');
      fs.writeFileSync(pathModule.join(anotherDir, 'not-coverage.json'), '{}');

      const coverageFiles = findCoverageFiles(tmpDir);
      expect(coverageFiles).toEqual([
        pathModule.join(tmpDir, 'coverage-final.json'),
        pathModule.join(subdir, 'coverage-final.json'),
      ]);
    });
  });

  describe('mergeCoverageFiles', () => {
    it('should throw an error when coverageFiles is empty', () => {
      expect(() => mergeCoverageFiles([])).toThrow(
        'No coverage-final.json files found to merge.',
      );
    });

    it('should merge coverage files correctly', () => {
      const coverageData1 = {
        'file1.js': {
          path: 'file1.js',
          statementMap: {
            0: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };
      const coverageData2 = {
        'file2.js': {
          path: 'file2.js',
          statementMap: {
            0: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const coverageFile1 = pathModule.join(tmpDir, 'coverage1.json');
      const coverageFile2 = pathModule.join(tmpDir, 'coverage2.json');

      fs.writeFileSync(coverageFile1, JSON.stringify(coverageData1));
      fs.writeFileSync(coverageFile2, JSON.stringify(coverageData2));

      const coverageFiles = [coverageFile1, coverageFile2];

      const mergedCoverage = mergeCoverageFiles(coverageFiles);

      expect(mergedCoverage['file1.js']).toBeDefined();
      expect(mergedCoverage['file2.js']).toBeDefined();
    });

    it('should throw an error when coverage files contain invalid JSON', () => {
      const coverageFile = pathModule.join(tmpDir, 'coverage-invalid.json');
      fs.writeFileSync(coverageFile, 'invalid json');

      const coverageFiles = [coverageFile];

      expect(() => mergeCoverageFiles(coverageFiles)).toThrow();
    });
  });

  describe('writeMergedCoverage', () => {
    it('should write the merged coverage data to the specified file', () => {
      const mergedCoverage = {
        'file1.js': { /* coverage data */ },
        'file2.js': { /* coverage data */ },
      };

      const mergedCoverageFile = pathModule.join(tmpDir, 'coverage-final.json');

      writeMergedCoverage(mergedCoverage, mergedCoverageFile);

      const writtenData = fs.readFileSync(mergedCoverageFile, 'utf8');
      expect(JSON.parse(writtenData)).toEqual(mergedCoverage);
    });
  });

  describe('main', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});
    });

    it('should complete successfully when coverage files are found', () => {
      const coverageData1 = {
        'file1.js': {
          path: 'file1.js',
          statementMap: {
            0: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };
      const coverageData2 = {
        'file2.js': {
          path: 'file2.js',
          statementMap: {
            0: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 10 },
            },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
          f: {},
          b: {},
        },
      };

      const coverageDir1 = pathModule.join(tmpDir, 'dir1');
      const coverageDir2 = pathModule.join(tmpDir, 'dir2');

      fs.mkdirSync(coverageDir1, { recursive: true });
      fs.mkdirSync(coverageDir2, { recursive: true });

      fs.writeFileSync(
        pathModule.join(coverageDir1, 'coverage-final.json'),
        JSON.stringify(coverageData1),
      );
      fs.writeFileSync(
        pathModule.join(coverageDir2, 'coverage-final.json'),
        JSON.stringify(coverageData2),
      );

      const mergedCoverageFile = pathModule.join(tmpDir, 'coverage-final.json');

      main(tmpDir, mergedCoverageFile);

      expect(console.log).toHaveBeenCalledWith('Searching for coverage-final.json files...');
      expect(console.log).toHaveBeenCalledWith('Found coverage files:', expect.any(Array));
      expect(console.log).toHaveBeenCalledWith('Merging coverage files...');
      expect(console.log).toHaveBeenCalledWith('Writing merged coverage report...');
      expect(console.log).toHaveBeenCalledWith(
        `Merged coverage written to ${mergedCoverageFile}`,
      );
      expect(console.log).toHaveBeenCalledWith(
        'Coverage merging completed successfully.',
      );
      expect(process.exit).not.toHaveBeenCalled();

      // Verify that the merged coverage file was written
      const mergedCoverage = JSON.parse(
        fs.readFileSync(mergedCoverageFile, 'utf8'),
      );
      expect(mergedCoverage['file1.js']).toBeDefined();
      expect(mergedCoverage['file2.js']).toBeDefined();
    });

    it('should exit with error when no coverage files are found', () => {
      const mergedCoverageFile = pathModule.join(tmpDir, 'coverage-final.json');

      main(tmpDir, mergedCoverageFile);

      expect(console.log).toHaveBeenCalledWith('Searching for coverage-final.json files...');
      expect(console.log).toHaveBeenCalledWith('Found coverage files:', []);
      expect(console.log).toHaveBeenCalledWith('Merging coverage files...');
      expect(console.error).toHaveBeenCalledWith(
        'Error during coverage merging:',
        'No coverage-final.json files found to merge.',
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should execute main with default arguments', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((dir) => {
        if (dir === DEFAULT_COVERAGE_DIR) {
          return [
            { name: 'coverage-1', isDirectory: () => true, isFile: () => false },
            { name: 'coverage-2', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dir === path.join(DEFAULT_COVERAGE_DIR, 'coverage-1')) {
          return [{ name: 'coverage-final.json', isDirectory: () => false, isFile: () => true }];
        }
        if (dir === path.join(DEFAULT_COVERAGE_DIR, 'coverage-2')) {
          return [{ name: 'coverage-final.json', isDirectory: () => false, isFile: () => true }];
        }
        return [];
      });

      jest.mock('istanbul-lib-coverage');

      const mockCoverageMap = {
        merge: jest.fn(),
        toJSON: jest.fn().mockReturnValue({ merged: true }),
      };
      istanbulCoverage.createCoverageMap = jest.fn().mockReturnValue(mockCoverageMap);
  
      main();
  
      expect(fs.readdirSync).toHaveBeenCalledWith(DEFAULT_COVERAGE_DIR, { withFileTypes: true });
    });
  });
});
