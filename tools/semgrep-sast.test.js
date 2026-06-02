/* eslint-disable no-console */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  assertCompleteScan,
  buildSemgrepArgs,
  collectSemgrepResults,
  createBaselineFromResults,
  createDispositionTemplate,
  evaluateSemgrepResults,
  generateBaselineFromFreshScan,
  mapSemgrepFinding,
  validateDispositions,
  writeJson,
} = require('./semgrep-sast');

function createScanConfig() {
  return {
    semgrepVersion: '1.163.0',
    configs: ['p/default'],
    include: ['src', 'frontend/src'],
    exclude: ['node_modules', 'reports'],
    timeoutSeconds: 10,
    timeoutThreshold: 5,
    blockingSeverities: ['ERROR'],
  };
}

function writeFixtureFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function initializeGitRepo(repoDir) {
  fs.mkdirSync(repoDir, { recursive: true });
  execSync('git init', { cwd: repoDir, stdio: 'ignore' });
  execSync('git config user.name "Semgrep Test"', { cwd: repoDir, stdio: 'ignore' });
  execSync('git config user.email "semgrep-test@example.com"', {
    cwd: repoDir,
    stdio: 'ignore',
  });
}

function commitRepoState(repoDir, message = 'Initial commit') {
  execSync('git add .', { cwd: repoDir, stdio: 'ignore' });
  execSync(`git commit -m "${message}"`, { cwd: repoDir, stdio: 'ignore' });
}

function writeFakeSemgrepBinary(semgrepBinaryPath, findingPath = 'src/from-scan.js') {
  writeFixtureFile(
    semgrepBinaryPath,
    `#!/bin/sh
set -eu
json_output=""
text_output=""
sarif_output=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --json-output=*) json_output="\${1#--json-output=}" ;;
    --output=*) text_output="\${1#--output=}" ;;
    --sarif-output=*) sarif_output="\${1#--sarif-output=}" ;;
  esac
  shift
done
mkdir -p "$(dirname "$json_output")"
printf '{"version":"1.163.0","results":[{"check_id":"javascript.lang.security.audit.test-rule","path":"${findingPath}","start":{"line":99,"col":1},"end":{"line":99,"col":10},"extra":{"message":"Fresh scan finding","severity":"ERROR","fingerprint":"fresh-scan","lines":"dangerousCall(userInput)","metadata":{"category":"security"}}}],"errors":[],"paths":{"skipped":[]}}' > "$json_output"
printf 'scan text' > "$text_output"
printf '{}' > "$sarif_output"
`
  );
  fs.chmodSync(semgrepBinaryPath, 0o755);
}

function createRawFinding(overrides = {}) {
  return {
    check_id: 'javascript.lang.security.audit.test-rule',
    path: 'src/example.js',
    start: { line: 10, col: 5 },
    end: { line: 10, col: 15 },
    extra: {
      message: 'Test finding',
      severity: 'ERROR',
      lines: 'dangerousCall(userInput)',
      metadata: {
        category: 'security',
      },
    },
    ...overrides,
  };
}

