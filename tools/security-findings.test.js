/* eslint-disable no-console */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  buildScaFindingId,
  businessDaysSince,
  createScaBaselines,
  createRegister,
  operationalDate,
  updatePendingObservations,
  validatePendingObservations,
  validateRegister,
  writeJson,
} = require('./security-findings');

function writeFixtureFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function initGitRepo(repoPath) {
  execFileSync('git', ['init'], { cwd: repoPath, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'codex@example.com'], {
    cwd: repoPath,
    stdio: 'ignore',
  });
  execFileSync('git', ['config', 'user.name', 'Codex'], {
    cwd: repoPath,
    stdio: 'ignore',
  });
  execFileSync('git', ['add', '.'], { cwd: repoPath, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'initial'], {
    cwd: repoPath,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2026-06-17T12:00:00.000Z',
      GIT_COMMITTER_DATE: '2026-06-17T12:00:00.000Z',
    },
  });
}

function createScanTypesFixture() {
  return {
    version: 1,
    scanners: {
      semgrep: {
        scanType: 'sast',
        severityMap: {
          ERROR: 'high',
          WARNING: 'moderate',
          INFO: 'info',
        },
      },
      'yarn-audit': {
        scanType: 'sca',
        severityMap: {
          critical: 'critical',
          high: 'high',
          moderate: 'moderate',
          low: 'low',
        },
      },
      zap: {
        scanType: 'dast',
        severityMap: {
          High: 'high',
          Medium: 'moderate',
          Low: 'low',
          Informational: 'info',
        },
      },
    },
  };
}

function createSastBaselineFixture() {
  return {
    baselineDate: '2026-06-10',
    scanner: {
      name: 'semgrep',
      version: '1.163.0',
      configs: ['p/default'],
      include: ['src'],
      exclude: ['node_modules'],
      timeoutSeconds: 10,
      timeoutThreshold: 5,
      blockingSeverities: ['ERROR'],
    },
    scanCompleteness: {
      isComplete: true,
      errors: [],
      skipped: [],
      blockingErrors: [],
    },
    findings: [
      {
        signature: 'abc123',
        findingOccurrence: 1,
        checkId: 'javascript.lang.security.test-rule',
        path: 'src/example.js',
        start: { line: 10, col: 2 },
        end: { line: 10, col: 12 },
        severity: 'ERROR',
        message: 'Test finding',
        snippet: 'dangerousCall(userInput)',
        metadata: {
          category: 'security',
        },
      },
    ],
  };
}

function createSastDispositionsFixture() {
  return {
    items: [
      {
        signature: 'abc123',
        status: 'deferred',
        rationale: 'Needs later remediation.',
        owner: 'TTA Hub AppDev',
        reviewBy: '2026-09-30',
        ticket: 'TTAHUB-5243',
        approvedBy: null,
        approvedOn: null,
      },
    ],
  };
}

function createSastScanConfigFixture(overrides = {}) {
  return {
    semgrepVersion: '1.163.0',
    configs: ['p/default'],
    include: ['src'],
    exclude: ['node_modules'],
    timeoutSeconds: 10,
    timeoutThreshold: 5,
    blockingSeverities: ['ERROR'],
    ...overrides,
  };
}

function createAuditAdvisory({
  advisoryId = 111,
  ghsa = 'GHSA-test-1234',
  moduleName = 'qs',
  version = '6.15.1',
  severity = 'moderate',
  title = 'A test advisory',
  created = '2026-06-01T12:00:00.000Z',
  paths = ['express>qs'],
  findings = null,
} = {}) {
  return JSON.stringify({
    type: 'auditAdvisory',
    data: {
      advisory: {
        id: advisoryId,
        github_advisory_id: ghsa,
        module_name: moduleName,
        severity,
        title,
        created,
        patched_versions: '>=6.15.2',
        vulnerable_versions: '<=6.15.1',
        recommendation: 'Upgrade',
        cves: [],
        cwe: [],
        findings: findings || [
          {
            version,
            paths,
          },
        ],
      },
    },
  });
}

