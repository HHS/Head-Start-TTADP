const fs = require('fs');
const path = require('path');
const { summarizeCoverage, logCoverageResults } = require('./summarize-coverage');

describe('summarizeCoverage', () => {
  let coverageFile;

  beforeEach(() => {
    coverageFile = path.join(__dirname, 'coverage-final.json');
  });

  afterEach(() => {
    if (fs.existsSync(coverageFile)) {
      fs.unlinkSync(coverageFile);
    }
  });

  it('should calculate overall coverage correctly when all lines are covered', () => {
    const coverageData = {
      'file1.js': {
        s: { 0: 1, 1: 1 },
        f: { 0: 1 },
        b: { 0: [1] },
      },
    };
    fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

    const coverage = summarizeCoverage(coverageFile, 80);

    expect(coverage.statements).toBe(100);
    expect(coverage.functions).toBe(100);
    expect(coverage.branches).toBe(100);
    expect(coverage.overall).toBe(100);
  });

  it('should throw an error if the coverage file is missing', () => {
    expect(() => summarizeCoverage('missing.json', 80)).toThrow('Coverage file not found');
  });

  it('should throw an error if the coverage file contains malformed JSON', () => {
    fs.writeFileSync(coverageFile, '{ invalid json');
    expect(() => summarizeCoverage(coverageFile, 80)).toThrow('Failed to parse coverage data');
  });

  it('should throw an error for an unexpected error while reading the coverage file', () => {
    const mockReadFileSync = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    expect(() => summarizeCoverage(coverageFile, 80)).toThrow(
      'Unexpected error while reading the coverage file.',
    );

    mockReadFileSync.mockRestore();
  });

  it('should calculate coverage correctly when some lines are uncovered', () => {
    const coverageData = {
      'file1.js': {
        s: { 0: 1, 1: 0 },
        f: { 0: 1 },
        b: { 0: [1, 0] },
      },
    };
    fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

    const coverage = summarizeCoverage(coverageFile, 50);

    expect(coverage.statements).toBe(50);
    expect(coverage.functions).toBe(100);
    expect(coverage.branches).toBe(50);
    expect(coverage.overall).toBeCloseTo(60, 2);
  });
});

describe('logCoverageResults', () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
  const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log success when coverage meets the requirement', () => {
    const coverage = {
      statements: 90, functions: 90, branches: 90, overall: 90,
    };
    logCoverageResults(coverage, 80);

    expect(mockLog).toHaveBeenCalledWith('Coverage Summary:');
    expect(mockLog).toHaveBeenCalledWith('Statements: 90.00%');
    expect(mockLog).toHaveBeenCalledWith('Functions: 90.00%');
    expect(mockLog).toHaveBeenCalledWith('Branches: 90.00%');
    expect(mockLog).toHaveBeenCalledWith('Overall Coverage: 90.00%');
    expect(mockLog).toHaveBeenCalledWith('Success: Coverage (90.00%) meets the required 80%');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should log an error and exit when coverage is below the requirement', () => {
    const coverage = {
      statements: 50, functions: 50, branches: 50, overall: 50,
    };
    logCoverageResults(coverage, 80);

    expect(mockLog).toHaveBeenCalledWith('Coverage Summary:');
    expect(mockLog).toHaveBeenCalledWith('Statements: 50.00%');
    expect(mockLog).toHaveBeenCalledWith('Functions: 50.00%');
    expect(mockLog).toHaveBeenCalledWith('Branches: 50.00%');
    expect(mockLog).toHaveBeenCalledWith('Overall Coverage: 50.00%');
    expect(mockError).toHaveBeenCalledWith('Error: Coverage (50.00%) is below the required 80%');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
