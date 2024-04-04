import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import httpContext from 'express-http-context';
import {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
  createGoalsForSessionRecipientsIfNecessary,
  removeGoalsForSessionRecipientsIfNecessary,
  syncGoalCollaborators,
} from './sessionReportPilot';
import { trSessionCreated, trSessionCompleted, trPocSessionComplete } from '../lib/mailer';
import db from '../models';

jest.mock('../../lib/mailer', () => ({
  trSessionCreated: jest.fn(),
  trSessionCompleted: jest.fn(),
  trPocSessionComplete: jest.fn(),
}));

jest.mock('express-http-context', () => {
  const actual = jest.requireActual('express-http-context');
  return {
    ...actual,
    get: jest.fn(),
    set: jest.fn(),
  };
});

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
      event: {
        id: '2',
        data: {
          goal: 'Increase knowledge about X',
        },
      },
      recipients: [{ value: '3' }],
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new goal and event report pilot goal if necessary', async () => {
    const mockSequelize = {
      Sequelize: {
        Model: jest.fn(),
      },
      models: {
        EventReportPilot: { findByPk: jest.fn(() => true) },
        Grant: { findByPk: jest.fn(() => true) },
        EventReportPilotGoal: { create: jest.fn(), findOne: jest.fn(() => null) },
        Goal: { create: jest.fn(() => ({ id: 4 })), findOne: jest.fn(() => null) },
        SessionReportPilot: { findByPk: jest.fn(() => mockInstance), findOne: jest.fn(() => null) },
        CollaboratorType: { findOne: jest.fn(() => ({ id: 1 })) },
        GoalCollaborator: { findAll: jest.fn(() => []), create: jest.fn(), update: jest.fn() },
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
        onAR: true,
        onApprovedAR: false,
        source: 'Training event',
        status: 'Draft',
        updatedAt: expect.any(Date),
      },
      { transaction: {} },
    );
    expect(mockSequelize.models.EventReportPilotGoal.create).toHaveBeenCalled();
    expect(mockSequelize.models.CollaboratorType.findOne).toHaveBeenCalledTimes(2);
    expect(mockSequelize.models.GoalCollaborator.findAll).toHaveBeenCalledTimes(1);
    expect(mockSequelize.models.GoalCollaborator.create).toHaveBeenCalledTimes(0);
    expect(mockSequelize.models.GoalCollaborator.update).toHaveBeenCalledTimes(0);
  });

  it('does not create a new goal if one already exists', async () => {
    const mockSequelize = {
      Sequelize: {
        Model: jest.fn(),
      },
      models: {
        EventReportPilot: { findByPk: jest.fn(() => true) },
        Grant: { findByPk: jest.fn(() => true) },
        EventReportPilotGoal: { create: jest.fn(), findOne: jest.fn(() => true) },
        Goal: { create: jest.fn(), findOne: jest.fn(() => true) },
        SessionReportPilot: { findByPk: jest.fn(() => mockInstance), findOne: jest.fn(() => null) },
      },
    };

    await createGoalsForSessionRecipientsIfNecessary(mockSequelize, mockInstance, mockOptions);
    expect(mockSequelize.models.Goal.create).not.toHaveBeenCalled();
  });
});

