import path from 'path';
import { auditLogger } from '../../logger';
import {
  MIGRATION_FILE_PATTERN,
  getPrefixDuplicates,
  getValidatedMigrationFiles,
  resolveMigrationDir,
  sortFilenames,
} from '../../../tests/utils/dbUtils';

describe('dbUtils migration filename validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sortFilenames uses deterministic lexicographic order', () => {
    const unsorted = [
      '20240228223541-monitoring-data.js',
      '20201124160449-users.js',
      '20201210172017-recipients.js',
    ];

    expect(sortFilenames(unsorted)).toEqual([
      '20201124160449-users.js',
      '20201210172017-recipients.js',
      '20240228223541-monitoring-data.js',
    ]);
  });

  it('supports existing migration timestamp conventions', () => {
    expect(MIGRATION_FILE_PATTERN.test('20201029143000-region.js')).toBe(true);
    expect(MIGRATION_FILE_PATTERN.test('20221117-133423-create-aro-sort-column.js')).toBe(true);
    expect(MIGRATION_FILE_PATTERN.test('not-a-migration.js')).toBe(false);
  });

  it('filters hidden and non-js files, and sorts js filenames', () => {
    const readDir = jest.fn().mockReturnValue([
      '.DS_Store',
      'notes.txt',
      '20201210172017-recipients.js',
      '20201124160449-users.js',
    ]);

    const { filenames } = getValidatedMigrationFiles('seeders', readDir);
    expect(filenames).toEqual([
      '20201124160449-users.js',
      '20201210172017-recipients.js',
    ]);
  });

  it('throws for invalid js migration filename formats', () => {
    const readDir = jest.fn().mockReturnValue([
      '20201124160449_users.js',
    ]);

    expect(() => getValidatedMigrationFiles('seeders', readDir))
      .toThrow('Invalid seeders filename format');
  });

  it('warns on duplicate filename prefixes', () => {
    const warnSpy = jest.spyOn(auditLogger, 'warn').mockImplementation(() => {});
    const readDir = jest.fn().mockReturnValue([
      '20201029143000-region.js',
      '20201029143000-scope.js',
    ]);

    getValidatedMigrationFiles('migrations', readDir);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate filename prefixes found in migrations'));
    expect(getPrefixDuplicates([
      '20201029143000-region.js',
      '20201029143000-scope.js',
      '20201210172017-recipients.js',
    ])).toEqual(['20201029143000']);
  });

  it('resolves migration directories from file location instead of process cwd', () => {
    const resolved = resolveMigrationDir('seeders');
    expect(resolved).toBe(path.resolve(__dirname, '../../../src/seeders'));
  });
});
