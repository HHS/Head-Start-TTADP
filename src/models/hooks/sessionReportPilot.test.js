import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
} from './sessionReportPilot';
import { trSessionCreated } from '../../lib/mailer';

jest.mock('../../lib/mailer', () => ({
  trSessionCreated: jest.fn(),
}));

describe('sessionReportPilot hooks', () => {
  const mockOptions = {
    transaction: {},
  };

  const mockInstance = {
    eventId: 1,
    changed: jest.fn(() => []),
  };

  const mockUpdate = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('afterCreate', () => {
    it('sets an associated event to in progress', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
            })),
          },
        },
      };

      await afterCreate(mockSequelize, mockInstance, mockOptions);
      expect(mockUpdate).toHaveBeenCalledWith({
        data: {
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        },
      }, { transaction: mockOptions.transaction });

      // verify that the mailer was called
      expect(trSessionCreated).toHaveBeenCalled();
    });

    it('does not set an associated event to in progress if the event is already in progress', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
            })),
          },
        },
      };

      await afterCreate(mockSequelize, mockInstance, mockOptions);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => {
              throw new Error('oops');
            }),
          },
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
            })),
          },
        },
      };

      await afterCreate(mockSequelize, mockInstance, mockOptions);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('afterUpdate', () => {
    it('calls setAssociatedEventToInProgress', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
            })),
          },
        },
      };

      await afterUpdate(mockSequelize, mockInstance, mockOptions);
      expect(mockUpdate).toHaveBeenCalledWith({
        data: {
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        },
      }, { transaction: mockOptions.transaction });
    });
  });

  describe('beforeCreate', () => {
    it('calls preventChangesIfEventComplete', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({})),
          },
        },
      };

      await expect(beforeCreate(mockSequelize, mockInstance, mockOptions)).rejects.toThrow();
    });

    it('handles errors in the findone', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => {
              throw new Error('oops');
            }),
          },
        },
      };

      await expect(beforeCreate(mockSequelize, mockInstance, mockOptions)).resolves.not.toThrow();
    });
  });

  describe('beforeUpdate', () => {
    it('calls preventChangesIfEventComplete', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({})),
          },
        },
      };

      await expect(beforeUpdate(mockSequelize, mockInstance, mockOptions)).rejects.toThrow();
    });

    it('marks session as submitted when pocComplete, approverId, and ownerComplete are all true', async () => {
      const mockSet = jest.fn();
      const mockInstanceWithData = {
        eventId: 1,
        approverId: 123,
        data: {
          pocComplete: true,
          ownerComplete: true,
          otherField: 'value',
        },
        set: mockSet,
        changed: jest.fn(() => []),
      };

      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
        },
      };

      await beforeUpdate(mockSequelize, mockInstanceWithData, mockOptions);

      expect(mockSet).toHaveBeenCalledWith('data', {
        pocComplete: true,
        ownerComplete: true,
        otherField: 'value',
        submitted: true,
      });
    });

    it('does not mark session as submitted when pocComplete is false', async () => {
      const mockSet = jest.fn();
      const mockInstanceWithData = {
        eventId: 1,
        data: {
          pocComplete: false,
          approverId: 123,
          ownerComplete: true,
        },
        set: mockSet,
        changed: jest.fn(() => []),
      };

      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
        },
      };

      await beforeUpdate(mockSequelize, mockInstanceWithData, mockOptions);

      expect(mockSet).toHaveBeenCalledWith('data', expect.objectContaining({ submitted: false }));
    });

    it('does not mark session as submitted when approverId is missing', async () => {
      const mockSet = jest.fn();
      const mockInstanceWithData = {
        eventId: 1,
        data: {
          pocComplete: true,
          approverId: null,
          ownerComplete: true,
        },
        set: mockSet,
        changed: jest.fn(() => []),
      };

      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
        },
      };

      await beforeUpdate(mockSequelize, mockInstanceWithData, mockOptions);

      expect(mockSet).toHaveBeenCalledWith('data', expect.objectContaining({ submitted: false }));
    });

    it('does not mark session as submitted when ownerComplete is false', async () => {
      const mockSet = jest.fn();
      const mockInstanceWithData = {
        eventId: 1,
        data: {
          pocComplete: true,
          approverId: 123,
          ownerComplete: false,
        },
        set: mockSet,
        changed: jest.fn(() => []),
      };

      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
        },
      };

      await beforeUpdate(mockSequelize, mockInstanceWithData, mockOptions);

      expect(mockSet).toHaveBeenCalledWith('data', expect.objectContaining({ submitted: false }));
    });

    it('does not mark session as submitted when all required fields are missing', async () => {
      const mockSet = jest.fn();
      const mockInstanceWithData = {
        eventId: 1,
        data: {},
        set: mockSet,
        changed: jest.fn(() => []),
      };

      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
        },
      };

      await beforeUpdate(mockSequelize, mockInstanceWithData, mockOptions);

      expect(mockSet).toHaveBeenCalledWith('data', expect.objectContaining({ submitted: false }));
    });
  });

  describe('beforeDestroy', () => {
    it('calls preventChangesIfEventComplete', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({})),
          },
        },
      };

      await expect(beforeDestroy(mockSequelize, mockInstance, mockOptions)).rejects.toThrow();
    });
  });
});
