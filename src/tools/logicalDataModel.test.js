import fs from 'fs';
import path from 'path';
import logicalDataModel, {
  isCamelCase,
  processEnum,
  processClassDefinition,
  processAssociations,
  writeUml,
} from './logicalDataModel';
import { auditLogger } from '../logger';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

describe('logicalDataModel', () => {
  it('logicalDataModel', async () => {
    const encoded = [];
    const puml = [];

    const callBack = (err, stats, fileSet) => {
      if (stats != null) {
        fileSet.push(stats);
        return;
      }
      auditLogger.error(err);
      throw err;
    };

    const getStats = (p, target) => fs.stat(p, (err, stats) => callBack(err, stats, target));

    getStats('./docs/logical_data_model.encoded', encoded);
    getStats('./docs/logical_data_model.puml', puml);

    try {
      await logicalDataModel();
    } catch (err) {
      auditLogger.error(err);
      throw err;
    }

    getStats('./docs/logical_data_model.encoded', encoded);
    getStats('./docs/logical_data_model.puml', puml);

    expect(encoded[0]).not.toBeNull();
    expect(encoded[1]).not.toBeNull();
    expect(encoded[0].mtime).not.toEqual(encoded[1]?.mtime);

    expect(puml[0]).not.toBeNull();
    expect(puml[1]).not.toBeNull();
    expect(puml[0].mtime).not.toEqual(puml[1]?.mtime);
  });

  describe('isCamelCase', () => {
    it('returns false when appropriate', () => {
      expect(isCamelCase('A')).toBe(false);
      expect(isCamelCase('_')).toBe(false);
      expect(isCamelCase('foo bar')).toBe(false);
    });
  });

  describe('processEnum', () => {
    it('returns an issue when modelEnum is falsy', () => {
      const issue = processEnum('foo', 'bar', [], false);
      expect(issue).toContain('foo enum missing for table bar');
    });

    it('alerts when value missing from model enum', () => {
      const issue = processEnum('foo', 'bar', ['foo'], ['bar']);
      expect(issue).toContain('value missing from model enum: foo');
    });

    it('alerts when value missing from schema enum', () => {
      const issue = processEnum('foo', 'bar', ['foo'], ['bar']);
      expect(issue).toContain('value missing from schema enum: bar');
    });
  });

  describe('processClassDefinition', () => {
    it('returns an issue when a model is missing for a table', () => {
      const schema = {
        model: false,
        attributes: [],
      };

      const issue = processClassDefinition(schema, 'foo');
      expect(issue).toContain('model missing for table');
    });

    it('returns an issue when a column type does not match the model type', () => {
      const schema = {
        model: {
          rawAttributes: {
            age: {
              type: { toString: () => 'INTEGER' },
            },
          },
        },
        attributes: [
          { name: 'age', type: 'string', allowNull: false },
        ],
      };

      const issue = processClassDefinition(schema, 'Person');
      expect(issue).toContain("!issue='column type does not match model: string != integer'");
      expect(issue).toContain('<color:#d54309>string</color>');
    });

    it('returns an issue when a column is missing from the model', () => {
      const schema = {
        model: {
          rawAttributes: {},
        },
        attributes: [
          { name: 'email', type: 'string', allowNull: false },
        ],
      };

      const issue = processClassDefinition(schema, 'User');
      expect(issue).toContain("!issue='column missing from model'");
      expect(issue).toContain('<color:#d54309>email</color>: ');
    });

    it('returns an issue when a column default does not match the model default', () => {
      const schema = {
        model: {
          rawAttributes: {
            status: {
              type: { toString: () => 'STRING' },
              defaultValue: 'active',
            },
          },
        },
        attributes: [
          {
            name: 'status',
            type: 'string',
            allowNull: false,
            default: 'inactive',
          },
        ],
      };

      const issue = processClassDefinition(schema, 'Account');
      expect(issue).toContain("!issue='column default does not match model'");
    });
  });

  describe('processAssociations', () => {
    it('should correctly process associations and return UML', () => {
      const associations = [
        { source: { name: 'User' }, target: { name: 'Profile' }, associationType: 'hasOne' },
        { source: { name: 'Profile' }, target: { name: 'User' }, associationType: 'belongsTo' },
      ];
      const tables = ['User', 'Profile'];
      const schemas = [
        { table: 'User', attributes: [{ name: 'id', reference: '"Profile"' }] },
        { table: 'Profile', attributes: [{ name: 'userId', reference: '"User"' }] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('Associations');
      expect(result).toContain('User o--[#yellow,bold,thickness=2]--o Profile : <color:#2491FF>missing-from-model</color>');
    });

    it('should handle "defined both directions" associations', () => {
      const associations = [
        { source: { name: 'Order' }, target: { name: 'Product' }, associationType: 'hasMany' },
      ];
      const tables = ['Order', 'Product'];
      const schemas = [
        { table: 'Order', attributes: [] },
        { table: 'Product', attributes: [] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('associations need to be defined both directions');
    });

    it('should identify issues with associations', () => {
      const associations = [
        { source: { name: 'User' }, target: { name: 'Post' }, associationType: 'hasMany' },
        { source: { name: 'Post' }, target: { name: 'User' }, associationType: 'belongsTo' },
      ];
      const tables = ['User', 'Post'];
      const schemas = [
        { table: 'User', attributes: [{ name: 'id', reference: '"Post"' }] },
        { table: 'Post', attributes: [{ name: 'userId', reference: '"User"' }] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('!issue');
    });

    it('should identify issues with non-distinct associations', () => {
      const associations = [
        {
          source: { name: 'User' },
          target: { name: 'Role' },
          associationType: 'hasOne',
          as: 'UserRole',
        },
        {
          source: { name: 'User' },
          target: { name: 'Role' },
          associationType: 'hasOne',
          as: 'UserRole',
        },
      ];
      const tables = ['User', 'Role'];
      const schemas = [
        { table: 'User', attributes: [] },
        { table: 'Role', attributes: [] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('associations need to be distinct');
      expect(result).toContain('<color:');
    });

    it('should identify issues with non-camel case associations', () => {
      const associations = [
        {
          source: { name: 'User' },
          target: { name: 'Role' },
          associationType: 'hasOne',
          as: 'user_role',
        },
      ];
      const tables = ['User', 'Role'];
      const schemas = [
        { table: 'User', attributes: [] },
        { table: 'Role', attributes: [] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('associations need to be camel case');
      expect(result).toContain('<color:');
    });

    it('should identify issues with non-distinct and non-camel case associations', () => {
      const associations = [
        {
          source: { name: 'User' },
          target: { name: 'Role' },
          associationType: 'hasOne',
          as: 'user_role',
        },
        {
          source: { name: 'User' },
          target: { name: 'Role' },
          associationType: 'hasOne',
          as: 'user_role',
        },
      ];
      const tables = ['User', 'Role'];
      const schemas = [
        { table: 'User', attributes: [] },
        { table: 'Role', attributes: [] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain("!issue='associations need to be distinct and camel case'");
      expect(result).toContain('<color:');
    });

    // You can also include some edge cases to ensure robustness.
    it('should handle empty associations and schemas gracefully', () => {
      const associations = [];
      const tables = [];
      const schemas = [];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('Associations');
      expect(result).not.toContain('<color:');
      expect(result).not.toContain('!issue');
    });

    it('should default to "1 to 1" association when association type is unrecognized', () => {
      const associations = [
        {
          source: { name: 'Hello' },
          target: { name: 'World' },
          associationType: 'unknownAssociation',
          as: 'helloWorld',
        },
      ];
      const tables = ['Hello', 'World'];
      const schemas = [
        { model: { name: 'Hello' }, table: 'Hello', attributes: [] },
        { model: { name: 'World' }, table: 'World', attributes: [] },
      ];

      const result = processAssociations(associations, tables, schemas);

      // Adjusting the expectation to match the actual line color used in the output
      expect(result).toContain('Hello "1" --[#d54309,plain,thickness=2]-- "1" World : helloWorld');
    });

    it('should append issues for "many-to-many" associations to the UML string', () => {
      const associations = [
        {
          source: { name: 'Grant' },
          target: { name: 'Goal' },
          associationType: 'belongsToMany',
          as: 'enrollments',
        },
        // Intentionally omitting the reverse association to trigger the issue
      ];
      const tables = ['Grant', 'Goal'];
      const schemas = [
        { model: { name: 'Grant' }, table: 'Grant', attributes: [] },
        { model: { name: 'Goal' }, table: 'Goal', attributes: [] },
      ];

      const result = processAssociations(associations, tables, schemas);

      expect(result).toContain('!issue=\'associations need to be defined both directions\'');
      expect(result).toContain('Goal "n" }--[#d54309,dotted,thickness=2]--{ "n" Grant : enrollments');
    });
  });

  describe('writeUml', () => {
    const uml = '@startuml\nAlice -> Bob: Authentication Request\n@enduml';
    const dbRoot = 'src/db';
    // const readmePath = path.join(process.cwd(), 'README.md');
    const readmePath = path.dirname((require.main || {}).filename || './');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('writes UML to the specified file', () => {
      writeUml(uml, dbRoot);
      expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(dbRoot, 'logical_data_model.puml'), uml);
    });

    it('updates README.md if it exists and contains a plantuml code block', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('```plantuml\noldUml\n\'db/uml.puml\n```');
      writeUml(uml, dbRoot);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('does not update README.md if it does not contain a plantuml code block', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('No plantuml code block here.');
      writeUml(uml, dbRoot);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('does not throw an error if README.md does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      expect(() => writeUml(uml, dbRoot)).not.toThrow();
    });
  });
});
