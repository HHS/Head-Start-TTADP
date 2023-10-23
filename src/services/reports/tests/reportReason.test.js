import { REASONS } from '@ttahub/common';
import db from '../../../models';
import { REPORT_TYPE } from '../../../constants';
import {
  syncReportReasons,
  getReportReasons,
  includeReportReasons,
} from '../reportReason';

const {
  Reason,
  ReportReason,
  sequelize,
} = db;

describe('ReportReason', () => {
  beforeAll(async () => {
    await db.isReady;
  });
  describe('syncReportReasons', () => {
    it('should sync report reasons when reasonEnums are provided', async () => {
      const report = { id: 1, type: REPORT_TYPE.REPORT_TRAINING_EVENT };
      const reasonEnums = [
        { name: REASONS[11] },
        { name: REASONS[2] },
      ];

      const pre = await getReportReasons(report);
      const syncResponse = await syncReportReasons(report, reasonEnums);
      await syncResponse.promises;
      const post = await getReportReasons(report);
      const testableResults = post
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ reasonIdA }, { reasonIdB }) => reasonIdA - reasonIdB);

      expect(testableResults.length).toEqual(2);
      expect(testableResults[1])
        .toEqual({ reasonId: 12, name: REASONS[11], reportId: 1 });
      expect(testableResults[0])
        .toEqual({ reasonId: 3, name: REASONS[2], reportId: 1 });

      await syncReportReasons(report, pre.map(({ dataValues: { name } }) => name));
    });

    it('should sync report reasons with null reasonEnums', async () => {
      const report = { id: 1, type: REPORT_TYPE.REPORT_TRAINING_EVENT };

      const pre = await getReportReasons(report);
      const syncResponse = await syncReportReasons(report);
      await syncResponse.promises;
      const post = await getReportReasons(report);

      console.log(pre, post);

      expect(pre.length > 0).toBe(true);
      expect(post.length === 0).toBe(true);

      await syncReportReasons(report, pre.map(({ dataValues: { name } }) => name));
    });
  });

  describe('getReportReasons', () => {
    it('should retrieve report reasons when reasonIds are provided as number', async () => {
      const report = { id: 3, type: REPORT_TYPE.REPORT_TRAINING_EVENT };
      let reasons = [2];

      let result = await getReportReasons(report, reasons);

      expect(result.length === 0).toBe(true);
      expect(Object.keys(result)).toEqual([]);

      reasons = [12];

      result = await getReportReasons(report, reasons);

      expect(result.length).toBe(1);
      const testableResults = result
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ reasonIdA }, { reasonIdB }) => reasonIdA - reasonIdB);
      expect(testableResults).toEqual([{
        reportId: report.id,
        reasonId: 12,
        name: REASONS[11],
      }]);
    });

    it('should retrieve report reasons when reasons are provided as text', async () => {
      const report = { id: 3, type: REPORT_TYPE.REPORT_TRAINING_EVENT };
      let reasons = [REASONS[2]];
      let result = await getReportReasons(report, reasons);

      expect(result.length).toBe(0);

      reasons = [REASONS[11]];
      result = await getReportReasons(report, reasons);

      expect(result.length).toBe(1);
      const testableResults = result
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ reasonIdA }, { reasonIdB }) => reasonIdA - reasonIdB);
      expect(testableResults).toEqual([{
        reportId: report.id,
        reasonId: 12,
        name: REASONS[11],
      }]);
    });

    it('should retrieve report reasons with all reasons when null provided', async () => {
      const report = { id: 3, type: REPORT_TYPE.REPORT_TRAINING_EVENT };

      const result = await getReportReasons(report);

      expect(result.length).toBe(3);
      const testableResults = result
        .map(({ dataValues: { id, ...columns } }) => columns)
        .sort(({ reasonIdA }, { reasonIdB }) => reasonIdA - reasonIdB);
      expect(testableResults).toEqual([
        {
          reportId: report.id,
          reasonId: 12,
          name: REASONS[11],
        },
        {
          reportId: report.id,
          reasonId: 13,
          name: REASONS[12],
        },
        {
          reportId: report.id,
          reasonId: 14,
          name: REASONS[13],
        },
      ]);
    });
  });

  describe('includeReportReason', () => {
    it('should include report reason enums for the provided report type', () => {
      const reportType = REPORT_TYPE.REPORT_TRAINING_EVENT;

      const include = includeReportReasons(reportType);

      expect(include).toEqual({
        model: ReportReason,
        as: 'reportReasons',
        attributes: [
          'id',
          'reportId',
          'reasonId',
          [sequelize.literal('"reason".name'), 'name'],
        ],
        include: [{
          model: Reason,
          as: 'reason',
          attributes: [],
          required: true,
        }],
      });
    });
  });
});
