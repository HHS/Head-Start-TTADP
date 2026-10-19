const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  checkRange,
  evaluate,
  findForbiddenPaths,
  findHsesExtractFiles,
  findStaffEmailsInAddedLines,
  isDataFile,
  parseNameStatus,
  parseNumstat,
} = require('./data-file-guard');

const nul = (...parts) => `${parts.join('\0')}\0`;

describe('data file guard', () => {
  describe('isDataFile', () => {
    it.each(['a.xml', 'a.csv', 'a.tsv', 'a.XML', 'a.CSV', 'a.Tsv', 'dir/staff export.csv'])(
      'treats %s as a data file',
      (name) => {
        expect(isDataFile(name)).toBe(true);
      }
    );

    it.each(['a.js', 'a.csv.bak', 'csv', 'a.xmll'])('does not treat %s as a data file', (name) => {
      expect(isDataFile(name)).toBe(false);
    });
  });

  describe('parseNameStatus', () => {
    it('parses NUL delimited git name-status output', () => {
      expect(parseNameStatus(nul('A', 'hses/grant_award.xml', 'M', 'src/app.js'))).toEqual([
        { status: 'A', path: 'hses/grant_award.xml' },
        { status: 'M', path: 'src/app.js' },
      ]);
    });

    it('keeps spaces and non ASCII characters in paths verbatim', () => {
      expect(parseNameStatus(nul('A', 'data/staff export.csv', 'A', 'hses/café.xml'))).toEqual([
        { status: 'A', path: 'data/staff export.csv' },
        { status: 'A', path: 'hses/café.xml' },
      ]);
    });

    it('returns nothing for empty output', () => {
      expect(parseNameStatus('')).toEqual([]);
    });
  });

  describe('parseNumstat', () => {
    it('parses NUL delimited git numstat output', () => {
      expect(parseNumstat(nul('12\t3\ttemp/agency.xml'))).toEqual([
        { path: 'temp/agency.xml', addedLines: 12, binary: false },
      ]);
    });

    it('marks binary files, which git reports with "-" instead of a line count', () => {
      expect(parseNumstat(nul('-\t-\tsome/file.zip'))).toEqual([
        { path: 'some/file.zip', addedLines: 0, binary: true },
      ]);
    });

    it('keeps spaces in paths', () => {
      expect(parseNumstat(nul('4\t0\tdata/staff export.csv'))).toEqual([
        { path: 'data/staff export.csv', addedLines: 4, binary: false },
      ]);
    });
  });

  describe('findForbiddenPaths', () => {
    it('flags files added under hses/', () => {
      const findings = findForbiddenPaths([{ status: 'A', path: 'hses/grant_award.xml' }]);
      expect(findings).toHaveLength(1);
      expect(findings[0].path).toBe('hses/grant_award.xml');
    });

    it('flags non ASCII file names under hses/', () => {
      expect(findForbiddenPaths([{ status: 'A', path: 'hses/café.xml' }])).toHaveLength(1);
    });

    it('flags hses.zip at any depth', () => {
      expect(findForbiddenPaths([{ status: 'A', path: 'hses.zip' }])).toHaveLength(1);
      expect(findForbiddenPaths([{ status: 'M', path: 'some/dir/hses.zip' }])).toHaveLength(1);
    });

    it.each([
      'HSES.ZIP',
      'hses.ZIP',
      'Hses.Zip',
      'some/dir/HSES.ZIP',
      'HSES/grant_award.xml',
      'Hses/x.csv',
    ])('flags %s regardless of letter case', (name) => {
      expect(findForbiddenPaths([{ status: 'A', path: name }])).toHaveLength(1);
    });

    it('allows deleting forbidden paths', () => {
      expect(findForbiddenPaths([{ status: 'D', path: 'hses/grant_award.xml' }])).toEqual([]);
    });

    it('allows ordinary files', () => {
      expect(findForbiddenPaths([{ status: 'A', path: 'temp/grant_award.xml' }])).toEqual([]);
    });
  });

  describe('findHsesExtractFiles', () => {
    const names = [
      'agency.xml',
      'grant_agency.xml',
      'grant_award.xml',
      'grant_award_replacement.xml',
      'grant_program.xml',
    ];

    it.each(names)('flags %s outside temp/', (name) => {
      const findings = findHsesExtractFiles([{ status: 'A', path: `data/${name}` }], []);
      expect(findings).toHaveLength(1);
      expect(findings[0].path).toBe(`data/${name}`);
    });

    it.each(['data/GRANT_AWARD.XML', 'data/Grant_Program.xml', 'Agency.XML'])(
      'flags %s regardless of letter case',
      (name) => {
        expect(findHsesExtractFiles([{ status: 'A', path: name }], [])).toHaveLength(1);
      }
    );

    it('flags a binary file with an extract name even in temp/', () => {
      const changes = [{ status: 'A', path: 'temp/grant_award.xml' }];
      const numstat = [{ path: 'temp/grant_award.xml', addedLines: 0, binary: true }];
      const findings = findHsesExtractFiles(changes, numstat);
      expect(findings).toHaveLength(1);
      expect(findings[0].reason).toContain('Binary');
    });

    it('flags a file at the repo root', () => {
      expect(findHsesExtractFiles([{ status: 'A', path: 'grant_program.xml' }], [])).toHaveLength(
        1
      );
    });

    it.each(names)('allows a small fixture %s in temp/', (name) => {
      const changes = [{ status: 'M', path: `temp/${name}` }];
      const numstat = [{ path: `temp/${name}`, addedLines: 40 }];
      expect(findHsesExtractFiles(changes, numstat)).toEqual([]);
    });

    it('flags a fixture in temp/ that is too large to be a fixture', () => {
      const changes = [{ status: 'A', path: 'temp/grant_award.xml' }];
      const numstat = [{ path: 'temp/grant_award.xml', addedLines: 5000 }];
      const findings = findHsesExtractFiles(changes, numstat);
      expect(findings).toHaveLength(1);
      expect(findings[0].reason).toContain('5000');
    });

    it('allows deleting these files', () => {
      expect(findHsesExtractFiles([{ status: 'D', path: 'data/agency.xml' }], [])).toEqual([]);
    });

    it('does not double report paths already forbidden', () => {
      expect(findHsesExtractFiles([{ status: 'A', path: 'hses/grant_award.xml' }], [])).toEqual([]);
    });

    it('ignores unrelated xml files', () => {
      expect(findHsesExtractFiles([{ status: 'A', path: 'data/other.xml' }], [])).toEqual([]);
    });
  });

  describe('findStaffEmailsInAddedLines', () => {
    const diff = [
      '@@ -10,0 +11,2 @@',
      '+  <grant_number>01CH000001</grant_number>',
      '+  <program_specialist_email>someone@acf.hhs.gov</program_specialist_email>',
    ].join('\n');

    it('flags staff emails in added lines with the right line number', () => {
      const findings = findStaffEmailsInAddedLines('data/sample.xml', diff);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ path: 'data/sample.xml', line: 12 });
    });

    it('uses the path it is given, including spaces', () => {
      const findings = findStaffEmailsInAddedLines('data/staff export.csv', diff);
      expect(findings[0].path).toBe('data/staff export.csv');
    });

    it('does not include the matched email in findings', () => {
      expect(JSON.stringify(findStaffEmailsInAddedLines('a.xml', diff))).not.toContain('someone@');
    });

    it('ignores removed lines', () => {
      const removed = diff.replace(
        /^\+ {2}<program_specialist_email>/m,
        '-  <program_specialist_email>'
      );
      expect(findStaffEmailsInAddedLines('a.xml', removed)).toEqual([]);
    });

    it('ignores patch header text before the first hunk', () => {
      const withHeader = ['+++ b/staff@acf.hhs.gov.csv', diff.split('\n')[0]].join('\n');
      expect(findStaffEmailsInAddedLines('a.csv', withHeader)).toEqual([]);
    });

    it('matches case insensitively', () => {
      const upper = diff.replace('someone@acf.hhs.gov', 'Someone@ACF.HHS.GOV');
      expect(findStaffEmailsInAddedLines('a.xml', upper)).toHaveLength(1);
    });

    it('scans an added line that itself starts with plus signs', () => {
      const plusPlus = ['@@ -0,0 +1 @@', '++ pat@acf.hhs.gov'].join('\n');
      expect(findStaffEmailsInAddedLines('a.csv', plusPlus)).toHaveLength(1);
    });
  });

  describe('evaluate', () => {
    it('passes a clean change', () => {
      const result = evaluate({ nameStatusOutput: nul('M', 'src/app.js') });
      expect(result.valid).toBe(true);
    });

    it('fails on a forbidden path and lists it', () => {
      const result = evaluate({ nameStatusOutput: nul('A', 'hses/grant_award.xml') });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('hses/grant_award.xml');
    });

    it('fails on an HSES extract file name outside temp/', () => {
      const result = evaluate({
        nameStatusOutput: nul('A', 'data/agency.xml'),
        numstatOutput: nul('10\t0\tdata/agency.xml'),
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('data/agency.xml');
    });

    it('passes a small fixture update in temp/', () => {
      const result = evaluate({
        nameStatusOutput: nul('M', 'temp/grant_award.xml'),
        numstatOutput: nul('6\t2\ttemp/grant_award.xml'),
      });
      expect(result.valid).toBe(true);
    });

    it('fails on staff emails in a data file without printing them', () => {
      const result = evaluate({
        nameStatusOutput: nul('A', 'data/sample.csv'),
        fileDiffs: [
          {
            path: 'data/sample.csv',
            diffText: ['@@ -0,0 +1,2 @@', '+name,email', '+Pat,pat@acf.hhs.gov'].join('\n'),
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('data/sample.csv:2');
      expect(result.message).not.toContain('pat@');
    });
  });

  // These run the real git commands the CI job runs, in a throwaway repository, so they cover
  // how git actually prints names (spaces, quoting of non ASCII) and selects files.
  describe('checkRange against a real git repository', () => {
    const emailCsv = 'name,email\nPat,pat@acf.hhs.gov\n';
    let repoDir;
    let baseSha;

    const git = (...args) =>
      execFileSync(
        'git',
        [
          '-c',
          'user.name=test',
          '-c',
          'user.email=test@example.com',
          '-c',
          'commit.gpgsign=false',
          ...args,
        ],
        { cwd: repoDir, encoding: 'utf8' }
      ).trim();

    const writeFile = (relativePath, contents) => {
      const fullPath = path.join(repoDir, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, contents);
    };

    const commitAll = (message) => {
      git('add', '-f', '-A');
      git('commit', '-q', '-m', message);
    };

    beforeEach(() => {
      repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-file-guard-'));
      git('init', '-q');
      writeFile('README.md', 'base\n');
      commitAll('base');
      baseSha = git('rev-parse', 'HEAD');
    });

    afterEach(() => {
      fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('passes a harmless change', () => {
      writeFile('data/ok.csv', 'name,email\nPat,pat@example.com\n');
      commitAll('ok');
      expect(checkRange({ baseRef: baseSha, cwd: repoDir }).valid).toBe(true);
    });

    it('flags a staff email in a file name with spaces', () => {
      writeFile('data/staff export.csv', emailCsv);
      commitAll('spaces');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings).toEqual([
        expect.objectContaining({ path: 'data/staff export.csv', line: 2 }),
      ]);
    });

    it('flags a staff email in a non ASCII file name', () => {
      writeFile('data/café staff.csv', emailCsv);
      commitAll('unicode');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe('data/café staff.csv');
    });

    it('flags non ASCII file names under hses/', () => {
      writeFile('hses/café.xml', '<a/>\n');
      commitAll('hses unicode');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe('hses/café.xml');
    });

    it.each(['sample.CSV', 'sample.XML', 'sample.TSV', 'sample.Csv'])(
      'flags a staff email in %s',
      (name) => {
        writeFile(`data/${name}`, emailCsv);
        commitAll('uppercase');
        const result = checkRange({ baseRef: baseSha, cwd: repoDir });
        expect(result.valid).toBe(false);
        expect(result.findings[0].path).toBe(`data/${name}`);
      }
    );

    it('flags a staff email in a file name with a quote character', () => {
      writeFile('data/say "hi".csv', emailCsv);
      commitAll('quote');
      expect(checkRange({ baseRef: baseSha, cwd: repoDir }).valid).toBe(false);
    });

    it.each(['HSES.ZIP', 'hses.ZIP', 'sub/Hses.Zip'])('flags %s in a real commit', (name) => {
      writeFile(name, 'not really a zip\n');
      commitAll('zip case');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe(name);
    });

    it('flags an uppercase hses directory in a real commit', () => {
      writeFile('HSES/notes.txt', 'x\n');
      commitAll('hses dir case');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe('HSES/notes.txt');
    });

    it('flags a binary file named like an extract in temp/', () => {
      fs.mkdirSync(path.join(repoDir, 'temp'), { recursive: true });
      fs.writeFileSync(
        path.join(repoDir, 'temp/grant_award.xml'),
        Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0xff, 0x00, 0x01])
      );
      commitAll('binary extract name');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0]).toMatchObject({ path: 'temp/grant_award.xml' });
      expect(result.findings[0].reason).toContain('Binary');
    });

    it('flags an HSES extract file name outside temp/', () => {
      writeFile('data/grant_program.xml', '<a/>\n');
      commitAll('extract name');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe('data/grant_program.xml');
    });

    it('allows a small fixture in temp/ and flags an oversized one', () => {
      writeFile('temp/agency.xml', '<agencies/>\n');
      commitAll('fixture');
      expect(checkRange({ baseRef: baseSha, cwd: repoDir }).valid).toBe(true);

      writeFile('temp/grant_award.xml', `${'<x/>\n'.repeat(1500)}`);
      commitAll('too big');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe('temp/grant_award.xml');
    });

    it('allows deleting a forbidden file', () => {
      writeFile('hses/grant_award.xml', '<a/>\n');
      commitAll('add');
      const withFile = git('rev-parse', 'HEAD');
      git('rm', '-q', 'hses/grant_award.xml');
      git('commit', '-q', '-m', 'remove');
      expect(checkRange({ baseRef: withFile, cwd: repoDir }).valid).toBe(true);
    });
  });
});
