/* eslint-disable no-console */
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
  intersectLocationWithLines,
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

    it('should throw an error if git fetch fails', async () => {
      const gitFetchMock = jest.fn().mockRejectedValue(new Error('Fetch failed'));
      simpleGit.mockReturnValue({ fetch: gitFetchMock });

      await expect(fetchBaseBranch()).rejects.toThrow('Fetch failed');
    });
  });

  describe('getModifiedLines', () => {
    it('should return modified lines for JavaScript files', async () => {
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('src/file1.js\nsrc/file2.ts\n') // Mock for diffFiles
        .mockResolvedValueOnce('@@ -1,0 +1,2 @@\n+line1\n+line2\n') // Mock diff for file1.js
        .mockResolvedValueOnce('@@ -1,0 +1 @@\n+line1\n'); // Mock diff for file2.ts

      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const modifiedLines = await getModifiedLines();

      expect(modifiedLines).toEqual({
        'src/file1.js': [1, 2],
        'src/file2.ts': [1],
      });
    });

    it('should filter files by directory if provided', async () => {
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('src/file1.js\ntests/file2.ts\n') // Mock for diffFiles
        .mockResolvedValueOnce('@@ -1,0 +1,2 @@\n+line1\n+line2\n') // Mock diff for src/file1.js
        .mockResolvedValueOnce(''); // No diff for tests/file2.ts

      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const modifiedLines = await getModifiedLines(['src/']);

      expect(modifiedLines).toEqual({
        'src/file1.js': [1, 2],
      });
    });

    it('should not filter files by directory if provided', async () => {
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('src/file1.js\nunfiltered/file2.ts\n') // Mock for diffFiles
        .mockResolvedValueOnce('@@ -1,0 +1,2 @@\n+line1\n+line2\n') // Mock diff for src/file1.js
        .mockResolvedValueOnce('@@ -1,0 +1,2 @@\n+line1\n+line2\n'); // No diff for tests/file2.ts

      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const modifiedLines = await getModifiedLines([]);

      expect(modifiedLines).toEqual({
        'src/file1.js': [1, 2],
        'unfiltered/file2.ts': [1, 2],
      });
    });

    it('should return an empty object if there are no modified files', async () => {
      const gitDiffMock = jest.fn().mockResolvedValue('');
      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const modifiedLines = await getModifiedLines();
      expect(modifiedLines).toEqual({});
    });

    it('should ignore non-JavaScript/TypeScript files', async () => {
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('file1.py\nfile2.txt\n') // Files that should be ignored
        .mockResolvedValue(''); // No line diffs

      simpleGit.mockReturnValue({ diff: gitDiffMock });

      const modifiedLines = await getModifiedLines();
      expect(modifiedLines).toEqual({});
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
        'Failed to parse coverage data at non-existent-file.json',
      );

      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Coverage file not found at'),
      );
    });

    it('should throw an error if the coverage file is corrupted', () => {
      const coverageFile = path.join(tmpDir, 'corrupted-coverage.json');
      fs.writeFileSync(coverageFile, 'Not JSON content'); // Non-JSON content

      expect(() => loadCoverage(coverageFile)).toThrow(
        'Failed to parse coverage data at',
      );
    });

    it('should handle malformed JSON data gracefully', () => {
      const coverageFile = path.join(tmpDir, 'bad-data.json');
      fs.writeFileSync(coverageFile, '{"bad json}');
      expect(() => loadCoverage(coverageFile)).toThrow('Failed to parse coverage data');
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
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 0 } },
            2: { start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 0, 1: 1, 2: 0 },
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

    it('should mark all lines as uncovered if none are covered in modified files', () => {
      const modifiedLines = {
        'file1.js': [1, 2, 3],
      };

      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 0 } },
            2: { start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 0, 1: 0, 2: 0 },
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
            { id: '1', start: { line: 2, column: 0 }, end: { line: 2, column: 0 } },
            { id: '2', start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          ],
          functions: [],
          branches: [],
        },
      });
    });

    it('should return uncovered lines when some lines are not covered', () => {
      const modifiedLines = { 'someFile.js': [1, 2, 3] };
      const normalizedFilePath = path.resolve(process.cwd(), 'someFile.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 0 } },
            2: { start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 0, 1: 3, 2: 3 },
          f: {},
          b: {},
        },
      };

      const coverageMap = createCoverageMap(coverageData);
      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(Object.keys(uncovered)).toContain('someFile.js');
    });

    it('should return an empty object when all lines are covered', () => {
      const modifiedLines = { 'fullyCoveredFile.js': [1, 2, 3] };
      const normalizedFilePath = path.resolve(process.cwd(), 'fullyCoveredFile.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            1: { start: { line: 2, column: 0 }, end: { line: 2, column: 0 } },
            2: { start: { line: 3, column: 0 }, end: { line: 3, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 3, 1: 3, 2: 1 },
          f: {},
          b: {},
        },
      };

      const coverageMap = createCoverageMap(coverageData);
      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(uncovered).toEqual({});
    });

    it('should identify uncovered functions', () => {
      const modifiedLines = {
        'fileWithUncoveredFunctions.js': [1, 2, 3],
      };

      const normalizedFilePath = path.resolve(process.cwd(), 'fileWithUncoveredFunctions.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {},
          fnMap: {
            0: { name: 'functionOne', loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } } },
            1: { name: 'functionTwo', loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 0 } } },
          },
          branchMap: {},
          s: {},
          f: { 0: 0, 1: 1 },
          b: {},
        },
      };

      const coverageMap = createCoverageMap(coverageData);
      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(uncovered).toEqual({
        'fileWithUncoveredFunctions.js': {
          statements: [],
          functions: [
            {
              id: '0', name: 'functionOne', start: { line: 1, column: 0 }, end: { line: 1, column: 0 },
            },
          ],
          branches: [],
        },
      });
    });

    it('should identify uncovered branches', () => {
      const modifiedLines = {
        'fileWithUncoveredBranches.js': [1, 2, 3],
      };

      const normalizedFilePath = path.resolve(process.cwd(), 'fileWithUncoveredBranches.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {},
          fnMap: {},
          branchMap: {
            0: { locations: [{ start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }] },
            1: { locations: [{ start: { line: 2, column: 0 }, end: { line: 2, column: 0 } }] },
          },
          s: {},
          f: {},
          b: { 0: [0], 1: [1] },
        },
      };

      const coverageMap = createCoverageMap(coverageData);
      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(uncovered).toEqual({
        'fileWithUncoveredBranches.js': {
          statements: [],
          functions: [],
          branches: [
            {
              id: '0', locationIndex: 0, start: { line: 1, column: 0 }, end: { line: 1, column: 0 },
            },
          ],
        },
      });
    });

    it('should return uncovered functions and branches when both are not covered', () => {
      const modifiedLines = { 'complexFile.js': [1, 2, 3] };
      const normalizedFilePath = path.resolve(process.cwd(), 'complexFile.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {},
          fnMap: {
            0: { name: 'funcOne', loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } } },
          },
          branchMap: {
            1: { locations: [{ start: { line: 2, column: 0 }, end: { line: 2, column: 0 } }] },
          },
          s: {},
          f: { 0: 0 },
          b: { 1: [0] },
        },
      };

      const coverageMap = createCoverageMap(coverageData);
      const uncovered = checkCoverage(modifiedLines, coverageMap);

      expect(uncovered).toEqual({
        'complexFile.js': {
          statements: [],
          functions: [
            {
              id: '0', name: 'funcOne', start: { line: 1, column: 0 }, end: { line: 1, column: 0 },
            },
          ],
          branches: [
            {
              id: '1', locationIndex: 0, start: { line: 2, column: 0 }, end: { line: 2, column: 0 },
            },
          ],
        },
      });
    });

    it('should throw an error when file is not found in the coverage map', () => {
      const modifiedLines = { 'missingFile.js': [1, 2] };
      const coverageMap = {
        fileCoverageFor: () => null,
      };

      const uncovered = checkCoverage(modifiedLines, coverageMap);
      expect(uncovered).toEqual({
        'missingFile.js': {
          statements: [
            { start: { line: 1, column: 0 }, end: { line: 2, column: 0 } },
          ],
          functions: [],
          branches: [],
        },
      });
    });

    it('should not create a new entry in uncovered if already exists', () => {
      const modifiedLines = { 'file1.js': [1] };
      const coverageMap = createCoverageMap({
        'file1.js': {
          path: 'file1.js',
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      });
      const uncovered = { 'file1.js': { statements: [], functions: [], branches: [] } };

      checkCoverage(modifiedLines, coverageMap);
      expect(Object.keys(uncovered)).toContain('file1.js');
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

    it('should not create artifact directory if it exists', () => {
      const uncovered = {};
      const artifactDir = path.join(tmpDir, 'existingDir');
      fs.mkdirSync(artifactDir);

      generateArtifact(uncovered, artifactDir);
      expect(fs.existsSync(artifactDir)).toBe(true);
    });

    it('should include statements in the artifact if uncovered statements exist', () => {
      const uncovered = {
        'file1.js': {
          statements: [{ id: '0', start: { line: 1 }, end: { line: 2 } }],
          functions: [],
          branches: [],
        },
      };
      const artifactDir = path.join(tmpDir, 'artifacts');
      generateArtifact(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.json');
      const content = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      expect(content['file1.js'].statements).toHaveLength(1);
    });

    it('should include functions in the artifact if uncovered functions exist', () => {
      const uncovered = {
        'file1.js': {
          statements: [],
          functions: [{
            id: '0', name: 'myFunc', start: { line: 1 }, end: { line: 2 },
          }],
          branches: [],
        },
      };
      const artifactDir = path.join(tmpDir, 'artifacts');
      generateArtifact(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.json');
      const content = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      expect(content['file1.js'].functions).toHaveLength(1);
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

    it('should generate HTML report if outputFormat includes html', () => {
      const uncovered = {
        'file1.js': {
          statements: [],
          functions: [],
          branches: [],
        },
      };
      const artifactDir = path.join(tmpDir, 'artifacts');
      generateHtmlReport(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.html');
      expect(fs.existsSync(artifactPath)).toBe(true);
    });
    it('should include functions in the HTML report when uncovered functions are present', () => {
      const uncovered = {
        'file1.js': {
          statements: [],
          functions: [
            {
              id: '1', name: 'myFunction', start: { line: 5 }, end: { line: 10 },
            },
          ],
          branches: [],
        },
      };

      const artifactDir = path.join(tmpDir, 'artifacts');
      generateHtmlReport(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.html');
      expect(fs.existsSync(artifactPath)).toBe(true);

      const content = fs.readFileSync(artifactPath, 'utf-8');
      expect(content).toContain('<h2>file1.js</h2>');
      expect(content).toContain('<h3>Functions</h3>');
      expect(content).toContain('<td>1</td>'); // function ID
      expect(content).toContain('<td>myFunction</td>'); // function name
      expect(content).toContain('<td>5</td>'); // start line
      expect(content).toContain('<td>10</td>'); // end line
    });

    it('should include branches in the HTML report when uncovered branches are present', () => {
      const uncovered = {
        'file1.js': {
          statements: [],
          functions: [],
          branches: [
            {
              id: '2',
              locationIndex: 0,
              start: { line: 15 },
              end: { line: 20 },
            },
          ],
        },
      };

      const artifactDir = path.join(tmpDir, 'artifacts');
      generateHtmlReport(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.html');
      expect(fs.existsSync(artifactPath)).toBe(true);

      const content = fs.readFileSync(artifactPath, 'utf-8');
      expect(content).toContain('<h2>file1.js</h2>');
      expect(content).toContain('<h3>Branches</h3>');
      expect(content).toContain('<td>2</td>'); // branch ID
      expect(content).toContain('<td>0</td>'); // location index
      expect(content).toContain('<td>15</td>'); // start line
      expect(content).toContain('<td>20</td>'); // end line
    });

    it('should include statements, functions, and branches in the same HTML report when all are present', () => {
      const uncovered = {
        'file1.js': {
          statements: [{ id: '0', start: { line: 1 }, end: { line: 1 } }],
          functions: [
            {
              id: '1', name: 'myFunction', start: { line: 5 }, end: { line: 10 },
            },
          ],
          branches: [
            {
              id: '2',
              locationIndex: 0,
              start: { line: 15 },
              end: { line: 20 },
            },
          ],
        },
      };

      const artifactDir = path.join(tmpDir, 'artifacts');
      generateHtmlReport(uncovered, artifactDir);

      const artifactPath = path.join(artifactDir, 'uncovered-lines.html');
      expect(fs.existsSync(artifactPath)).toBe(true);

      const content = fs.readFileSync(artifactPath, 'utf-8');
      expect(content).toContain('<h2>file1.js</h2>');
      expect(content).toContain('<h3>Statements</h3>');
      expect(content).toContain('<td>1</td>'); // statement start line

      expect(content).toContain('<h3>Functions</h3>');
      expect(content).toContain('<td>1</td>'); // function ID
      expect(content).toContain('<td>myFunction</td>');
      expect(content).toContain('<td>5</td>'); // function start line
      expect(content).toContain('<td>10</td>'); // function end line

      expect(content).toContain('<h3>Branches</h3>');
      expect(content).toContain('<td>2</td>'); // branch ID
      expect(content).toContain('<td>0</td>'); // location index
      expect(content).toContain('<td>15</td>'); // branch start line
      expect(content).toContain('<td>20</td>'); // branch end line
    });
  });

  describe('intersectLocationWithLines', () => {
    it('should return null when there are no overlapping lines', () => {
      const loc = { start: { line: 5, column: 2 }, end: { line: 10, column: 4 } };
      const overlappingLines = [];
      expect(intersectLocationWithLines(loc, overlappingLines)).toBeNull();
    });

    it('should adjust the start line when there is partial overlap at the start', () => {
      const loc = { start: { line: 5, column: 2 }, end: { line: 10, column: 4 } };
      const overlappingLines = [6, 7, 8];
      const result = intersectLocationWithLines(loc, overlappingLines);

      expect(result).toEqual({
        start: { line: 6, column: 0 },
        end: { line: 8, column: undefined },
      });
    });

    it('should adjust the end line when there is partial overlap at the end', () => {
      const loc = { start: { line: 5, column: 2 }, end: { line: 10, column: 4 } };
      const overlappingLines = [8, 9];
      const result = intersectLocationWithLines(loc, overlappingLines);

      expect(result).toEqual({
        start: { line: 8, column: 0 },
        end: { line: 9, column: undefined },
      });
    });

    it('should adjust both start and end lines when there is a complete overlap', () => {
      const loc = { start: { line: 5, column: 2 }, end: { line: 10, column: 4 } };
      const overlappingLines = [6, 7, 8, 9];
      const result = intersectLocationWithLines(loc, overlappingLines);

      expect(result).toEqual({
        start: { line: 6, column: 0 },
        end: { line: 9, column: undefined },
      });
    });

    it('should return the original location when overlapping lines fully cover the location', () => {
      const loc = { start: { line: 5, column: 2 }, end: { line: 10, column: 4 } };
      const overlappingLines = [5, 6, 7, 8, 9, 10];
      const result = intersectLocationWithLines(loc, overlappingLines);

      expect(result).toEqual({
        start: { line: 5, column: 2 },
        end: { line: 10, column: 4 },
      });
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
            0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
          },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
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
        .mockResolvedValueOnce('file1.js\n') // Modified file
        .mockResolvedValueOnce('@@ -1,0 +1 @@\n+line1\n'); // Modified line in file1.js

      simpleGit.mockReturnValue({
        fetch: gitFetchMock,
        raw: gitRawMock,
        diff: gitDiffMock,
      });

      // Provide coverage data without coverage for the modified lines
      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 0 }, // Mark line as uncovered
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

      expect(console.log.mock.calls.flat()).toContain('Uncovered lines detected:');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should log an error if the coverage file is missing', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});

      await main({
        coverageFile: 'missing-coverage.json',
        artifactDir: path.join(tmpDir, 'artifacts'),
        outputFormat: 'json',
      });

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Coverage file not found at'));
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should succeed if no uncovered lines are detected', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Mock git functions to simulate a covered file
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

      // Set up a covered line
      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } } },
          fnMap: {},
          branchMap: {},
          s: { 0: 1 },
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

    it('should detect uncovered functions and report them', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Mock git functions
      const gitFetchMock = jest.fn().mockResolvedValue();
      const gitRawMock = jest.fn().mockResolvedValue('1234567890abcdef\n');
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('file1.js\n')
        .mockResolvedValueOnce('@@ -4,0 +5 @@\n+line5\n');

      simpleGit.mockReturnValue({
        fetch: gitFetchMock,
        raw: gitRawMock,
        diff: gitDiffMock,
      });

      // Coverage data with uncovered function
      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {},
          fnMap: { 1: { name: 'uncoveredFunction', loc: { start: { line: 5 }, end: { line: 10 } } } },
          branchMap: {},
          s: {},
          f: { 1: 0 }, // Mark function as uncovered
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

      expect(console.log.mock.calls.flat()).toContain('Uncovered lines detected:');
    });

    it('should detect uncovered branches and report them', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Mock git functions
      const gitFetchMock = jest.fn().mockResolvedValue();
      const gitRawMock = jest.fn().mockResolvedValue('1234567890abcdef\n');
      const gitDiffMock = jest.fn()
        .mockResolvedValueOnce('file1.js\n')
        .mockResolvedValueOnce('@@ -15,0 +16 @@\n+line16\n');

      simpleGit.mockReturnValue({
        fetch: gitFetchMock,
        raw: gitRawMock,
        diff: gitDiffMock,
      });

      // Coverage data with uncovered branch
      const normalizedFilePath = path.resolve(process.cwd(), 'file1.js');
      const coverageData = {
        [normalizedFilePath]: {
          path: normalizedFilePath,
          statementMap: {},
          fnMap: {},
          branchMap: {
            2: {
              locations: [
                { start: { line: 16 }, end: { line: 20 } },
              ],
            },
          },
          s: {},
          f: {},
          b: { 2: [0] }, // Mark branch as uncovered
        },
      };

      const coverageFile = path.join(tmpDir, 'coverage-final.json');
      fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

      await main({
        coverageFile,
        artifactDir: path.join(tmpDir, 'artifacts'),
        outputFormat: 'json',
      });

      expect(console.log.mock.calls.flat()).toContain('Uncovered lines detected:');
    });
  });
});
