import { REPORT_STATUSES } from '@ttahub/common';
import { ActivityReport, sequelize, User } from '..';
import { beforeDestroy } from './activityReportFile';
import { approverUserIds, draftObject, mockApprovers } from './testHelpers';

describe('activityReportFile hooks', () => {
  const mockUserIds = approverUserIds();
  const mockUsers = mockApprovers(mockUserIds);

  beforeAll(async () => {
    await User.bulkCreate(mockUsers);
  });

  afterAll(async () => {
    await User.destroy({ where: { id: mockUserIds } });
    await sequelize.close();
  });

  describe('beforeDestroy', () => {
    it('should throw an error if the report is approved', async () => {
      const transaction = await sequelize.transaction();

      const ar = await ActivityReport.create(
        {
          ...draftObject,
          submissionStatus: REPORT_STATUSES.APPROVED,
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        { transaction }
      );

      const mockInstance = {
        activityReportId: ar.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(beforeDestroy(sequelize, mockInstance, mockOptions)).rejects.toThrow(
        'File cannot be removed from approved report.'
      );
      await transaction.commit();

      await ActivityReport.destroy({ where: { id: ar.id } });
    });

    it('should not throw an error if the report is not approved', async () => {
      const transaction = await sequelize.transaction();
      const ar = await ActivityReport.create({ ...draftObject }, { transaction });
      const mockInstance = {
        activityReportId: ar.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(beforeDestroy(sequelize, mockInstance, mockOptions)).resolves.toBeUndefined();

      await transaction.commit();
      await ActivityReport.destroy({ where: { id: ar.id } });
    });
  });
});
