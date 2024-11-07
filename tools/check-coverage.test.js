// tests/check-coverage.test.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const simpleGit = require('simple-git');
const { createCoverageMap } = require('istanbul-lib-coverage');
const {
  fetchBaseBranch,
  getModifiedLines,
  loadCoverage,
  checkCoverage,
  groupIntoRanges,
  generateArtifact,
  generateHtmlReport,
  main,
} = require('./check-coverage');

jest.mock('simple-git');

describe('check-coverage script', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-coverage-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('fetchBaseBranch', () => {
    it('should fetch the base branch without errors', async () => {
      const gitFetchMock = jest.fn().mockResolvedValue();
      simpleGit.mockReturnValue({ fetch: gitFetchMock });

      await expect(fetchBaseBranch()).resolves.not.toThrow();
      expect(gitFetchMock).toHaveBeenCalled();
    });
  });

  describe('getModifiedLines', () => {
    it('should return modified lines for JavaScript files', async () => {
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('file1.js\nfile2.ts\nfile3.txt\n') // For diffFiles
        .mockResolvedValueOnce('@@ -0,0 +1,2 @@\n+line1\n+line2\n') // For file1.js diff
        .mockResolvedValueOnce('@@ -0,0 +1 @@\n+line1\n'); // For file2.ts diff

      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const modifiedLines = await getModifiedLines('');

      expect(modifiedLines).toEqual({
        'file1.js': [1, 2],
        'file2.ts': [1],
      });
    });

    it('should filter files by directory if provided', async () => {
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('src/file1.js\ntests/file2.ts\n') // For diffFiles
        .mockResolvedValueOnce('@@ -0,0 +1,2 @@\n+line1\n+line2\n') // For src/file1.js diff
        .mockResolvedValueOnce(''); // For tests/file2.ts diff

      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const mergeBase = '1234567890abcdef';
      const modifiedLines = await getModifiedLines(mergeBase, 'src');

      expect(modifiedLines).toEqual({
        'src/file1.js': [1, 2],
      });
    });
  });

  describe('loadCoverage', () => {
    it('should load and return the coverage map', () => {
      const coverageData = {
        'file1.js': {
          path: 'file1.js',
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      const coverageFile = path.join(tmpDir, 'coverage-final.json');
      fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

      const coverageMap = loadCoverage(coverageFile);

      expect(coverageMap.files()).toContain('file1.js');
    });

    it('should throw an error if coverage file does not exist', () => {
      const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => loadCoverage('non-existent-file.json')).toThrow(
        'Coverage file not found at non-existent-file.json'
      );

      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Coverage file not found at')
      );
    });
  });

  describe('checkCoverage', () => {
    it('should identify uncovered statements', () => {
      const modifiedLines = {
        'file1.js': [1, 2, 3],
      };

      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 0 } },
            '2': { start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { '0': 0, '1': 1, '2': 0 },
          f: {},
          b: {},
        },
      };

      const coverageMap = createCoverageMap(coverageData);

      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(uncovered).toEqual({
        'file1.js': {
          statements: [
            { id: '0', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            { id: '2', start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          ],
          functions: [],
          branches: [],
        },
      });
    });

    it('should consider all lines uncovered if file is not in coverage map', () => {
      const modifiedLines = {
        'file1.js': [1, 2, 3],
      };

      const coverageMap = createCoverageMap({});

      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(uncovered).toEqual({
        'file1.js': {
          statements: [
            { start: { line: 1, column: 0 }, end: { line: 3, column: 0 } },
          ],
          functions: [],
          branches: [],
        },
      });
    });
  });

  describe('groupIntoRanges', () => {
    it('should group consecutive lines into ranges', () => {
      const lines = [1, 2, 3, 5, 6, 8];
      const ranges = groupIntoRanges(lines);

      expect(ranges).toEqual([
        { start: 1, end: 3 },
        { start: 5, end: 6 },
        { start: 8, end: 8 },
      ]);
    });

    it('should return empty array for empty input', () => {
      const ranges = groupIntoRanges([]);
      expect(ranges).toEqual([]);
    });
  });

  describe('generateArtifact', () => {
    it('should generate JSON artifact with uncovered lines', () => {
      const uncovered = {
        'file1.js': {
          statements: [{ id: '0', start: { line: 1 }, end: { line: 1 } }],
          functions: [],
          branches: [],
        },
      };

      const artifactDir = path.join(tmpDir, 'artifacts');
      generateArtifact(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.json');
      expect(fs.existsSync(artifactPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      expect(content).toEqual(uncovered);
    });
  });

  describe('generateHtmlReport', () => {
    it('should generate HTML report with uncovered lines', () => {
      const uncovered = {
        'file1.js': {
          statements: [{ id: '0', start: { line: 1 }, end: { line: 1 } }],
          functions: [],
          branches: [],
        },
      };

      const artifactDir = path.join(tmpDir, 'artifacts');
      generateHtmlReport(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.html');
      expect(fs.existsSync(artifactPath)).toBe(true);

      const content = fs.readFileSync(artifactPath, 'utf-8');
      expect(content).toContain('<h2>file1.js</h2>');
      expect(content).toContain('<td>1</td>');
    });

    it('should generate a report indicating all lines are covered when no uncovered lines', () => {
      const uncovered = {};

      const artifactDir = path.join(tmpDir, 'artifacts');
      generateHtmlReport(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.html');
      expect(fs.existsSync(artifactPath)).toBe(true);

      const content = fs.readFileSync(artifactPath, 'utf-8');
      expect(content).toContain('<p>All modified lines are covered by tests.</p>');
    });
  });

  describe('main', () => {
    it('should complete successfully when all lines are covered', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Mock git functions
      const gitFetchMock = jest.fn().mockResolvedValue();
      const gitRawMock = jest.fn().mockResolvedValue('1234567890abcdef\n');
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('file1.js\n')
        .mockResolvedValueOnce('@@ -0,0 +1 @@\n+line1\n');

      simpleGit.mockReturnValue({
        fetch: gitFetchMock,
        raw: gitRawMock,
        diff: gitDiffMock,
      });

      // Prepare coverage data
      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { '0': 1 },
          f: {},
          b: {},
        },
      };

      const coverageFile = path.join(tmpDir, 'coverage-final.json');
      fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

      await main({
        coverageFile,
        artifactDir: path.join(tmpDir, 'artifacts'),
        outputFormat: 'json',
      });

      expect(console.log.mock.calls.flat()).toContain('All modified lines are covered by tests.');
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should fail when uncovered lines are detected', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Mock git functions
      const gitFetchMock = jest.fn().mockResolvedValue();
      const gitRawMock = jest.fn().mockResolvedValue('1234567890abcdef\n');
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('file1.js\n')
        .mockResolvedValueOnce('@@ -0,0 +1 @@\n+line1\n');

      simpleGit.mockReturnValue({
        fetch: gitFetchMock,
        raw: gitRawMock,
        diff: gitDiffMock,
      });

      // Prepare coverage data with no coverage
      const coverageData = {};

      const coverageFile = path.join(tmpDir, 'coverage-final.json');
      fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

      await main({
        coverageFile,
        artifactDir: path.join(tmpDir, 'artifacts'),
        outputFormat: 'json',
      });

      expect(console.log.mock.calls.flat()).toContain('Uncovered lines detected:');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