describe('removeGoalsForSessionRecipientsIfNecessary hook', () => {
  const mockOptions = {
    transaction: {},
  };

  const mockEventReportPilotGoalEntry = {
    eventId: '2',
    sessionId: '1',
    grantId: '3',
    goalId: '4',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('removes a goal and event report pilot goal if necessary', async () => {
    const mockSequelize = {
      Sequelize: {
        Model: jest.fn(),
      },
      models: {
        EventReportPilotGoal: {
          findAll: jest.fn(() => [mockEventReportPilotGoalEntry]),
          destroy: jest.fn(),
        },
        SessionReportPilot: {
          findByPk: jest.fn(() => ({
            id: '1',
            data: {
              event: { id: '2' },
              recipients: [],
            },
          })),
        },
        ActivityReportGoal: {
          findAll: jest.fn(() => []), // No ARGs, meaning goal is not in use
        },
        Goal: {
          destroy: jest.fn(),
        },
      },
    };
    await removeGoalsForSessionRecipientsIfNecessary(mockSequelize, { id: '1' }, mockOptions);
    expect(mockSequelize.models.EventReportPilotGoal.destroy).not.toHaveBeenCalled();
    expect(mockSequelize.models.Goal.destroy).not.toHaveBeenCalled();
  });

  it('does not remove goals that are used in ARG', async () => {
    const mockSequelize = {
      Sequelize: {
        Model: jest.fn(),
      },
      models: {
        EventReportPilotGoal: {
          findAll: jest.fn(() => [mockEventReportPilotGoalEntry]),
          destroy: jest.fn(),
        },
        SessionReportPilot: {
          findByPk: jest.fn(() => ({
            id: '1',
            data: {
              event: { id: '2' },
              recipients: [], // No recipients, should trigger goal removal check
            },
          })),
        },
        ActivityReportGoal: {
          findAll: jest.fn(() => [{ goalId: '4' }]), // Presence of ARGs mean goal is in use and should not be destroyed
        },
        Goal: {
          destroy: jest.fn(),
        },
      },
    };
    await removeGoalsForSessionRecipientsIfNecessary(mockSequelize, { id: '1' }, mockOptions);
    expect(mockSequelize.models.EventReportPilotGoal.destroy).not.toHaveBeenCalled();
    expect(mockSequelize.models.Goal.destroy).not.toHaveBeenCalled();
  });
});

describe('syncGoalCollaborators', () => {
  let user;
  let newUser;
  let eventRecord;
  let goalId;
  let sessionReport;
  let transaction;

  beforeAll(async () => {
    transaction = await db.sequelize.transaction();
    user = await db.User.create({ name: 'aa bb', email: 'aabb@cc.com', hsesUsername: 'aabbcc' }, { transaction });
    newUser = await db.User.create({ name: 'cc dd', email: 'ccdd@ee.com', hsesUsername: 'ccdd' }, { transaction });
    goalId = 1;
    sessionReport = { id: 1 };
    eventRecord = { pocIds: [user.id] };

    httpContext.get.mockImplementation((key) => {
      if (key === 'loggedUser') return user.id;
      return null;
    });
  });

  afterAll(async () => {
    await db.GoalCollaborator.destroy({ where: { goalId }, transaction });
    await db.CollaboratorType.destroy({ where: { name: ['Creator', 'Linker'] }, transaction });
    await db.User.destroy({ where: { id: [user.id, newUser.id] }, transaction });
    await transaction.rollback();
    await db.sequelize.close();
  });

  it('creates a new creator collaborator if one does not exist', async () => {
    const options = { transaction };
    await syncGoalCollaborators(db.sequelize, eventRecord, goalId, sessionReport, options);

    const collaborators = await db.GoalCollaborator.findAll({
      where: {
        goalId,
        userId: user.id,
        collaboratorTypeId: 1, // 1: Creator
      },
      transaction,
    });

    expect(collaborators.length).toBe(1);
    expect(collaborators[0].userId).toBe(user.id);
  });

  it('updates an existing creator collaborator if one exists', async () => {
    const options = { transaction };
    // Set the new user as the logged user in the mocked context
    httpContext.get.mockImplementation((key) => {
      if (key === 'loggedUser') return 9999;
      return null;
    });

    // Change the eventRecord to have a different POC
    eventRecord.pocIds = [newUser.id];

    await syncGoalCollaborators(db.sequelize, eventRecord, goalId, sessionReport, options);

    const updatedCollaborator = await db.GoalCollaborator.findOne({
      where: {
        goalId,
        userId: newUser.id,
        collaboratorTypeId: 1,
      },
      transaction,
    });

    expect(updatedCollaborator.userId).toBe(newUser.id);
  });

  it('falls back to loggedUser when pocIds is empty', async () => {
    const options = { transaction };
    // Maybe the POC selection was cleared, so the eventRecord has no POC ids.
    eventRecord.pocIds = [];

    // syncGoalCollaborators falls back to the currently logged-in user's id.
    httpContext.get.mockImplementation((key) => {
      if (key === 'loggedUser') return user.id;
      return null;
    });

    await syncGoalCollaborators(db.sequelize, eventRecord, goalId, sessionReport, options);

    const collaborators = await db.GoalCollaborator.findAll({
      where: {
        goalId, userId: user.id, collaboratorTypeId: 1,
      },
      transaction,
    });

    expect(collaborators.length).toBe(1);
    expect(collaborators[0].userId).toBe(user.id);
  });
});
