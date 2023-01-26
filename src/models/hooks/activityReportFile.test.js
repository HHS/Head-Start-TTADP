import {
  beforeDestroy,
  afterDestroy,
} from './activityReportFile';
import { REPORT_STATUSES } from '../../constants';
import {
  sequelize,
  User,
  ActivityReport,
} from '..';
import { propagateDestroyToFile } from './genericFile';

import { draftObject, mockApprovers, approverUserIds } from './testHelpers';

jest.mock('./genericFile', () => ({
  propagateDestroyToFile: jest.fn(),
}));

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
        { transaction },
      );

      const mockInstance = {
        activityReportId: ar.id,
      };
      const mockOptions = {
        transaction,
      };

      await expect(beforeDestroy(sequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed from approved report.');
      await transaction.rollback();
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

      await expect(beforeDestroy(sequelize, mockInstance, mockOptions))
        .resolves.toBeUndefined();

      await transaction.rollback();
    });
  });

  describe('afterDestroy', () => {
    it('should call propagateDestroyToFile', async () => {
      const mockSequelize = {};
      const mockInstance = {};
      const mockOptions = {};

      await afterDestroy(mockSequelize, mockInstance, mockOptions);

      expect(propagateDestroyToFile).toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions);
    });
  });
});