describe('semgrep-sast tooling', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semgrep-sast-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds semgrep scan arguments from repo config', () => {
    const scanConfig = createScanConfig();
    const { args, outputPaths } = buildSemgrepArgs(scanConfig, 'reports/semgrep', tempDir);

    expect(args).toContain('scan');
    expect(args).toContain('--config');
    expect(args).toContain('p/default');
    expect(args).toContain('--include');
    expect(args).toContain('src');
    expect(args).toContain('--exclude');
    expect(args).toContain('node_modules');
    expect(outputPaths.json).toBe(path.join(tempDir, 'reports/semgrep/results.json'));
  });

  it('maps semgrep findings into deterministic signatures', () => {
    const finding = mapSemgrepFinding(createRawFinding());

    expect(finding.signature).toHaveLength(64);
    expect(finding.checkId).toBe('javascript.lang.security.audit.test-rule');
    expect(finding.severity).toBe('ERROR');
    expect(finding.snippet).toBe('dangerousCall(userInput)');
  });

  it('keeps the same finding signature when only line numbers move', () => {
    const original = collectSemgrepResults({
      version: '1.163.0',
      results: [createRawFinding({ start: { line: 10, col: 5 }, end: { line: 10, col: 15 } })],
    });
    const moved = collectSemgrepResults({
      version: '1.163.0',
      results: [createRawFinding({ start: { line: 30, col: 2 }, end: { line: 30, col: 12 } })],
    });

    expect(original.findings[0].signature).toBe(moved.findings[0].signature);
  });

  it('keeps duplicate finding signatures stable when semgrep returns them in reverse order', () => {
    const lineTenFinding = createRawFinding({
      start: { line: 10, col: 5 },
      end: { line: 10, col: 15 },
    });
    const lineTwentyFinding = createRawFinding({
      start: { line: 20, col: 5 },
      end: { line: 20, col: 15 },
    });
    const forward = collectSemgrepResults({
      version: '1.163.0',
      results: [lineTenFinding, lineTwentyFinding],
    });
    const reversed = collectSemgrepResults({
      version: '1.163.0',
      results: [lineTwentyFinding, lineTenFinding],
    });
    const forwardByLine = new Map(
      forward.findings.map((finding) => [finding.start.line, finding.signature])
    );
    const reversedByLine = new Map(
      reversed.findings.map((finding) => [finding.start.line, finding.signature])
    );

    expect(forwardByLine.get(10)).toBe(reversedByLine.get(10));
    expect(forwardByLine.get(20)).toBe(reversedByLine.get(20));
  });

  it('collects semgrep results with errors and skipped paths', () => {
    const collectedResults = collectSemgrepResults({
      version: '1.163.0',
      results: [createRawFinding()],
      errors: [{ level: 'WARN', message: 'Parser warning', path: 'src/a.js' }],
      paths: {
        skipped: [{ path: 'src/b.js', reason: 'size_limit' }],
      },
    });

    expect(collectedResults.findings).toHaveLength(1);
    expect(collectedResults.errors).toEqual([
      expect.objectContaining({ message: 'Parser warning', path: 'src/a.js' }),
    ]);
    expect(collectedResults.skipped).toEqual([
      expect.objectContaining({ path: 'src/b.js', reason: 'size_limit' }),
    ]);
  });

  it('fails baseline generation when semgrep reports scan errors', () => {
    const scanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const resultsPath = path.join(tempDir, 'reports/semgrep/results.json');
    const baselinePath = path.join(tempDir, 'security/sast/baseline.json');

    writeJson(scanConfigPath, createScanConfig());
    writeJson(resultsPath, {
      version: '1.163.0',
      results: [createRawFinding()],
      errors: [
        {
          level: 'ERROR',
          message: 'Parser failure',
          path: 'src/bad.js',
        },
      ],
      paths: {
        skipped: [],
      },
    });

    expect(() =>
      createBaselineFromResults({
        resultsPath: path.relative(tempDir, resultsPath),
        scanConfigPath: path.relative(tempDir, scanConfigPath),
        baselinePath: path.relative(tempDir, baselinePath),
        generatedAt: '2026-06-02T12:00:00.000Z',
        cwd: tempDir,
      })
    ).toThrow('Baseline generation produced an incomplete Semgrep result');
  });

  it('creates a baseline from scan output', () => {
    const scanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const resultsPath = path.join(tempDir, 'reports/semgrep/results.json');
    const baselinePath = path.join(tempDir, 'security/sast/baseline.json');

    writeJson(scanConfigPath, createScanConfig());
    writeJson(resultsPath, {
      version: '1.163.0',
      results: [createRawFinding()],
    });

    const baseline = createBaselineFromResults({
      resultsPath: path.relative(tempDir, resultsPath),
      scanConfigPath: path.relative(tempDir, scanConfigPath),
      baselinePath: path.relative(tempDir, baselinePath),
      generatedAt: '2026-06-02T12:00:00.000Z',
      cwd: tempDir,
    });

    expect(baseline.baselineDate).toBe('2026-06-02');
    expect(baseline.findings).toHaveLength(1);
    expect(fs.existsSync(baselinePath)).toBe(true);
  });

  it('seeds dispositions from a generated baseline', () => {
    const baselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const dispositionsPath = path.join(tempDir, 'security/sast/dispositions.json');
    const mappedFinding = collectSemgrepResults({
      version: '1.163.0',
      results: [createRawFinding()],
    }).findings[0];

    writeJson(baselinePath, {
      baselineDate: '2026-06-02',
      findings: [mappedFinding],
    });

    const dispositions = createDispositionTemplate({
      baselinePath: path.relative(tempDir, baselinePath),
      dispositionsPath: path.relative(tempDir, dispositionsPath),
      reviewBy: '2026-09-02',
      cwd: tempDir,
    });

    expect(dispositions.items).toHaveLength(1);
    expect(dispositions.items[0].status).toBe('deferred');
    expect(fs.existsSync(dispositionsPath)).toBe(true);
  });

  it('preserves reviewed disposition fields when refreshing the template', () => {
    const baselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const dispositionsPath = path.join(tempDir, 'security/sast/dispositions.json');
    const baselineFinding = collectSemgrepResults({
      version: '1.163.0',
      results: [
        createRawFinding({
          start: { line: 40, col: 8 },
          end: { line: 40, col: 18 },
        }),
      ],
    }).findings[0];

    writeJson(baselinePath, {
      baselineDate: '2026-06-02',
      findings: [baselineFinding],
    });
    writeJson(dispositionsPath, {
      baselineDate: '2026-06-02',
      items: [
        {
          signature: baselineFinding.signature,
          checkId: baselineFinding.checkId,
          path: 'src/old-location.js',
          start: { line: 10, col: 1 },
          severity: 'WARNING',
          status: 'accepted_risk',
          rationale: 'Reviewed and accepted',
          owner: 'Security',
          reviewBy: '2026-12-01',
          ticket: 'ABC-123',
          approvedBy: 'security-team',
          approvedOn: '2026-06-10',
        },
      ],
    });

    const dispositions = createDispositionTemplate({
      baselinePath: path.relative(tempDir, baselinePath),
      dispositionsPath: path.relative(tempDir, dispositionsPath),
      cwd: tempDir,
    });

    expect(dispositions.items[0]).toEqual(
      expect.objectContaining({
        signature: baselineFinding.signature,
        path: baselineFinding.path,
        start: baselineFinding.start,
        severity: baselineFinding.severity,
        status: 'accepted_risk',
        rationale: 'Reviewed and accepted',
        owner: 'Security',
        reviewBy: '2026-12-01',
        ticket: 'ABC-123',
        approvedBy: 'security-team',
        approvedOn: '2026-06-10',
      })
    );
  });

  it('detects new blocking findings against the baseline', () => {
    const scanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const baselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const dispositionsPath = path.join(tempDir, 'security/sast/dispositions.json');
    const resultsPath = path.join(tempDir, 'reports/semgrep/results.json');

    writeJson(scanConfigPath, createScanConfig());

    const knownFinding = createRawFinding({
      path: 'src/known.js',
      start: { line: 1, col: 1 },
      end: { line: 1, col: 10 },
    });
    const baselineFinding = collectSemgrepResults({
      version: '1.163.0',
      results: [knownFinding],
    }).findings[0];
    const newFinding = createRawFinding({
      path: 'src/new.js',
      start: { line: 20, col: 1 },
      end: { line: 20, col: 12 },
    });

    writeJson(baselinePath, {
      baselineDate: '2026-06-02',
      findings: [baselineFinding],
    });
    writeJson(dispositionsPath, {
      baselineDate: '2026-06-02',
      items: [
        {
          signature: baselineFinding.signature,
          status: 'deferred',
          rationale: 'Tracked legacy finding',
          owner: 'AppDev',
          reviewBy: '2026-09-02',
        },
      ],
    });
    writeJson(resultsPath, {
      version: '1.163.0',
      results: [knownFinding, newFinding],
    });

    const summary = evaluateSemgrepResults({
      resultsPath: path.relative(tempDir, resultsPath),
      baselinePath: path.relative(tempDir, baselinePath),
      dispositionsPath: path.relative(tempDir, dispositionsPath),
      scanConfigPath: path.relative(tempDir, scanConfigPath),
      cwd: tempDir,
    });

    expect(summary.counts.newBlockingFindings).toBe(1);
    expect(summary.failures).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'new-blocking-finding' })])
    );
  });

  it('fails when baseline findings are missing dispositions', () => {
    const baselineFinding = collectSemgrepResults({
      version: '1.163.0',
      results: [createRawFinding()],
    }).findings[0];
    const validation = validateDispositions(
      {
        findings: [baselineFinding],
      },
      {
        items: [],
      }
    );

    expect(validation.missingDispositions).toEqual([baselineFinding.signature]);
  });

  it('treats skipped paths as an incomplete scan', () => {
    const collectedResults = {
      semgrepVersion: '1.163.0',
      findings: [],
      errors: [],
      skipped: [
        {
          path: 'vendor/generated.js',
          reason: 'too_large',
        },
      ],
    };

    expect(() => assertCompleteScan(collectedResults, 'SAST check')).toThrow(
      'SAST check produced an incomplete Semgrep result'
    );
  });

  it('creates a fresh baseline from a new scan instead of reusing stale output', () => {
    const repoDir = path.join(tempDir, 'repo');
    const semgrepBinaryPath = path.join(tempDir, 'fake-semgrep.sh');
    const provenancePath = path.join(repoDir, 'reports/semgrep/provenance.json');

    initializeGitRepo(repoDir);
    writeJson(path.join(repoDir, 'security/sast/scan-config.json'), createScanConfig());
    writeFixtureFile(path.join(repoDir, 'src/placeholder.js'), 'console.log("placeholder")\n');
    commitRepoState(repoDir);
    writeFakeSemgrepBinary(semgrepBinaryPath);

    const baseline = generateBaselineFromFreshScan({
      scanConfigPath: 'security/sast/scan-config.json',
      outputDir: 'reports/semgrep',
      semgrepBinary: semgrepBinaryPath,
      baselinePath: 'security/sast/baseline.json',
      provenancePath: 'reports/semgrep/provenance.json',
      generatedAt: '2026-06-02T12:00:00.000Z',
      cwd: repoDir,
    });

    expect(baseline.findings).toHaveLength(1);
    expect(baseline.findings[0].path).toBe('src/from-scan.js');
    expect(baseline.provenance).toEqual(
      expect.objectContaining({
        gitHeadSha: expect.any(String),
        scanConfigHash: expect.any(String),
        gitWorktree: expect.objectContaining({
          isDirty: false,
          statusHash: expect.any(String),
          trackedDiffHash: expect.any(String),
          untrackedFilesHash: expect.any(String),
          untrackedFileCount: 0,
        }),
      })
    );
    expect(baseline.provenance.gitWorktree.untrackedEntries).toBeUndefined();

    const artifactProvenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    expect(artifactProvenance.gitWorktree).toEqual(
      expect.objectContaining({
        untrackedEntries: [],
      })
    );
  });

  it('records dirty worktree provenance for fresh baseline generation', () => {
    const repoDir = path.join(tempDir, 'repo');
    const semgrepBinaryPath = path.join(tempDir, 'fake-semgrep.sh');
    const provenancePath = path.join(repoDir, 'reports/semgrep/provenance.json');

    initializeGitRepo(repoDir);
    writeJson(path.join(repoDir, 'security/sast/scan-config.json'), createScanConfig());
    writeFixtureFile(path.join(repoDir, 'src/placeholder.js'), 'console.log("placeholder")\n');
    commitRepoState(repoDir);
    writeFixtureFile(path.join(repoDir, 'src/untracked.js'), 'console.log("dirty")\n');
    writeFakeSemgrepBinary(semgrepBinaryPath, 'src/dirty-scan.js');

    const baseline = generateBaselineFromFreshScan({
      scanConfigPath: 'security/sast/scan-config.json',
      outputDir: 'reports/semgrep',
      semgrepBinary: semgrepBinaryPath,
      baselinePath: 'security/sast/baseline.json',
      provenancePath: 'reports/semgrep/provenance.json',
      generatedAt: '2026-06-02T12:00:00.000Z',
      cwd: repoDir,
    });

    expect(baseline.provenance.gitWorktree).toEqual(
      expect.objectContaining({
        isDirty: true,
        statusHash: expect.any(String),
        trackedDiffHash: expect.any(String),
        untrackedFilesHash: expect.any(String),
        untrackedFileCount: 1,
      })
    );
    expect(baseline.provenance.gitWorktree.untrackedEntries).toBeUndefined();

    const artifactProvenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    expect(artifactProvenance.gitWorktree.untrackedEntries).toEqual([
      expect.objectContaining({
        path: 'src/untracked.js',
        type: 'file',
        fingerprint: expect.any(String),
      }),
    ]);
  });

  it('records broken symlinks in artifact provenance without failing baseline generation', () => {
    const repoDir = path.join(tempDir, 'repo');
    const semgrepBinaryPath = path.join(tempDir, 'fake-semgrep.sh');
    const provenancePath = path.join(repoDir, 'reports/semgrep/provenance.json');

    initializeGitRepo(repoDir);
    writeJson(path.join(repoDir, 'security/sast/scan-config.json'), createScanConfig());
    writeFixtureFile(path.join(repoDir, 'src/placeholder.js'), 'console.log("placeholder")\n');
    commitRepoState(repoDir);
    fs.symlinkSync('missing-target.txt', path.join(repoDir, 'broken-link.txt'));
    writeFakeSemgrepBinary(semgrepBinaryPath, 'src/symlink-scan.js');

    const baseline = generateBaselineFromFreshScan({
      scanConfigPath: 'security/sast/scan-config.json',
      outputDir: 'reports/semgrep',
      semgrepBinary: semgrepBinaryPath,
      baselinePath: 'security/sast/baseline.json',
      provenancePath: 'reports/semgrep/provenance.json',
      generatedAt: '2026-06-02T12:00:00.000Z',
      cwd: repoDir,
    });

    expect(baseline.findings).toHaveLength(1);
    expect(baseline.provenance.gitWorktree).toEqual(
      expect.objectContaining({
        isDirty: true,
        untrackedFileCount: 1,
      })
    );

    const artifactProvenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    expect(artifactProvenance.gitWorktree.untrackedEntries).toEqual([
      expect.objectContaining({
        path: 'broken-link.txt',
        type: 'symlink',
        fingerprint: expect.any(String),
      }),
    ]);
  });
});
