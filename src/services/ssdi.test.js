import fs from 'fs';
import path from 'path';
import db from '../models';
import {
  listQueryFiles,
  readNameAndDescriptionFromFile,
  readFlagsAndQueryFromFile,
  validateFlagValues,
  validateType,
  setFlags,
  sanitizeFilename,
  generateFlagString,
} from './ssdi';

// Mock fs and db
jest.mock('fs');
jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

describe('ssdi', () => {
  describe('readNameAndDescriptionFromFile', () => {
    it('should read name, description, and default output name from file', () => {
      const fileContents = `
        @name: TestName
        @description: Test description
        @defaultOutputName: test_output
      `;
      fs.readFileSync.mockReturnValue(fileContents);

      const result = readNameAndDescriptionFromFile('test/path');
      expect(result).toEqual({
        name: 'TestName',
        description: 'Test description',
        defaultOutputName: 'test_output',
      });
    });
  });

  describe('listQueryFiles', () => {
    it('should list all query files with name and description', () => {
      fs.readdirSync.mockReturnValue(['file1.sql', 'file2.sql']);
      fs.readFileSync.mockReturnValue(`
        @name: TestName
        @description: Test description
        @defaultOutputName: test_output
      `);

      const result = listQueryFiles('test/directory');
      expect(result).toEqual([
        {
          name: 'TestName',
          description: 'Test description',
          filePath: 'test/directory/file1.sql',
          defaultOutputName: 'test_output',
        },
        {
          name: 'TestName',
          description: 'Test description',
          filePath: 'test/directory/file2.sql',
          defaultOutputName: 'test_output',
        },
      ]);
    });
  });

  describe('readFlagsAndQueryFromFile', () => {
    it('should read flags and query from file', () => {
      const fileContents = `
        /*
        * - ssdi.flag1 - integer[] - Flag description
        * @defaultOutputName: test_output
        */
        SELECT * FROM table;\n`;
      fs.readFileSync.mockReturnValue(fileContents);

      const result = readFlagsAndQueryFromFile('test/path');
      expect(result).toEqual({
        flags: {
          flag1: {
            type: 'integer[]',
            description: 'Flag description',
          },
        },
        query: 'SELECT * FROM table;',
        defaultOutputName: 'test_output',
      });
    });
  });

  describe('validateType', () => {
    it('should validate integer[] type', () => {
      expect(validateType('integer[]', [1, 2, 3])).toBe(true);
      expect(validateType('integer[]', [1, '2', 3])).toBe(false);
    });

    it('should validate date[] type', () => {
      expect(validateType('date[]', ['2021-01-01', '2021-02-01'])).toBe(true);
      expect(validateType('date[]', ['2021-01-01', 'invalid-date'])).toBe(false);
    });

    it('should validate string[] type', () => {
      expect(validateType('string[]', ['hello', 'world'])).toBe(true);
      expect(validateType('string[]', ['hello', 123])).toBe(false);
    });

    it('should validate boolean type', () => {
      expect(validateType('boolean', true)).toBe(true);
      expect(validateType('boolean', false)).toBe(true);
      expect(validateType('boolean', 'true')).toBe(false);
    });

    it('should throw an error for unknown type', () => {
      expect(() => validateType('unknown[]', ['test'])).toThrow('Unknown type: unknown[]');
    });
  });

  describe('validateFlagValues', () => {
    const flags = {
      flag1: { type: 'integer[]', description: 'Flag description' },
    };

    it('should validate flag values correctly', () => {
      expect(() => validateFlagValues(flags, { flag1: [1, 2, 3] })).not.toThrow();
    });

    it('should throw error for invalid flag value', () => {
      expect(() => validateFlagValues(flags, { flag1: [1, '2', 3] })).toThrow(
        'Invalid type for flag flag1: expected integer[]',
      );
    });

    it('should throw error for invalid flag', () => {
      expect(() => validateFlagValues(flags, { invalidFlag: [1, 2, 3] })).toThrow(
        'Invalid flag: invalidFlag',
      );
    });
  });

  describe('setFlags', () => {
    it('should set flags in the database', async () => {
      const flags = { flag1: { type: 'integer[]', description: 'Flag description' } };
      const flagValues = { flag1: [1, 2, 3] };

      db.sequelize.query.mockResolvedValue([{ success: true }]);

      const result = await setFlags(flags, flagValues);
      expect(result).toEqual([[{ success: true }]]);
      expect(db.sequelize.query).toHaveBeenCalledWith('SELECT set_config($1, $2, false)', {
        bind: ['ssdi.flag1', JSON.stringify([1, 2, 3])],
        type: db.sequelize.QueryTypes.SELECT,
      });
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize the filename', () => {
      expect(sanitizeFilename('test@file#name!')).toBe('test_file_name_');
    });
  });

  describe('generateFlagString', () => {
    it('should generate a string representation of the flag values', () => {
      const flagValues = { flag1: [1, 2, 3], flag2: 'value' };
      expect(generateFlagString(flagValues)).toBe('flag1_1-2-3_flag2_value');
    });
  });
});
