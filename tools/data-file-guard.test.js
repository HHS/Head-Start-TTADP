const {
  evaluate,
  findForbiddenPaths,
  findStaffEmailsInAddedLines,
  parseNameStatus,
} = require('./data-file-guard');

describe('data file guard', () => {
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
