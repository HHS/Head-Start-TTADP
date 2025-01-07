const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const summarizeCoverageScript = path.resolve('./tools/summarize-coverage.js');

describe('summarize-coverage script', () => {
  let coverageFile;

  beforeEach(() => {
    coverageFile = path.join(__dirname, 'coverage-final.json');
  });

  afterEach(() => {
    if (fs.existsSync(coverageFile)) {
      fs.unlinkSync(coverageFile);
    }
  });

  it('should handle missing coverage file gracefully', () => {
    expect(() => {
      execSync(`node "${summarizeCoverageScript}" "missing.json" 80`, { encoding: 'utf-8' });
    }).toThrow();

    try {
      execSync(`node "${summarizeCoverageScript}" "missing.json" 80`, { encoding: 'utf-8' });
    } catch (error) {
      expect(error.stderr).toContain('Coverage file not found');
    }
  });

  it('should handle malformed JSON in the coverage file', () => {
    fs.writeFileSync(coverageFile, '{ invalid json');

    expect(() => {
      execSync(`node "${summarizeCoverageScript}" "${coverageFile}" 80`, { encoding: 'utf-8' });
    }).toThrow();

    try {
      execSync(`node "${summarizeCoverageScript}" "${coverageFile}" 80`, { encoding: 'utf-8' });
    } catch (error) {
      expect(error.stderr).toContain('Failed to parse coverage data');
    }
  });

  it('should calculate coverage when some lines are uncovered', () => {
    const coverageData = {
      'file1.js': {
        s: { '0': 1, '1': 0 },
        f: { '0': 1 },
        b: { '0': [1, 0] },
      },
    };
    fs.writeFileSync(coverageFile, JSON.stringify(coverageData));

    const output = execSync(`node "${summarizeCoverageScript}" "${coverageFile}" 50`, { encoding: 'utf-8' });

    expect(output).toContain('Coverage Summary:');
    expect(output).toContain('Statements: 50.00%');
    expect(output).toContain('Functions: 100.00%');
    expect(output).toContain('Branches: 50.00%');
    expect(output).toContain('Overall Coverage: 60.00%');
    expect(output).toContain('Success: Coverage (60.00%) meets the required 50%');
  });
});
