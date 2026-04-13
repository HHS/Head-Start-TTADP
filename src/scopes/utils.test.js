import { Op } from 'sequelize';
import { compareDate, scopeToWhere, filterToAllowedProgramTypes } from './utils';
import { ActivityReport } from '../models'; // Assuming the model is imported from './models'

describe('filterToAllowedProgramTypes', () => {
  it('should return an empty array when given an empty array', () => {
    const result = filterToAllowedProgramTypes([]);
    expect(result).toStrictEqual([]);
  });

  it('should return the same array when all program types are allowed', () => {
    const input = ['EHS', 'HS'];
    const result = filterToAllowedProgramTypes(input);
    expect(result.sort()).toStrictEqual([
      'AIAN EHS',
      'EHS',
      'Migrant EHS',
      'AIAN HS',
      'HS',
      'Migrant HS',
    ].sort());
  });

  it('should filter out disallowed program types', () => {
    const input = ['DisallowedType', 'HS'];
    const result = filterToAllowedProgramTypes(input);
    expect(result.sort()).toStrictEqual(['HS', 'AIAN HS', 'Migrant HS'].sort());
  });
});

describe('scopeToWhere', () => {
  const alias = 'alias';
  const scope = {
    regionId: 1,
    column2: 'value2',
  };

  it('should call ActivityReport.findAll with the correct options', async () => {
    const findAllSpy = jest.spyOn(ActivityReport, 'findAll').mockResolvedValue([]);

    await scopeToWhere(ActivityReport, alias, scope);

    expect(findAllSpy).toHaveBeenCalledWith({
      where: scope,
      limit: 0,
      logging: expect.any(Function),
    });

    findAllSpy.mockRestore();
  });

  it('should extract and modify the WHERE clause correctly', async () => {
    const sql = 'SELECT * FROM "ActivityReports" "ActivityReport" WHERE "ActivityReport"."column1" = \'value1\' AND "ActivityReport"."column2" = \'value2\' LIMIT 0;';
    const findAllSpy = jest.spyOn(ActivityReport, 'findAll').mockImplementationOnce(({ logging }) => {
      logging(sql);
      return Promise.resolve([]);
    });

    const result = await scopeToWhere(ActivityReport, alias, scope);

    expect(result).toBe('alias."column1" = \'value1\' AND alias."column2" = \'value2\'');

    findAllSpy.mockRestore();
  });
});

describe('compareDate', () => {
  it('normalizes month-only dates using the start of the month for gte', () => {
    const result = compareDate(['2025/02'], 'startDate', Op.gte);
    expect(result).toEqual([
      {
        startDate: {
          [Op.gte]: '2025-02-01',
        },
      },
    ]);
  });

  it('normalizes month-only dates using the end of the month for lte', () => {
    const result = compareDate(['2025/02'], 'startDate', Op.lte);
    expect(result).toEqual([
      {
        startDate: {
          [Op.lte]: '2025-02-28',
        },
      },
    ]);
  });

  it('skips invalid dates', () => {
    const result = compareDate(['not-a-date'], 'startDate', Op.gte);
    expect(result).toEqual([]);
  });
});
