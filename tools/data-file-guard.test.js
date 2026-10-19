const {
  evaluate,
  findForbiddenPaths,
  findHsesExtractFiles,
  findStaffEmailsInAddedLines,
  parseNameStatus,
  parseNumstat,
} = require('./data-file-guard');

describe('data file guard', () => {
  describe('parseNumstat', () => {
    it('parses git numstat output', () => {
      expect(parseNumstat('12\t3\ttemp/agency.xml\n-\t-\tsome/file.zip\n')).toEqual([
        { path: 'temp/agency.xml', addedLines: 12 },
        { path: 'some/file.zip', addedLines: 0 },
      ]);
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

  describe('parseNameStatus', () => {
    it('parses git name-status output', () => {
      expect(parseNameStatus('A\thses/grant_award.xml\nM\tsrc/app.js\n')).toEqual([
        { status: 'A', path: 'hses/grant_award.xml' },
        { status: 'M', path: 'src/app.js' },
      ]);
    });

    it('ignores blank lines', () => {
      expect(parseNameStatus('\n\n')).toEqual([]);
    });
  });

  describe('findForbiddenPaths', () => {
    it('flags files added under hses/', () => {
      const findings = findForbiddenPaths([{ status: 'A', path: 'hses/grant_award.xml' }]);
      expect(findings).toHaveLength(1);
      expect(findings[0].path).toBe('hses/grant_award.xml');
    });

    it('flags hses.zip at any depth', () => {
      expect(findForbiddenPaths([{ status: 'A', path: 'hses.zip' }])).toHaveLength(1);
      expect(findForbiddenPaths([{ status: 'M', path: 'some/dir/hses.zip' }])).toHaveLength(1);
    });

    it('allows deleting forbidden paths', () => {
      expect(findForbiddenPaths([{ status: 'D', path: 'hses/grant_award.xml' }])).toEqual([]);
    });

    it('allows ordinary files', () => {
      expect(findForbiddenPaths([{ status: 'A', path: 'temp/grant_award.xml' }])).toEqual([]);
    });
  });

  describe('findStaffEmailsInAddedLines', () => {
    const diff = [
      'diff --git a/data/sample.xml b/data/sample.xml',
      '--- a/data/sample.xml',
      '+++ b/data/sample.xml',
      '@@ -10,0 +11,2 @@',
      '+  <grant_number>01CH000001</grant_number>',
      '+  <program_specialist_email>someone@acf.hhs.gov</program_specialist_email>',
    ].join('\n');

    it('flags staff emails added to data files with the right line number', () => {
      const findings = findStaffEmailsInAddedLines(diff);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ path: 'data/sample.xml', line: 12 });
    });

    it('does not include the matched email in findings', () => {
      expect(JSON.stringify(findStaffEmailsInAddedLines(diff))).not.toContain('someone@');
    });

    it('ignores removed lines', () => {
      const removed = diff.replace(
        /^\+ {2}<program_specialist_email>/m,
        '-  <program_specialist_email>'
      );
      expect(findStaffEmailsInAddedLines(removed)).toEqual([]);
    });

    it('ignores non data files', () => {
      const jsDiff = diff.replace(/data\/sample\.xml/g, 'src/middleware/example.test.js');
      expect(findStaffEmailsInAddedLines(jsDiff)).toEqual([]);
    });

    it('matches case insensitively', () => {
      const upper = diff.replace('someone@acf.hhs.gov', 'Someone@ACF.HHS.GOV');
      expect(findStaffEmailsInAddedLines(upper)).toHaveLength(1);
    });
  });

  describe('evaluate', () => {
    it('passes a clean change', () => {
      const result = evaluate({ nameStatusOutput: 'M\tsrc/app.js\n', diffText: '' });
      expect(result.valid).toBe(true);
    });

    it('fails on a forbidden path and lists it', () => {
      const result = evaluate({ nameStatusOutput: 'A\thses/grant_award.xml\n', diffText: '' });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('hses/grant_award.xml');
    });

    it('fails on an HSES extract file name outside temp/', () => {
      const result = evaluate({
        nameStatusOutput: 'A\tdata/agency.xml\n',
        numstatOutput: '10\t0\tdata/agency.xml\n',
        diffText: '',
      });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('data/agency.xml');
    });

    it('passes a small fixture update in temp/', () => {
      const result = evaluate({
        nameStatusOutput: 'M\ttemp/grant_award.xml\n',
        numstatOutput: '6\t2\ttemp/grant_award.xml\n',
        diffText: '',
      });
      expect(result.valid).toBe(true);
    });

    it('fails on staff emails in a data file', () => {
      const diffText = [
        '+++ b/data/sample.csv',
        '@@ -0,0 +1 @@',
        '+name,email',
        '@@ -5,0 +6 @@',
        '+Pat,pat@acf.hhs.gov',
      ].join('\n');
      const result = evaluate({ nameStatusOutput: 'A\tdata/sample.csv\n', diffText });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('data/sample.csv:6');
      expect(result.message).not.toContain('pat@');
    });
  });
});
