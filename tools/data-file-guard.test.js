const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const util = require('node:util');
const {
  GuardError,
  MAX_FIXTURE_BYTES,
  MAX_FIXTURE_LINES,
  checkRange,
  evaluate,
  findBinaryDataFiles,
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

    it('flags a file at the repo root', () => {
      expect(findHsesExtractFiles([{ status: 'A', path: 'grant_program.xml' }], [])).toHaveLength(
        1
      );
    });

    it.each(names)('allows a small fixture %s in temp/', (name) => {
      const changes = [{ status: 'M', path: `temp/${name}` }];
      const stats = [{ path: `temp/${name}`, bytes: 5000, lines: 40 }];
      expect(findHsesExtractFiles(changes, stats)).toEqual([]);
    });

    it('allows a fixture exactly at the limits', () => {
      const changes = [{ status: 'M', path: 'temp/agency.xml' }];
      const stats = [
        { path: 'temp/agency.xml', bytes: MAX_FIXTURE_BYTES, lines: MAX_FIXTURE_LINES },
      ];
      expect(findHsesExtractFiles(changes, stats)).toEqual([]);
    });

    it('flags a fixture in temp/ with too many lines', () => {
      const changes = [{ status: 'A', path: 'temp/grant_award.xml' }];
      const stats = [{ path: 'temp/grant_award.xml', bytes: 50000, lines: 5000 }];
      const findings = findHsesExtractFiles(changes, stats);
      expect(findings).toHaveLength(1);
      expect(findings[0].reason).toContain('5000 lines');
    });

    it('flags a fixture in temp/ that is too many bytes even on a single line', () => {
      const changes = [{ status: 'M', path: 'temp/agency.xml' }];
      const stats = [{ path: 'temp/agency.xml', bytes: 200000, lines: null }];
      const findings = findHsesExtractFiles(changes, stats);
      expect(findings).toHaveLength(1);
      expect(findings[0].reason).toContain('200000 bytes');
    });

    it('reports a file once when it is over both limits', () => {
      const changes = [{ status: 'M', path: 'temp/agency.xml' }];
      const stats = [{ path: 'temp/agency.xml', bytes: 900000, lines: 20000 }];
      expect(findHsesExtractFiles(changes, stats)).toHaveLength(1);
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

  describe('findBinaryDataFiles', () => {
    const binaryRow = (path) => ({ path, addedLines: 0, binary: true });

    it.each(['data/staff.tsv', 'data/staff.CSV', 'temp/grant_award.xml', 'a b/c.xml'])(
      'flags binary data file %s',
      (name) => {
        const findings = findBinaryDataFiles([{ status: 'A', path: name }], [binaryRow(name)]);
        expect(findings).toHaveLength(1);
        expect(findings[0].reason).toContain('Binary');
      }
    );

    it('ignores binary files that are not data files', () => {
      const changes = [{ status: 'A', path: 'img/logo.png' }];
      expect(findBinaryDataFiles(changes, [binaryRow('img/logo.png')])).toEqual([]);
    });

    it('ignores text data files', () => {
      const changes = [{ status: 'A', path: 'data/ok.csv' }];
      const rows = [{ path: 'data/ok.csv', addedLines: 3, binary: false }];
      expect(findBinaryDataFiles(changes, rows)).toEqual([]);
    });

    it('allows deleting a binary data file', () => {
      const changes = [{ status: 'D', path: 'data/staff.tsv' }];
      expect(findBinaryDataFiles(changes, [binaryRow('data/staff.tsv')])).toEqual([]);
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

    it('flags a very large fixture on a single line, which adds only one line', () => {
      writeFile('temp/agency.xml', `<a>${'x'.repeat(MAX_FIXTURE_BYTES * 2)}</a>`);
      commitAll('one long line');
      const result = checkRange({ baseRef: baseSha, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].path).toBe('temp/agency.xml');
      expect(result.findings[0].reason).toContain('bytes');
    });

    it('flags a fixture that grows past the limit across several small changes', () => {
      writeFile('temp/agency.xml', '<x/>\n'.repeat(MAX_FIXTURE_LINES - 100));
      commitAll('fixture just under the limit');
      const afterFirst = git('rev-parse', 'HEAD');
      expect(checkRange({ baseRef: baseSha, cwd: repoDir }).valid).toBe(true);

      writeFile('temp/agency.xml', '<x/>\n'.repeat(MAX_FIXTURE_LINES + 100));
      commitAll('small change that crosses the limit');
      // This change adds only 200 lines, far below the limit, but the whole file is too long.
      const result = checkRange({ baseRef: afterFirst, cwd: repoDir });
      expect(result.valid).toBe(false);
      expect(result.findings[0].reason).toContain('lines');
    });

    it.each(['data/staff.tsv', 'data/staff.csv', 'data/staff.XML'])(
      'flags a UTF-16 export %s that git treats as binary, even though it holds a staff email',
      (name) => {
        const text = 'name\temail\nPat\tpat@acf.hhs.gov\n';
        fs.mkdirSync(path.join(repoDir, 'data'), { recursive: true });
        fs.writeFileSync(path.join(repoDir, name), Buffer.from(`﻿${text}`, 'utf16le'));
        commitAll('utf16');
        const result = checkRange({ baseRef: baseSha, cwd: repoDir });
        expect(result.valid).toBe(false);
        expect(result.findings[0]).toMatchObject({ path: name });
        expect(result.findings[0].reason).toContain('Binary');
        expect(result.message).not.toContain('pat@');
      }
    );

    it('does not reject a binary file that is not a data file', () => {
      fs.mkdirSync(path.join(repoDir, 'img'), { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'img/logo.png'), Buffer.from([0x89, 0x50, 0x00, 0x01]));
      commitAll('image');
      expect(checkRange({ baseRef: baseSha, cwd: repoDir }).valid).toBe(true);
    });

    it('allows deleting a forbidden file', () => {
      writeFile('hses/grant_award.xml', '<a/>\n');
      commitAll('add');
      const withFile = git('rev-parse', 'HEAD');
      git('rm', '-q', 'hses/grant_award.xml');
      git('commit', '-q', '-m', 'remove');
      expect(checkRange({ baseRef: withFile, cwd: repoDir }).valid).toBe(true);
    });

    describe('when git fails', () => {
      const sensitiveFragments = ['pat@', 'acf.hhs.gov'];

      // Anything Node could print for an uncaught error: message, stack, and every own property.
      const everythingPrintable = (error) =>
        `${error.message}\n${error.stack}\n${util.inspect(error, { depth: 10 })}`;

      it('throws a sanitized error without the patch text when the output is too large', () => {
        writeFile('data/staff.csv', emailCsv);
        commitAll('email');

        let caught;
        try {
          checkRange({ baseRef: baseSha, cwd: repoDir, maxBuffer: 50 });
        } catch (error) {
          caught = error;
        }

        expect(caught).toBeInstanceOf(GuardError);
        const printable = everythingPrintable(caught);
        sensitiveFragments.forEach((fragment) => {
          expect(printable).not.toContain(fragment);
        });
        expect(caught.cause).toBeUndefined();
        expect(caught.stdout).toBeUndefined();
        expect(caught.stderr).toBeUndefined();
        expect(caught.output).toBeUndefined();
        expect(caught.message).toMatch(/^git \w[\w-]* failed/);
      });

      it('throws a sanitized error for an unknown base ref', () => {
        expect(() => checkRange({ baseRef: 'no-such-ref', cwd: repoDir })).toThrow(GuardError);
        expect(() => checkRange({ baseRef: 'no-such-ref', cwd: repoDir })).toThrow(
          /^git diff failed/
        );
      });

      it('exits 1 and prints only a sanitized message from the CLI', () => {
        writeFile('data/staff.csv', emailCsv);
        commitAll('email');

        const result = spawnSync(
          process.execPath,
          [path.join(__dirname, 'validate-data-file-guard.js')],
          { cwd: repoDir, encoding: 'utf8', env: { ...process.env, BASE_REF: 'no-such-ref' } }
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('Data file guard could not complete');
        sensitiveFragments.forEach((fragment) => {
          expect(`${result.stdout}${result.stderr}`).not.toContain(fragment);
        });
      });

      it('exits 1 when BASE_REF is missing', () => {
        const env = { ...process.env };
        delete env.BASE_REF;
        const result = spawnSync(
          process.execPath,
          [path.join(__dirname, 'validate-data-file-guard.js')],
          { cwd: repoDir, encoding: 'utf8', env }
        );
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('BASE_REF is required');
      });
    });
  });
});
