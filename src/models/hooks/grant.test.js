import {
  afterCreate,
  afterUpdate,
  beforeDestroy,
  afterDestroy,
} from './grant';
import {
  syncGrantNumberLink,
  clearGrantNumberLink,
} from './genericLink';

jest.mock('./genericLink', () => ({
  syncGrantNumberLink: jest.fn(),
  clearGrantNumberLink: jest.fn(),
}));

describe('grant hooks', () => {
  const mockSequelize = {
    models: {
      GrantRelationshipToActive: {
        refresh: jest.fn(),
      },
    },
  };
  const mockInstance = { id: 1, number: 'grant-123', changed: jest.fn() };
  const mockOptions = { transaction: {} };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('afterCreate', () => {
    it('calls syncGrantNumberLink and refreshes GrantRelationshipToActive', async () => {
      await afterCreate(mockSequelize, mockInstance, mockOptions);
      expect(syncGrantNumberLink).toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions, 'number');
      expect(mockSequelize.models.GrantRelationshipToActive.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('afterUpdate', () => {
    it('calls syncGrantNumberLink and refreshes if status changed', async () => {
      mockInstance.changed.mockReturnValue(true);
      await afterUpdate(mockSequelize, mockInstance, mockOptions);
      expect(syncGrantNumberLink).toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions, 'number');
      expect(mockInstance.changed).toHaveBeenCalledWith('status');
      expect(mockSequelize.models.GrantRelationshipToActive.refresh).toHaveBeenCalledTimes(1);
    });

    it('calls syncGrantNumberLink but does not refresh if status did not change', async () => {
      mockInstance.changed.mockReturnValue(false);
      await afterUpdate(mockSequelize, mockInstance, mockOptions);
      expect(syncGrantNumberLink).toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions, 'number');
      expect(mockInstance.changed).toHaveBeenCalledWith('status');
      expect(mockSequelize.models.GrantRelationshipToActive.refresh).not.toHaveBeenCalled();
    });
  });

  describe('beforeDestroy', () => {
    it('calls clearGrantNumberLink', async () => {
      await beforeDestroy(mockSequelize, mockInstance, mockOptions);
      expect(clearGrantNumberLink).toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions);
      expect(mockSequelize.models.GrantRelationshipToActive.refresh).not.toHaveBeenCalled();
    });
  });

  describe('afterDestroy', () => {
    it('refreshes GrantRelationshipToActive', async () => {
      await afterDestroy(mockSequelize, mockInstance, mockOptions);
      expect(mockSequelize.models.GrantRelationshipToActive.refresh).toHaveBeenCalledTimes(1);
      expect(syncGrantNumberLink).not.toHaveBeenCalled();
      expect(clearGrantNumberLink).not.toHaveBeenCalled();
    });
  });
});