function createApprovalEvidenceFixture(overrides = {}) {
  return {
    system: 'jira',
    reference: 'comment-123456',
    url: 'https://jira.example.com/browse/TTAHUB-5243?focusedCommentId=123456',
    approverName: 'Jane Doe',
    approverRole: 'TTA Hub Tech Lead',
    approvedOn: '2026-06-17',
    decision: 'Approved after review.',
    ...overrides,
  };
}

describe('security-findings tooling', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-findings-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('counts business days without weekends', () => {
    expect(businessDaysSince('2026-06-17', '2026-06-17')).toBe(0);
    expect(businessDaysSince('2026-06-17', '2026-06-18')).toBe(1);
    expect(businessDaysSince('2026-06-19', '2026-06-22')).toBe(1);
  });

  it('derives operational dates in America/New_York', () => {
    expect(operationalDate(new Date('2026-06-18T02:00:00.000Z'))).toBe('2026-06-17');
  });

  it('creates SCA baselines by deduplicating advisory lines', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeFixtureFile(
      backendAuditPath,
      [
        createAuditAdvisory({
          ghsa: 'GHSA-q8mj-m7cp-5q26',
          moduleName: 'qs',
          version: '6.15.1',
          paths: ['express>qs'],
        }),
        createAuditAdvisory({
          ghsa: 'GHSA-q8mj-m7cp-5q26',
          moduleName: 'qs',
          version: '6.15.1',
          paths: ['email-templates>@ladjs/i18n>qs'],
        }),
      ].join('\n')
    );
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-fq5x-7292-2p5r',
        moduleName: 'react-draft-wysiwyg',
        version: '1.15.0',
        severity: 'low',
      })
    );

    const { backend, frontend } = createScaBaselines({
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      generatedAt: '2026-06-17T12:00:00.000Z',
      cwd: tempDir,
    });

    expect(backend.findings).toHaveLength(1);
    expect(backend.findings[0].id).toBe(
      buildScaFindingId('backend', 'GHSA-q8mj-m7cp-5q26', 'qs', '6.15.1')
    );
    expect(backend.findings[0].paths).toEqual(['email-templates>@ladjs/i18n>qs', 'express>qs']);
    expect(frontend.findings).toHaveLength(1);
    expect(frontend.findings[0].severity).toBe('low');
    expect(frontend.findings[0].firstDetected).toBe('2026-06-17');
  });

  it('keeps Yarn Audit paths scoped to the matching affected version', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeFixtureFile(
      backendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-multi-1234',
        moduleName: 'pkg',
        findings: [
          { version: '1.0.0', paths: ['root>pkg'] },
          { version: '2.0.0', paths: ['nested>pkg'] },
        ],
      })
    );

    const baseline = createScaBaselines({
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, backendAuditPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: 'security/dependencies/frontend-baseline.json',
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      generatedAt: '2026-06-17T12:00:00.000Z',
      cwd: tempDir,
    }).backend;

    const byId = Object.fromEntries(baseline.findings.map((finding) => [finding.id, finding]));
    expect(byId[buildScaFindingId('backend', 'GHSA-multi-1234', 'pkg', '1.0.0')].paths).toEqual([
      'root>pkg',
    ]);
    expect(byId[buildScaFindingId('backend', 'GHSA-multi-1234', 'pkg', '2.0.0')].paths).toEqual([
      'nested>pkg',
    ]);
  });

  it('seeds the common register and reports migration warnings instead of strict errors by default', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastDispositionsPath = path.join(tempDir, 'security/sast/dispositions.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(sastDispositionsPath, createSastDispositionsFixture());
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      baselineDate: '2026-06-17',
      scope: 'backend',
      scanner: { name: 'yarn-audit', sourceFile: 'yarn-audit-known-issues' },
      findings: [
        {
          id: buildScaFindingId('backend', 'GHSA-q8mj-m7cp-5q26', 'qs', '6.15.1'),
          scope: 'backend',
          scannerFindingId: 'GHSA-q8mj-m7cp-5q26',
          module: 'qs',
          affectedVersion: '6.15.1',
          title: 'A test advisory',
          sourceSeverity: 'moderate',
          severity: 'moderate',
          firstDetected: '2026-06-01',
          lastObserved: '2026-06-17',
          advisoryId: 111,
          advisoryUrl: 'https://github.com/advisories/GHSA-q8mj-m7cp-5q26',
          vulnerableVersions: '<=6.15.1',
          patchedVersions: '>=6.15.2',
          recommendation: 'Upgrade',
          cves: [],
          cwe: [],
          cvss: null,
          paths: ['express>qs'],
        },
      ],
    });
    writeJson(frontendBaselinePath, {
      baselineDate: '2026-06-17',
      scope: 'frontend',
      scanner: { name: 'yarn-audit', sourceFile: 'frontend/yarn-audit-known-issues' },
      findings: [],
    });
    writeJson(pendingPath, { items: {} });

    const register = createRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastDispositionsPath: path.relative(tempDir, sastDispositionsPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      generatedAt: '2026-06-17T12:00:00.000Z',
      cwd: tempDir,
    });

    expect(register.summary.total).toBe(2);
    expect(register.summary.byScanType).toEqual({ sast: 1, sca: 1 });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      strict: false,
      cwd: tempDir,
    });
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing approval evidence'),
        expect.stringContaining('missing closure target'),
      ])
    );
  });

  it('fails validation when a current SAST finding is missing from the register', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      scope: 'backend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      scope: 'frontend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {},
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('missing from the register')])
    );
  });

  it('fails non-migration deferred entries that are missing approval and closure metadata', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const currentId = buildScaFindingId('backend', 'GHSA-q8mj-m7cp-5q26', 'qs', '6.15.1');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, {
      ...createSastBaselineFixture(),
      findings: [],
    });
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      baselineDate: '2026-06-17',
      scope: 'backend',
      scanner: { name: 'yarn-audit', sourceFile: 'yarn-audit-known-issues' },
      findings: [
        {
          id: currentId,
          scannerFindingId: 'GHSA-q8mj-m7cp-5q26',
          sourceSeverity: 'moderate',
        },
      ],
    });
    writeJson(frontendBaselinePath, {
      baselineDate: '2026-06-17',
      scope: 'frontend',
      scanner: { name: 'yarn-audit', sourceFile: 'frontend/yarn-audit-known-issues' },
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'backend',
          scannerFindingId: 'GHSA-q8mj-m7cp-5q26',
          title: 'A test advisory',
          severity: 'moderate',
          sourceSeverity: 'moderate',
          firstDetected: '2026-06-17',
          lastObserved: '2026-06-17',
          disposition: 'deferred',
          justification: 'Needs later remediation.',
          owner: 'TTA Hub Tech Lead',
          ticket: 'TTAHUB-5243',
        },
      },
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing closure target'),
        expect.stringContaining('missing approval evidence'),
      ])
    );
  });

  it('fails validation when a current finding is marked resolved', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const currentId = 'SAST-SEMGRP-abc123';

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      scope: 'backend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      scope: 'frontend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sast',
          scanner: 'semgrep',
          scope: 'application',
          scannerFindingId: 'javascript.lang.security.test-rule',
          title: 'Test finding',
          severity: 'high',
          sourceSeverity: 'ERROR',
          firstDetected: '2026-06-10',
          lastObserved: '2026-06-10',
          disposition: 'resolved',
          justification: 'Fixed.',
          owner: 'TTA Hub AppDev',
          ticket: 'TTAHUB-5243',
          resolvedOn: '2026-06-11',
          resolutionEvidence: 'TTAHUB-5243',
        },
      },
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('marked resolved')])
    );
  });

  it('fails validation when current finding facts drift under the same stable id', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const currentId = 'SAST-SEMGRP-abc123';

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      baselineDate: '2026-06-17',
      scope: 'backend',
      scanner: { name: 'yarn-audit', sourceFile: 'yarn-audit-known-issues' },
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      baselineDate: '2026-06-17',
      scope: 'frontend',
      scanner: { name: 'yarn-audit', sourceFile: 'frontend/yarn-audit-known-issues' },
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sast',
          scanner: 'semgrep',
          scope: 'application',
          scannerFindingId: 'javascript.lang.security.old-rule',
          title: 'Test finding',
          severity: 'moderate',
          sourceSeverity: 'WARNING',
          firstDetected: '2026-06-10',
          lastObserved: '2026-06-10',
          disposition: 'deferred',
          justification: 'Approved temporary deferral.',
          owner: 'TTA Hub Tech Lead',
          ticket: 'TTAHUB-5243',
          closureTarget: '2026-09-30',
          approvalEvidence: createApprovalEvidenceFixture(),
        },
      },
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('scannerFindingId differs from the register'),
        expect.stringContaining('sourceSeverity differs from the register'),
      ])
    );
  });

  it('warns before due dates and fails after the grace period', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const warningId = 'SAST-SEMGRP-abc123';
    const overdueId = 'SAST-SEMGRP-absent';

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      scope: 'backend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      scope: 'frontend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        [warningId]: {
          id: warningId,
          scanType: 'sast',
          scanner: 'semgrep',
          scope: 'application',
          scannerFindingId: 'javascript.lang.security.test-rule',
          title: 'Test finding',
          severity: 'high',
          sourceSeverity: 'ERROR',
          firstDetected: '2026-06-10',
          lastObserved: '2026-06-10',
          disposition: 'deferred',
          justification: 'Needs later remediation.',
          owner: 'TTA Hub AppDev',
          ticket: 'TTAHUB-5243',
          closureTarget: '2026-06-25',
        },
        [overdueId]: {
          id: overdueId,
          scanType: 'sast',
          scanner: 'semgrep',
          scope: 'application',
          scannerFindingId: 'javascript.lang.security.absent-rule',
          title: 'Absent finding',
          severity: 'moderate',
          sourceSeverity: 'WARNING',
          firstDetected: '2026-05-01',
          lastObserved: '2026-05-01',
          disposition: 'deferred',
          justification: 'Needs later remediation.',
          owner: 'TTA Hub AppDev',
          ticket: 'TTAHUB-5243',
          closureTarget: '2026-06-01',
        },
      },
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    expect(validation.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('due in 8 calendar days')])
    );
    expect(validation.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('exceeding the 7-day grace period')])
    );
  });

  it('warns when Semgrep config differs from the SAST baseline metadata', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(
      sastScanConfigPath,
      createSastScanConfigFixture({ include: ['src', 'frontend/src'] })
    );
    writeJson(backendBaselinePath, {
      scope: 'backend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      scope: 'frontend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        'SAST-SEMGRP-abc123': {
          id: 'SAST-SEMGRP-abc123',
          scanType: 'sast',
          scanner: 'semgrep',
          scope: 'application',
          scannerFindingId: 'javascript.lang.security.test-rule',
          title: 'Test finding',
          severity: 'high',
          sourceSeverity: 'ERROR',
          firstDetected: '2026-06-10',
          lastObserved: '2026-06-10',
          disposition: 'deferred',
          justification: 'Needs later remediation.',
          owner: 'TTA Hub AppDev',
          ticket: 'TTAHUB-5243',
          closureTarget: '2026-09-30',
        },
      },
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Semgrep include differs')])
    );
  });

  it('keeps partial legacy SAST approvals as non-strict migration warnings', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const sastDispositionsPath = path.join(tempDir, 'security/sast/dispositions.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, createSastBaselineFixture());
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(sastDispositionsPath, {
      items: [
        {
          ...createSastDispositionsFixture().items[0],
          approvalEvidence: {
            system: 'jira',
            reference: 'comment-123456',
            approverName: 'Jane Doe',
            approverRole: 'TTA Hub Tech Lead',
            approvedOn: '2026-06-17',
            decision: 'Approved deferral.',
          },
        },
      ],
    });
    writeJson(backendBaselinePath, {
      scope: 'backend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      scope: 'frontend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });

    const register = createRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastDispositionsPath: path.relative(tempDir, sastDispositionsPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      generatedAt: '2026-06-17T12:00:00.000Z',
      cwd: tempDir,
    });

    const entry = register.items['SAST-SEMGRP-abc123'];
    expect(entry.migration.complete).toBe(false);
    expect(entry.approvalEvidence).toEqual(
      expect.objectContaining({
        reference: 'comment-123456',
      })
    );
    expect(entry.migration.gaps).toEqual(expect.arrayContaining(['missing-approval-evidence-url']));

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('missing approval evidence url')])
    );
  });

  it('fails validation when Semgrep baseline completeness metadata is missing', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const sastBaselinePath = path.join(tempDir, 'security/sast/baseline.json');
    const sastScanConfigPath = path.join(tempDir, 'security/sast/scan-config.json');
    const backendBaselinePath = path.join(tempDir, 'security/dependencies/backend-baseline.json');
    const frontendBaselinePath = path.join(tempDir, 'security/dependencies/frontend-baseline.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const baselineWithoutCompleteness = createSastBaselineFixture();
    delete baselineWithoutCompleteness.scanCompleteness;

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(sastBaselinePath, baselineWithoutCompleteness);
    writeJson(sastScanConfigPath, createSastScanConfigFixture());
    writeJson(backendBaselinePath, {
      scope: 'backend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(frontendBaselinePath, {
      scope: 'frontend',
      scanner: { name: 'yarn-audit' },
      baselineDate: '2026-06-17',
      findings: [],
    });
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        'SAST-SEMGRP-abc123': {
          id: 'SAST-SEMGRP-abc123',
          scanType: 'sast',
          scanner: 'semgrep',
          scope: 'application',
          scannerFindingId: 'javascript.lang.security.test-rule',
          title: 'Test finding',
          severity: 'high',
          sourceSeverity: 'ERROR',
          firstDetected: '2026-06-10',
          lastObserved: '2026-06-10',
          disposition: 'deferred',
          justification: 'Needs later remediation.',
          owner: 'TTA Hub AppDev',
          ticket: 'TTAHUB-5243',
          closureTarget: '2026-09-30',
        },
      },
    });

    const validation = validateRegister({
      registerPath: path.relative(tempDir, registerPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      sastBaselinePath: path.relative(tempDir, sastBaselinePath),
      sastScanConfigPath: path.relative(tempDir, sastScanConfigPath),
      backendBaselinePath: path.relative(tempDir, backendBaselinePath),
      frontendBaselinePath: path.relative(tempDir, frontendBaselinePath),
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('does not record scan completeness metadata'),
      ])
    );
  });

  it('preserves firstSeen and escalates pending SCA observations after the SLA', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {},
    });
    writeJson(pendingPath, {
      items: {
        [buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6')]: {
          id: buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6'),
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-09',
          lastObserved: '2026-06-09',
          escalationState: 'warning',
        },
      },
    });
    writeFixtureFile(
      backendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-q8mj-m7cp-5q26',
        moduleName: 'qs',
        version: '6.15.1',
        severity: 'moderate',
      })
    );
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-wf6x-7x77-mvgw',
        moduleName: 'immutable',
        version: '3.7.6',
        severity: 'high',
      })
    );

    const result = updatePendingObservations({
      registerPath: path.relative(tempDir, registerPath),
      pendingPath: path.relative(tempDir, pendingPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    const immutableId = buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6');
    expect(result.store.items[immutableId].firstSeen).toBe('2026-06-09');
    expect(result.store.items[immutableId].lastObserved).toBe('2026-06-17');
    expect(result.store.items[immutableId].escalationState).toBe('escalated');
    expect(result.failures).toEqual(expect.arrayContaining([expect.stringContaining(immutableId)]));
  });

  it('fails pending validation when observations do not match live unregistered advisories', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');
    const staleId = buildScaFindingId('frontend', 'GHSA-stale-1234', 'stale-package', '1.0.0');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {
        [buildScaFindingId('backend', 'GHSA-q8mj-m7cp-5q26', 'qs', '6.15.1')]: {
          id: buildScaFindingId('backend', 'GHSA-q8mj-m7cp-5q26', 'qs', '6.15.1'),
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'backend',
          scannerFindingId: 'GHSA-q8mj-m7cp-5q26',
          title: 'A test advisory',
          severity: 'moderate',
          sourceSeverity: 'moderate',
          firstDetected: '2026-06-17',
          lastObserved: '2026-06-17',
          disposition: 'deferred',
          justification: 'Tracked in register.',
          owner: 'TTA Hub AppDev',
          ticket: 'TTAHUB-5243',
          closureTarget: '2026-09-30',
        },
      },
    });
    writeJson(pendingPath, {
      items: {
        [staleId]: {
          id: staleId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-stale-1234',
          module: 'stale-package',
          affectedVersion: '1.0.0',
          sourceSeverity: 'low',
          severity: 'low',
          firstSeen: '2026-06-10',
          lastObserved: '2026-06-10',
          escalationState: 'warning',
        },
      },
    });
    writeFixtureFile(
      backendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-q8mj-m7cp-5q26',
        moduleName: 'qs',
        version: '6.15.1',
        severity: 'moderate',
      })
    );
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-wf6x-7x77-mvgw',
        moduleName: 'immutable',
        version: '3.7.6',
        severity: 'high',
      })
    );

    const validation = validatePendingObservations({
      pendingPath: path.relative(tempDir, pendingPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      registerPath: path.relative(tempDir, registerPath),
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing current unregistered advisory'),
        expect.stringContaining('is stale'),
      ])
    );
  });

  it('fails pending validation when machine-managed fields drift from the current advisory state', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');
    const currentId = buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {},
    });
    writeJson(pendingPath, {
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-09',
          lastObserved: '2026-06-09',
          escalationState: 'warning',
        },
      },
    });
    writeFixtureFile(backendAuditPath, '');
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-wf6x-7x77-mvgw',
        moduleName: 'immutable',
        version: '3.7.6',
        severity: 'high',
      })
    );

    const validation = validatePendingObservations({
      pendingPath: path.relative(tempDir, pendingPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      registerPath: path.relative(tempDir, registerPath),
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('lastObserved does not match the current expected value'),
        expect.stringContaining('escalationState does not match the current expected value'),
      ])
    );
  });

  it('fails pending validation when firstSeen is reset against a trusted prior snapshot', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const previousPendingPath = path.join(
      tempDir,
      'security/dependencies/pending-observations.previous.json'
    );
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');
    const currentId = buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {},
    });
    writeJson(previousPendingPath, {
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-09',
          lastObserved: '2026-06-16',
          escalationState: 'warning',
        },
      },
    });
    writeJson(pendingPath, {
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-17',
          lastObserved: '2026-06-17',
          escalationState: 'warning',
        },
      },
    });
    writeFixtureFile(backendAuditPath, '');
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-wf6x-7x77-mvgw',
        moduleName: 'immutable',
        version: '3.7.6',
        severity: 'high',
      })
    );

    const validation = validatePendingObservations({
      pendingPath: path.relative(tempDir, pendingPath),
      previousPendingPath: path.relative(tempDir, previousPendingPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      registerPath: path.relative(tempDir, registerPath),
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('firstSeen does not match the current expected value'),
      ])
    );
  });

  it('preserves trusted firstSeen when syncing pending observations', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const previousPendingPath = path.join(
      tempDir,
      'security/dependencies/pending-observations.previous.json'
    );
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');
    const currentId = buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {},
    });
    writeJson(previousPendingPath, {
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-09',
          lastObserved: '2026-06-16',
          escalationState: 'warning',
        },
      },
    });
    writeJson(pendingPath, {
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-17',
          lastObserved: '2026-06-17',
          escalationState: 'warning',
        },
      },
    });
    writeFixtureFile(backendAuditPath, '');
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-wf6x-7x77-mvgw',
        moduleName: 'immutable',
        version: '3.7.6',
        severity: 'high',
      })
    );

    const result = updatePendingObservations({
      registerPath: path.relative(tempDir, registerPath),
      pendingPath: path.relative(tempDir, pendingPath),
      previousPendingPath: path.relative(tempDir, previousPendingPath),
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('exceeded the 5-business-day SLA for high advisories'),
      ])
    );
    expect(result.store.items[currentId].firstSeen).toBe('2026-06-09');
    expect(result.store.items[currentId].escalationState).toBe('escalated');
  });

  it('bootstraps missing previous git refs from the current committed pending store', () => {
    const scanTypesPath = path.join(tempDir, 'security/findings/scan-types.json');
    const registerPath = path.join(tempDir, 'security/findings/register.json');
    const pendingPath = path.join(tempDir, 'security/dependencies/pending-observations.json');
    const backendAuditPath = path.join(tempDir, 'yarn-audit-known-issues');
    const frontendAuditPath = path.join(tempDir, 'frontend/yarn-audit-known-issues');
    const currentId = buildScaFindingId('frontend', 'GHSA-wf6x-7x77-mvgw', 'immutable', '3.7.6');

    writeJson(scanTypesPath, createScanTypesFixture());
    writeJson(registerPath, {
      version: 1,
      generatedAt: '2026-06-17T12:00:00.000Z',
      items: {},
    });
    writeJson(pendingPath, {
      items: {
        [currentId]: {
          id: currentId,
          scanType: 'sca',
          scanner: 'yarn-audit',
          scope: 'frontend',
          scannerFindingId: 'GHSA-wf6x-7x77-mvgw',
          module: 'immutable',
          affectedVersion: '3.7.6',
          sourceSeverity: 'high',
          severity: 'high',
          firstSeen: '2026-06-09',
          lastObserved: '2026-06-16',
          escalationState: 'warning',
        },
      },
    });
    writeFixtureFile(backendAuditPath, '');
    writeFixtureFile(
      frontendAuditPath,
      createAuditAdvisory({
        ghsa: 'GHSA-wf6x-7x77-mvgw',
        moduleName: 'immutable',
        version: '3.7.6',
        severity: 'high',
      })
    );
    initGitRepo(tempDir);

    const result = updatePendingObservations({
      registerPath: path.relative(tempDir, registerPath),
      pendingPath: path.relative(tempDir, pendingPath),
      previousPendingRef: 'HEAD~1',
      scanTypesPath: path.relative(tempDir, scanTypesPath),
      backendAuditPath: path.relative(tempDir, backendAuditPath),
      frontendAuditPath: path.relative(tempDir, frontendAuditPath),
      observedOn: '2026-06-17',
      cwd: tempDir,
    });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('exceeded the 5-business-day SLA for high advisories'),
      ])
    );
    expect(result.failures).toEqual(
      expect.not.arrayContaining([expect.stringContaining('invalid object name')])
    );
    expect(result.store.items[currentId].firstSeen).toBe('2026-06-09');
    expect(result.store.items[currentId].escalationState).toBe('escalated');
  });
});
