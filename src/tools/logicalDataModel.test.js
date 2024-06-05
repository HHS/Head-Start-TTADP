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
