import { QueryTypes, Sequelize } from 'sequelize';
import { Umzug } from 'umzug';
import { reseed, query } from '../../../tests/utils/dbUtils';

jest.mock('sequelize', () => ({
  ...jest.requireActual('sequelize'),
  Sequelize: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue([]),
    getQueryInterface: jest.fn().mockReturnValue({}),
  })),
}));

jest.mock('umzug', () => ({
  Umzug: jest.fn().mockImplementation(() => ({
    up: jest.fn().mockResolvedValue([]),
  })),
  SequelizeStorage: jest.fn(),
}));

jest.mock('fs', () => ({
  readdirSync: jest.fn().mockReturnValue([]),
}));

describe('dbUtils', () => {
  // dbUtils.js instantiates Sequelize at module load time; save the reference
  // before clearAllMocks wipes Sequelize.mock.results in beforeEach.
  let sequelizeInstance;

  beforeAll(() => {
    sequelizeInstance = Sequelize.mock.results[0].value;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sequelizeInstance.query.mockResolvedValue([]);
  });

  describe('query', () => {
    it('delegates to sequelize.query with the provided command and options', async () => {
      const sql = 'SELECT last_value AS "lastValue" FROM "Goals_id_seq";';
      const opts = { type: QueryTypes.SELECT };
      sequelizeInstance.query.mockResolvedValue([{ lastValue: 1 }]);

      const result = await query(sql, opts);

      expect(sequelizeInstance.query).toHaveBeenCalledWith(sql, opts);
      expect(result).toEqual([{ lastValue: 1 }]);
    });
  });

  describe('reseed', () => {
    it('drops the schema, runs migrations and seeders, and returns true', async () => {
      const result = await reseed();

      expect(result).toBe(true);
      expect(sequelizeInstance.query).toHaveBeenCalledWith(
        expect.stringContaining('DROP SCHEMA public CASCADE'),
      );
      expect(Umzug).toHaveBeenCalledTimes(2);
      expect(Umzug.mock.results[0].value.up).toHaveBeenCalled();
      expect(Umzug.mock.results[1].value.up).toHaveBeenCalled();
    });
  });
});
