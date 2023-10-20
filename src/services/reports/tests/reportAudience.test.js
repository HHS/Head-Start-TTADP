import db from '../../../models';
import { REPORT_TYPE, AUDIENCE } from '../../../constants';
import {
  audienceEnumInfo,
  syncReportAudiences,
  getReportAudiences,
  includeReportAudience,
} from '../reportAudience';

const {
  Audience,
  ReportAudience,
  sequelize,
} = db;

describe('ReportAudience', () => {
  beforeAll(async () => {
    await db.isReady;
  });
  describe('syncReportAudiences', () => {
    it('should sync report audiences when audienceEnums are provided', async () => {
      const report = { id: 1, type: REPORT_TYPE.REPORT_TRAINING_EVENT };
      const audienceEnums = [
        { id: 1, name: AUDIENCE.RECIPIENTS },
        { id: 3, name: AUDIENCE.FEDERAL_STAFF },
      ];

      const pre = await getReportAudiences(report);
      const syncResponse = await syncReportAudiences(report, audienceEnums);
      await syncResponse.promises;
      const post = await getReportAudiences(report);
      const testableResults = post
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ audienceIdA }, { audienceIdB }) => audienceIdA - audienceIdB);

      expect(testableResults.length).toEqual(2);
      expect(testableResults[0])
        .toEqual({ audienceId: 1, name: AUDIENCE.RECIPIENTS, reportId: 1 });
      expect(testableResults[1])
        .toEqual({ audienceId: 3, name: AUDIENCE.FEDERAL_STAFF, reportId: 1 });

      await syncReportAudiences(report, pre.map(({ dataValues: { name } }) => name));
    });

    it('should sync report audiences with null audienceEnums', async () => {
      const report = { id: 2, type: REPORT_TYPE.REPORT_TRAINING_EVENT };

      const pre = await getReportAudiences(report);
      const syncResponse = await syncReportAudiences(report);
      await syncResponse.promises;
      const post = await getReportAudiences(report);

      expect(pre.length > 0).toBe(true);
      expect(post.length === 0).toBe(true);

      await syncReportAudiences(report, pre.map(({ dataValues: { name } }) => name));
    });
  });

  describe('getReportAudiences', () => {
    it('should retrieve report audiences when audienceIds are provided as number', async () => {
      const report = { id: 3, type: REPORT_TYPE.REPORT_TRAINING_EVENT };
      let audiences = [2];

      let result = await getReportAudiences(report, audiences);

      expect(result.length === 0).toBe(true);
      expect(Object.keys(result)).toEqual([]);

      audiences = [1];

      result = await getReportAudiences(report, audiences);

      expect(result.length).toBe(1);
      const testableResults = result
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ audienceIdA }, { audienceIdB }) => audienceIdA - audienceIdB);
      expect(testableResults).toEqual([{
        reportId: report.id,
        audienceId: 1,
        name: AUDIENCE.RECIPIENTS,
      }]);
    });

    it('should retrieve report audiences when audiences are provided as text', async () => {
      const report = { id: 3, type: REPORT_TYPE.REPORT_TRAINING_EVENT };
      let audiences = [AUDIENCE.FEDERAL_STAFF];
      let result = await getReportAudiences(report, audiences);

      expect(result.length).toBe(0);

      audiences = [AUDIENCE.RECIPIENTS];
      result = await getReportAudiences(report, audiences);

      expect(result.length).toBe(1);
      const testableResults = result
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ audienceIdA }, { audienceIdB }) => audienceIdA - audienceIdB);
      expect(testableResults).toEqual([{
        reportId: report.id,
        audienceId: 1,
        name: AUDIENCE.RECIPIENTS,
      }]);
    });

    it('should retrieve report audiences with all audiences when null provided', async () => {
      const report = { id: 3, type: REPORT_TYPE.REPORT_TRAINING_EVENT };

      const result = await getReportAudiences(report);

      expect(result.length).toBe(1);
      const testableResults = result
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ audienceIdA }, { audienceIdB }) => audienceIdA - audienceIdB);
      expect(testableResults).toEqual([{
        reportId: report.id,
        audienceId: 1,
        name: AUDIENCE.RECIPIENTS,
      }]);
    });
  });

  describe('includeReportAudience', () => {
    it('should include report audience enums for the provided report type', () => {
      const reportType = REPORT_TYPE.REPORT_TRAINING_EVENT;

      const include = includeReportAudience(reportType);

      expect(include).toEqual({
        model: ReportAudience,
        as: 'reportAudiences',
        attributes: [
          'id',
          'reportId',
          'audienceId',
          [sequelize.literal('"audience".name'), 'name'],
        ],
        include: [{
          model: Audience,
          as: 'audience',
          attributes: [],
          required: true,
        }],
      });
    });
  });
});
