const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { indexAdvisories, main, runAudit } = require('./run-yarn-audit');
const {
  advisoryKey,
  extractGhsa,
  formatDependent,
  parseYarnNpmAudit,
} = require('./security-findings/yarn-npm-audit');

function auditLine({
  moduleName = 'basic-ftp',
  id = 1240853,
  ghsa = 'GHSA-c475-qrg2-pj4r',
  versions = ['5.3.1'],
  dependents = ['get-uri@npm:8.0.1'],
  severity = 'high',
} = {}) {
  return JSON.stringify({
    value: moduleName,
    children: {
      ID: id,
      Issue: `${moduleName} advisory`,
      URL: ghsa ? `https://github.com/advisories/${ghsa}` : undefined,
      Severity: severity,
      'Vulnerable Versions': '<=6.2.0',
      'Tree Versions': versions,
      Dependents: dependents,
    },
  });
}

describe('yarn-npm-audit parser', () => {
  it('normalizes advisory rows and skips deprecations and blank lines', () => {
    const text = [
      auditLine({ versions: ['5.3.1', '5.3.1'], dependents: ['b@npm:1.0.0', 'a@npm:2.0.0'] }),
      '',
      JSON.stringify({
        value: 'cron',
        children: { ID: 'cron (deprecation)', Issue: 'Deprecated', Severity: 'moderate' },
      }),
    ].join('\n');

    expect(parseYarnNpmAudit(text)).toEqual([
      {
        module: 'basic-ftp',
        advisoryId: 1240853,
        ghsa: 'GHSA-c475-qrg2-pj4r',
        url: 'https://github.com/advisories/GHSA-c475-qrg2-pj4r',
        title: 'basic-ftp advisory',
        severity: 'high',
        vulnerableVersions: '<=6.2.0',
        versions: ['5.3.1'],
        dependents: ['a@2.0.0', 'b@1.0.0'],
      },
    ]);
  });

  it('throws on malformed JSON instead of treating the report as empty', () => {
    expect(() => parseYarnNpmAudit('{"value":')).toThrow(/line 1/);
  });

  it.each([null, [], [''], [' '], [42], ['5.3.1', null]])(
    'rejects advisory rows with invalid installed versions: %j',
    (versions) => {
      expect(() => parseYarnNpmAudit(auditLine({ versions }))).toThrow(/Tree Versions/);
    }
  );

  it('rejects advisory rows with missing installed versions', () => {
    const row = JSON.parse(auditLine());
    delete row.children['Tree Versions'];
    expect(() => parseYarnNpmAudit(JSON.stringify(row))).toThrow(/Tree Versions/);
  });

  it('formats Yarn locators as readable dependents', () => {
    expect(formatDependent('nise@npm:5.1.9')).toBe('nise@5.1.9');
    expect(formatDependent('@otel/x@virtual:abc#npm:0.201.1')).toBe('@otel/x@0.201.1');
    expect(formatDependent('head-start-ttadp@workspace:.')).toBe('head-start-ttadp');
  });

  it('builds keys from the GHSA id, falling back to the npm advisory id', () => {
    expect(extractGhsa('https://github.com/advisories/GHSA-c475-qrg2-pj4r')).toBe(
      'GHSA-c475-qrg2-pj4r'
    );
    const [withGhsa] = parseYarnNpmAudit(auditLine());
    const [withoutGhsa] = parseYarnNpmAudit(auditLine({ ghsa: null, id: 42 }));
    expect(advisoryKey(withGhsa, '5.3.1')).toBe('GHSA-c475-qrg2-pj4r|basic-ftp@5.3.1');
    expect(advisoryKey(withoutGhsa, '5.3.1')).toBe('NPM-42|basic-ftp@5.3.1');
  });
});

describe('run-yarn-audit', () => {
  let tempDir;
  let issuesFile;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-yarn-audit-'));
    issuesFile = path.join(tempDir, 'yarn-audit-known-issues');
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'info').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const spawnWith =
    (stdout, status = stdout ? 1 : 0) =>
      () => ({ status, stdout, stderr: '' });

  it('passes when the audit reports nothing', () => {
    expect(main({ spawn: spawnWith(''), issuesFile })).toBe(0);
    expect(fs.readFileSync(issuesFile, 'utf8')).toBe('');
  });

  it('fails on advisories missing from the known-issues file', () => {
    fs.writeFileSync(issuesFile, '');
    expect(main({ spawn: spawnWith(auditLine()), issuesFile })).toBe(1);
  });

  it('passes when every advisory is already known', () => {
    fs.writeFileSync(issuesFile, `${auditLine()}\n`);
    expect(main({ spawn: spawnWith(auditLine()), issuesFile })).toBe(0);
  });

  it('fails on a new advisory for an already-known package version', () => {
    fs.writeFileSync(issuesFile, `${auditLine()}\n`);
    const current = [auditLine(), auditLine({ ghsa: 'GHSA-aaaa-bbbb-cccc', id: 9 })].join('\n');
    expect(main({ spawn: spawnWith(current), issuesFile })).toBe(1);
  });

  it('throws when yarn exits non-zero without advisory output', () => {
    const spawn = () => ({ status: 1, stdout: '', stderr: 'YN0035: request failed' });
    expect(() => runAudit(spawn)).toThrow(/exited with status 1/);
  });

  it('throws when yarn cannot be started', () => {
    const spawn = () => ({ error: new Error('ENOENT') });
    expect(() => runAudit(spawn)).toThrow(/ENOENT/);
  });

  it.each([
    { status: null, signal: 'SIGTERM' },
    { status: 2, signal: null },
  ])('rejects incomplete audits even with known advisories: %j', (result) => {
    fs.writeFileSync(issuesFile, `${auditLine()}\n`);
    const spawn = () => ({ ...result, stdout: auditLine(), stderr: '' });
    expect(() => main({ spawn, issuesFile })).toThrow(/did not complete/);
  });

  it('indexes one entry per advisory and installed version', () => {
    const keys = [
      ...indexAdvisories(parseYarnNpmAudit(auditLine({ versions: ['1.0.0', '2.0.0'] }))).keys(),
    ];
    expect(keys).toEqual([
      'GHSA-c475-qrg2-pj4r|basic-ftp@1.0.0',
      'GHSA-c475-qrg2-pj4r|basic-ftp@2.0.0',
    ]);
  });
});
