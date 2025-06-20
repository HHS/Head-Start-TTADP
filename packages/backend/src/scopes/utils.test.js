import { scopeToWhere } from './utils';
import { ActivityReport } from '../models'; // Assuming the model is imported from './models'

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
