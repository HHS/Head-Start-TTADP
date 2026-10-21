const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

// These guard against quietly breaking how the check is wired, which unit tests of the script cannot see.
describe('data file guard configuration', () => {
  describe('workflow', () => {
    const workflow = read('.github/workflows/pr-data-file-guard.yml');

    it('runs on pull requests', () => {
      expect(workflow).toMatch(/^ {2}pull_request:/m);
    });

    it('also runs in the merge queue, so it can be a required check', () => {
      expect(workflow).toMatch(/^ {2}merge_group:\n {4}types: \[checks_requested\]$/m);
    });

    // The whole expression is matched, so swapping the branches or the condition fails here.
    // In a merge group github.base_ref is empty, so the queue must use the commit it built on.
    it('compares against the queue base commit only when run by the merge queue', () => {
      expect(workflow).toContain(
        `BASE_REF: \${{ github.event_name == 'merge_group' && github.event.merge_group.base_sha || format('origin/{0}', github.base_ref) }}`
      );
    });

    // The guard diffs against the base commit, which a shallow checkout does not contain.
    it('checks out full history so the base commit exists', () => {
      const checkout = workflow.match(
        /uses: actions\/checkout@[^\n]*\n {8}with:\n((?: {10}[^\n]*\n)+)/
      );
      expect(checkout).not.toBeNull();
      expect(checkout[1]).toMatch(/^ {10}fetch-depth: 0$/m);
    });

    it('keeps the job name data_file_guard, the name used as the required check', () => {
      expect(workflow).toMatch(/^ {2}data_file_guard:/m);
    });
  });

  describe('CODEOWNERS', () => {
    const entries = read('.github/CODEOWNERS')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [pattern, ...owners] = line.split(/\s+/);
        return { pattern, owners };
      });

    const guardFiles = [
      '/tools/data-file-guard.js',
      '/tools/data-file-guard.test.js',
      '/tools/data-file-guard-config.test.js',
      '/tools/validate-data-file-guard.js',
      '/.github/workflows/pr-data-file-guard.yml',
      '/.github/CODEOWNERS',
    ];

    it.each(guardFiles)('lists %s with at least two owners', (file) => {
      const entry = entries.find(({ pattern }) => pattern === file);
      expect(entry).toBeDefined();
      // Two owners, so either can approve a change the other wrote.
      expect(new Set(entry.owners).size).toBeGreaterThanOrEqual(2);
      entry.owners.forEach((owner) => {
        expect(owner).toMatch(/^@[\w-]+(\/[\w-]+)?$/);
      });
    });

    it.each(guardFiles)('points at a file that exists: %s', (file) => {
      expect(fs.existsSync(path.join(repoRoot, file.slice(1)))).toBe(true);
    });

    it('covers every guard file in tools/', () => {
      const inTools = fs
        .readdirSync(path.join(repoRoot, 'tools'))
        .filter((name) => /data-file-guard/.test(name))
        .map((name) => `/tools/${name}`);
      inTools.forEach((file) => {
        expect(guardFiles).toContain(file);
      });
    });
  });
});
