import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import httpContext, { set } from 'express-http-context';
import { literal } from 'sequelize';
import {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
  syncGoalCollaborators,
  checkIfBothIstAndPocAreComplete,
} from './sessionReportPilot';
import { trSessionCreated, trSessionCompleted, trPocSessionComplete } from '../../lib/mailer';
import db, { sequelize } from '..';

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

    it('notifySessionComplete if completed', async () => {
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
          SessionReportPilot: {
            findByPk: jest.fn(() => ({
              data: { recipients: [] },
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
      expect(trSessionCompleted).not.toHaveBeenCalled();
    });

    it('sets the SessionReportPilot status to complete if both owner and poc are complete', async () => {
      const setMock = jest.fn();
      const mockSequelize = {
        literal: setMock,
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
          SessionReportPilot: {
          },
        },
      };
      const mockInstanceSet = jest.fn();
      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          ownerComplete: true,
          pocComplete: false,
        })),
        set: mockInstanceSet,
        data: {
          val: JSON.stringify({
            ownerComplete: true,
            pocComplete: true,
          }),
        },
      };

      await checkIfBothIstAndPocAreComplete(mockSequelize, instance, mockOptions);

      // JSON.parse the value that mockSet was called with
      expect(setMock).toHaveBeenCalledWith('CAST(\'{"ownerComplete":true,"pocComplete":true,"status":"Complete"}\' AS jsonb)');
    });

    it('sets the SessionReportPilot status to in progress if both owner and poc are not complete', async () => {
      const setMock = jest.fn();
      const mockSequelize = {
        literal: setMock,
        models: {
          EventReportPilot: {
            findOne: jest.fn(() => ({
              update: mockUpdate,
            })),
          },
          SessionReportPilot: {
          },
        },
      };
      const mockInstanceSet = jest.fn();
      const instance = {
        eventId: 1,
        changed: jest.fn(() => ['data']),
        previous: jest.fn(() => ({
          ownerComplete: false,
          pocComplete: false,
        })),
        set: mockInstanceSet,
        data: {
          val: JSON.stringify({
            ownerComplete: false,
            pocComplete: false,
          }),
        },
      };

      await checkIfBothIstAndPocAreComplete(mockSequelize, instance, mockOptions);

      // JSON.parse the value that mockSet was called with
      expect(setMock).toHaveBeenCalledWith("CAST('{\"ownerComplete\":false,\"pocComplete\":false,\"status\":\"In progress\"}' AS jsonb)");
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
