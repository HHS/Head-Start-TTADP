import { Model, DataTypes } from 'sequelize';
import db from '../models';
import {
  modelForTable,
  getColumnInformation,
  getColumnNamesFromModelForType,
  filterDataToModel,
  includeToFindAll,
  nestedRawish,
} from './modelUtils';

describe('modelUtils', () => {
  afterAll(() => db.sequelize.close());
  describe('modelForTable', () => {
    it('should return the correct model for a given table name', () => {
      const tableName = 'Users';
      const model = modelForTable(db, tableName);
      expect(Object.getPrototypeOf(model.prototype)).toBe(Model.prototype);
    });

    it('should throw an error if the table name does not match any model', () => {
      // Mock sequelize models
      const mockModels = {
        User: class User extends Model {
          static getTableName() {
            return 'users';
          }
        },
      };

      // Mock db object
      const mockDB = {
        sequelize: {
          models: mockModels,
        },
      };

      const tableName = 'nonexistent';
      // eslint-disable-next-line @typescript-eslint/quotes
      expect(() => modelForTable(mockDB, tableName)).toThrow(`Unable to find table for 'nonexistent'`);
    });
  });

  describe('getColumnInformation', () => {
    it('should return column information for a given model', async () => {
      const tableName = 'Topics';
      const model = modelForTable(db, tableName);
      const columns = await getColumnInformation(model);
      expect(columns).toMatchObject([
        { columnName: 'id', dataType: 'INTEGER', allowNull: false },
        { columnName: 'name', dataType: 'CHARACTER VARYING(255)', allowNull: false },
        { columnName: 'createdAt', dataType: 'TIMESTAMP WITH TIME ZONE', allowNull: false },
        { columnName: 'updatedAt', dataType: 'TIMESTAMP WITH TIME ZONE', allowNull: false },
        { columnName: 'deletedAt', dataType: 'TIMESTAMP WITH TIME ZONE', allowNull: true },
        { columnName: 'mapsTo', dataType: 'INTEGER', allowNull: true },
        { columnName: 'deprecated', dataType: 'BOOLEAN', allowNull: false },
      ]);
    });
  });

  describe('getColumnNamesFromModelForType', () => {
    it('should return column names for a specific data type', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          id: { type: DataTypes.INTEGER, allowNull: false },
          age: { type: DataTypes.INTEGER, allowNull: true },
          name: { type: DataTypes.STRING, allowNull: true },
        }),
      };
      const columnNames = await getColumnNamesFromModelForType(mockModel, DataTypes.INTEGER);
      expect(columnNames).toEqual(['id', 'age']);
    });
  });

  describe('filterDataToModel', () => {
    it('should filter data object based on the column information of a model', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          id: { type: DataTypes.INTEGER, allowNull: false },
          name: { type: DataTypes.STRING, allowNull: true },
        }),
      };
      const data = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com', // This field does not exist in the model
      };
      const { matched, unmatched } = await filterDataToModel(data, mockModel);
      expect(matched).toEqual({ id: 1, name: 'John Doe' });
      expect(unmatched).toEqual({ email: 'john@example.com' });
    });

    it('should correctly handle null values when allowed', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          name: { type: DataTypes.STRING, allowNull: true },
        }),
      };
      const data = {
        name: null,
      };
      const { matched, unmatched } = await filterDataToModel(data, mockModel);
      expect(matched).toEqual({ name: null });
      expect(unmatched).toEqual({});
    });

    it('should convert number to string if needed', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          age: { type: DataTypes.STRING, allowNull: false },
        }),
      };
      const data = {
        age: 30,
      };
      const { matched, unmatched } = await filterDataToModel(data, mockModel);
      expect(matched).toEqual({ age: '30' });
      expect(unmatched).toEqual({});
    });

    it('should convert number to boolean if needed', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          isActive: { type: DataTypes.BOOLEAN, allowNull: false },
        }),
      };
      const data = {
        isActive: 1,
      };
      const { matched, unmatched } = await filterDataToModel(data, mockModel);
      expect(matched).toEqual({ isActive: true });
      expect(unmatched).toEqual({});
    });

    it('should handle Date object conversion to string', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          createdAt: { type: DataTypes.STRING, allowNull: false },
        }),
      };
      const date = new Date();
      const data = {
        createdAt: date,
      };
      const { matched, unmatched } = await filterDataToModel(data, mockModel);
      expect(matched).toEqual({ createdAt: date });
      expect(unmatched).toEqual({});
    });

    it('should add fields to unmatched if the value type does not match the model definition', async () => {
      const mockModel = {
        describe: jest.fn().mockResolvedValue({
          count: { type: DataTypes.INTEGER, allowNull: false },
        }),
      };
      const data = {
        count: 'five', // Invalid type, expecting integer
      };
      const { matched, unmatched } = await filterDataToModel(data, mockModel);
      expect(matched).toEqual({});
      expect(unmatched).toEqual({ count: 'five' });
    });
  });

  describe('includeToFindAll', () => {
    it('should include a model and its associated data based on the provided include function', async () => {
      const includeFunc = () => ({
        as: 'topics',
        model: db.Topic,
      });
      const moreWhere = { name: 'Coaching' };
      const results = await includeToFindAll(includeFunc, moreWhere, undefined, ['id', 'name', 'mapsTo']);
      expect(results).toMatchObject([{
        id: expect.anything((id) => id === 6 // seeded-data
        || id === 63), // prod or sanitized data
        name: 'Coaching',
        mapsTo: null,
      }]);
    });
  });

  describe('nestedRawish', () => {
    it('should strip out Sequelize model instance metadata and retain only raw data values', () => {
      const sequelizeData = {
        dataValues: { id: 1, name: 'John Doe' },
        _previousDataValues: { id: 1, name: 'Jane Doe' },
        isNewRecord: false,
        posts: [
          {
            dataValues: { id: 10, title: 'Post Title' },
            isNewRecord: false,
          },
        ],
      };
      const rawishData = nestedRawish(sequelizeData);
      expect(rawishData).toEqual({
        id: 1,
        name: 'John Doe',
        posts: [{ id: 10, title: 'Post Title' }],
      });
    });

    it('returns data unmodified if it isn\'t an array or an object', () => {
      const data = 'dog';
      const out = nestedRawish(data);
      expect(out).toEqual('dog');
    });
  });
});
