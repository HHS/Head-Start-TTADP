import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
  createGoalsForSessionRecipientsIfNecessary,
} from './sessionReportPilot';
import { trSessionCreated, trSessionCompleted, trPocSessionComplete } from '../../lib/mailer';

jest.mock('../../lib/mailer', () => ({
  trSessionCreated: jest.fn(),
  trSessionCompleted: jest.fn(),
  trPocSessionComplete: jest.fn(),
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
        },
      };

      await afterUpdate(mockSequelize, mockInstance, mockOptions);
      expect(mockUpdate).toHaveBeenCalledWith({
        data: {
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        },
      }, { transaction: mockOptions.transaction });
    });

    it('notifySessionComplete if completed', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        })),
        data: {
          val: JSON.stringify({
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).toHaveBeenCalled();
    });

    it('dont notifySessionComplete if not completed', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        })),
        data: {
          val: JSON.stringify({
            status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).not.toHaveBeenCalled();
    });

    it('dont notifySessionComplete if already completed', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        })),
        data: {
          val: JSON.stringify({
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).not.toHaveBeenCalled();
    });

    it('participantsAndNextStepsComplete', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          pocComplete: false,
        })),
        data: {
          val: JSON.stringify({
            pocComplete: true,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trPocSessionComplete).toHaveBeenCalled();
    });

    it('dont participantsAndNextStepsComplete', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          pocComplete: false,
        })),
        data: {
          val: JSON.stringify({
            pocComplete: false,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trPocSessionComplete).not.toHaveBeenCalled();
    });

    it('dont trSessionCompleted if already completed', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          status: TRAINING_REPORT_STATUSES.COMPLETE,
        })),
        data: {
          val: JSON.stringify({
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).not.toHaveBeenCalled();
    });
    it('bombs out notifySessionComplete if no previous', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(),
        data: {
          val: JSON.stringify({
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).not.toHaveBeenCalled();
    });
    it('bombs out notifySessionComplete if no current', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        })),
        data: {
          val: JSON.stringify({}),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).not.toHaveBeenCalled();
    });
    it('bombs out if no event', async () => {
      const mockSequelize = {
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => null),
          },
        },
      };

      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        })),
        data: {
          val: JSON.stringify({
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          }),
        },
      };

      await afterUpdate(mockSequelize, instance, mockOptions);
      expect(trSessionCompleted).not.toHaveBeenCalled();
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

describe('createGoalsForSessionRecipientsIfNecessary hook', () => {
  const mockOptions = {
    transaction: {},
  };

  const mockInstance = {
    id: 1,
    data: {
      val: JSON.stringify({
        event: {
          id: '2',
          data: {
            goal: 'Increase knowledge about X',
          },
        },
        recipients: [{ value: '3' }],
      }),
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new goal and event report pilot goal if necessary', async () => {
    const mockSequelize = {
      models: {
        EventReportPilot: { findByPk: jest.fn(() => true) },
        Grant: { findByPk: jest.fn(() => true) },
        EventReportPilotGoal: { create: jest.fn(), findOne: jest.fn(() => null) },
        Goal: { create: jest.fn(() => ({ id: 4 })) },
        SessionReportPilot: { findOne: jest.fn(() => null) },
      },
    };

    await createGoalsForSessionRecipientsIfNecessary(mockSequelize, mockInstance, mockOptions);
    expect(mockSequelize.models.Goal.create).toHaveBeenCalled();
    expect(mockSequelize.models.Goal.create).toHaveBeenCalledWith(
      {
        createdAt: expect.any(Date),
        createdVia: 'tr',
        grantId: 3,
        name: 'Increase knowledge about X',
        source: 'Training event',
        status: 'Draft',
        updatedAt: expect.any(Date),
      },
      { transaction: {} },
    );
    expect(mockSequelize.models.EventReportPilotGoal.create).toHaveBeenCalled();
  });

  it('does not create a new goal if one already exists', async () => {
    const mockSequelize = {
      models: {
        EventReportPilot: { findByPk: jest.fn(() => true) },
        Grant: { findByPk: jest.fn(() => true) },
        EventReportPilotGoal: { findOne: jest.fn(() => true) },
        Goal: { create: jest.fn() },
        SessionReportPilot: { findOne: jest.fn(() => null) },
      },
    };

    await createGoalsForSessionRecipientsIfNecessary(mockSequelize, mockInstance, mockOptions);
    expect(mockSequelize.models.Goal.create).not.toHaveBeenCalled();
  });
});
