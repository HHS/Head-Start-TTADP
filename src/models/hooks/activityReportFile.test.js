import {
  beforeDestroy,
  afterDestroy,
} from './activityReportFile';

import { propagateDestroyToFile } from './genericFile';

jest.mock('./genericFile', () => ({
  propagateDestroyToFile: jest.fn(),
}));

describe('activityReportFile hooks', () => {
  describe('beforeDestroy', () => {
    it('should throw an error if the report is approved', async () => {
      const mockSequelize = {
        models: {
          ActivityReport: {
            findOne: jest.fn().mockResolvedValue({
              calculatedStatus: 'Approved',
            }),
          },
        },
      };
      const mockInstance = {
        activityReportId: 1,
      };
      const mockOptions = {
        transaction: {},
      };

      await expect(beforeDestroy(mockSequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed from approved report.');
    });

    it('should not throw an error if the report is not approved', async () => {
      const mockSequelize = {
        models: {
          ActivityReport: {
            findOne: jest.fn().mockResolvedValue({
              calculatedStatus: 'Draft',
            }),
          },
        },
      };
      const mockInstance = {
        activityReportId: 1,
      };
      const mockOptions = {
        transaction: {},
      };

      await expect(beforeDestroy(mockSequelize, mockInstance, mockOptions))
        .resolves.toBeUndefined();
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
