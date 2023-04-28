import { recalculateOnAR } from './activityReportGoalResource';

describe('activityReportGoalResource hook', () => {
  afterEach(() => jest.clearAllMocks());
  describe('recalculateOnAR', () => {
    const mockSequelize = {
      query: jest.fn(),
    };
    const mockInstance = {
      activityReportGoalId: 1,
      resourceId: 1,
    };

    it('recalculates when goalIds are in the metadata', async () => {
      const mockOptions = {
        hookMetadata: {
          goalIds: [1],
        },
        transaction: {},
      };

      await recalculateOnAR(mockSequelize, mockInstance, mockOptions);

      const resourceOnReport = `
      SELECT
        r."id",
        COUNT(aror.id) > 0 "onAR"
      FROM "GoalResources" r
      LEFT JOIN "ActivityReportGoals" aro
      ON r."goalId" = aro."goalId"
      JOIN "ActivityReportGoalResources" aror
      ON aro.id = aror."activityReportGoalId"
      AND r."resourceId" = aror."resourceId"
      WHERE r."goalId" IN (${mockOptions.hookMetadata.goalIds.join(',')})
      AND r."resourceId" = ${mockInstance.resourceId}
      AND aro.id != ${mockInstance.activityReportGoalId}
      GROUP BY r."id"`;

      // get the first call and replace all whitespace
      const call = mockSequelize.query.mock.calls[0][0].trim().replace(/\s+/g, ' ');

      const expected = `WITH
        "ResourceOnReport" AS (${resourceOnReport})
      UPDATE "GoalResources" r
      SET "onAR" = rr."onAR"
      FROM "ResourceOnReport" rr
      WHERE r.id = rr.id;`.trim();

      expect(call).toEqual((expected.replace(/\s+/g, ' ')));
    });

    it('recalculates when goalIds are not in the metadata', async () => {
      const mockOptions = {
        hookMetadata: {},
        transaction: {},
      };

      await recalculateOnAR(mockSequelize, mockInstance, mockOptions);

      const resourceOnReport = `
        SELECT
          r."id",
          COUNT(aror.id) > 0 "onAR"
        FROM "GoalResources" r
        JOIN "ActivityReportGoals" arox
        ON r."goalId" = arox."goalId"
        LEFT JOIN "ActivityReportGoals" aro
        ON r."goalId" = aro."goalId"
        JOIN "ActivityReportGoalResources" aror
        ON aro.id = aror."activityReportGoalId"
        AND r."resourceId" = aror."resourceId"
        WHERE arox.id = ${mockInstance.activityReportGoalId}
        AND r."resourceId" = ${mockInstance.resourceId}
        AND aro.id != ${mockInstance.activityReportGoalId}
        GROUP BY r."id"`;

      // get the first call and replace all whitespace
      const call = mockSequelize.query.mock.calls[0][0].trim().replace(/\s+/g, ' ');

      const expected = `WITH
        "ResourceOnReport" AS (${resourceOnReport})
      UPDATE "GoalResources" r
      SET "onAR" = rr."onAR"
      FROM "ResourceOnReport" rr
      WHERE r.id = rr.id;`.trim();

      expect(call).toEqual((expected.replace(/\s+/g, ' ')));
    });
  });
});
