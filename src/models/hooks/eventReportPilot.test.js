import { Op } from 'sequelize';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { afterUpdate, afterCreate } from './eventReportPilot';
import {
  trCollaboratorAdded,
  trPocAdded,
  trPocEventComplete,
  trVisionAndGoalComplete,
} from '../../lib/mailer';
import { auditLogger } from '../../logger';

jest.mock('../../lib/mailer', () => ({
  trCollaboratorAdded: jest.fn(),
  trPocAdded: jest.fn(),
  trPocEventComplete: jest.fn(),
  trVisionAndGoalComplete: jest.fn(),
}));

describe('eventReportPilot', () => {
  const mockOptions = {
    transaction: {},
  };

  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('afterUpdate', () => {
    describe('notifyNewCollaborators', () => {
      it('notifies new collaborators', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          collaboratorIds: [1, 2],
          changed: jest.fn(() => ['collaboratorIds']),
          previous: jest.fn(() => [1]),
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trCollaboratorAdded).toHaveBeenCalled();
      });
      it('does not notify owner if owner is collaborator', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          collaboratorIds: [1, 5],
          changed: jest.fn(() => ['collaboratorIds']),
          previous: jest.fn(() => [1]),
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trCollaboratorAdded).not.toHaveBeenCalled();
      });
      it('does not call if collaboratorIds is not changed', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          collaboratorIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => [1]),
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trCollaboratorAdded).not.toHaveBeenCalled();
      });
      it('handles errors', async () => {
        const instance = {};
        await afterUpdate(null, instance, mockOptions);
        expect(trCollaboratorAdded).not.toHaveBeenCalled();
      });
    });

    describe('notifyNewPoc', () => {
      it('notifies new poc', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 2],
          changed: jest.fn(() => ['pocIds']),
          previous: jest.fn(() => [1]),
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocAdded).toHaveBeenCalled();
      });

      it('does not call if there are no new pocIds', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 2],
          changed: jest.fn(() => ['pocIds']),
          previous: jest.fn(() => [1, 2]),
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocAdded).not.toHaveBeenCalled();
      });

      it('does not call if pocIds is not in changed', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => []),
          previous: jest.fn(() => [1]),
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocAdded).not.toHaveBeenCalled();
      });
      it('handles errors', async () => {
        const instance = {};
        await afterUpdate(null, instance, mockOptions);
        expect(trPocAdded).not.toHaveBeenCalled();
      });
    });
    describe('notifyPocEventComplete', () => {
      it('notifies poc when the event is complete', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => ({
            status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              status: TRAINING_REPORT_STATUSES.COMPLETE,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocEventComplete).toHaveBeenCalled();
      });
      it('does not notify poc when the event is not complete', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => ({
            status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocEventComplete).not.toHaveBeenCalled();
      });
      it('does not notify poc when the event is already complete', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => ({
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              status: TRAINING_REPORT_STATUSES.COMPLETE,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocEventComplete).not.toHaveBeenCalled();
      });
      it('does not notify poc when data is not in changed', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => []),
          previous: jest.fn(() => ({
            status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              status: TRAINING_REPORT_STATUSES.COMPLETE,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trPocEventComplete).not.toHaveBeenCalled();
      });
      it('handles errors', async () => {
        await afterUpdate(null, null, mockOptions);
        expect(trPocEventComplete).not.toHaveBeenCalled();
      });
    });
    describe('notifyVisionAndGoalComplete', () => {
      it('notifies when the poc marks event complete', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => ({
            pocComplete: false,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              pocComplete: true,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trVisionAndGoalComplete).toHaveBeenCalled();
      });
      it('does not notify when the poc does not mark event complete', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => ({
            pocComplete: false,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              pocComplete: false,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trVisionAndGoalComplete).not.toHaveBeenCalled();
      });
      it('quits when changed doesn\'t have data in it', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          pocIds: [1, 5],
          changed: jest.fn(() => []),
          previous: jest.fn(() => ({
            pocComplete: false,
          })),
          dataValues: {},
          data: {
            val: JSON.stringify({
              pocComplete: true,
            }),
          },
        };
        await afterUpdate(null, instance, mockOptions);
        expect(trVisionAndGoalComplete).not.toHaveBeenCalled();
      });
      it('handles errors', async () => {
        await afterUpdate(null, null, mockOptions);
        expect(trVisionAndGoalComplete).not.toHaveBeenCalled();
      });
    });
  });
});
describe('createOrUpdateNationalCenterUserCacheTable', () => {
  const sequelize = {
    models: {
      User: {
        findAll: jest.fn(),
      },
      EventReportPilotNationalCenterUser: {
        bulkCreate: jest.fn(),
        destroy: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
      },
    },
  };

  const instance = {
    id: 1,
    ownerId: 5,
    collaboratorIds: [1, 2],
  };

  const options = {
    transaction: {},
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create or update the national center user cache table', async () => {
    const users = [
      {
        id: 5,
        name: 'John Doe',
        nationalCenters: [
          {
            id: 10,
            name: 'National Center 1',
          },
          {
            id: 11,
            name: 'National Center 2',
          },
        ],
      },
      {
        id: 1,
        name: 'Jane Smith',
        nationalCenters: [
          {
            id: 10,
            name: 'National Center 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Bob Johnson',
        nationalCenters: [
          {
            id: 11,
            name: 'National Center 2',
          },
        ],
      },
    ];

    const bulks = [
      {
        userId: 5,
        userName: 'John Doe',
        eventReportPilotId: 1,
        nationalCenterId: 10,
        nationalCenterName: 'National Center 1',
      },
      {
        userId: 5,
        userName: 'John Doe',
        eventReportPilotId: 1,
        nationalCenterId: 11,
        nationalCenterName: 'National Center 2',
      },
      {
        userId: 1,
        userName: 'Jane Smith',
        eventReportPilotId: 1,
        nationalCenterId: 10,
        nationalCenterName: 'National Center 1',
      },
      {
        userId: 2,
        userName: 'Bob Johnson',
        eventReportPilotId: 1,
        nationalCenterId: 11,
        nationalCenterName: 'National Center 2',
      },
    ];

    sequelize.models.User.findAll.mockResolvedValue(users);
    sequelize.models.EventReportPilotNationalCenterUser.bulkCreate.mockResolvedValue(
      bulks.map((b, i) => ({ id: i + 1, ...b })),
    );

    await afterCreate(sequelize, instance, options);

    expect(sequelize.models.User.findAll).toHaveBeenCalledWith({
      where: {
        id: [5, 1, 2],
      },
      include: [
        {
          model: sequelize.models.NationalCenter,
          as: 'nationalCenters',
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.EventReportPilotNationalCenterUser.bulkCreate).toHaveBeenCalledWith(
      bulks,
      {
        updateOnDuplicate: ['updatedAt', 'userName', 'nationalCenterName'],
        transaction: options.transaction,
        ignoreDuplicates: true,
      },
    );

    expect(sequelize.models.EventReportPilotNationalCenterUser.destroy).toHaveBeenCalledWith({
      where: {
        eventReportPilotId: 1,
        id: {
          [Op.notIn]: [1, 2, 3, 4],
        },
      },
      transaction: options.transaction,
    });
  });

  it('should handle errors', async () => {
    const error = new Error('Database error');
    sequelize.models.User.findAll.mockRejectedValue(error);
    jest.spyOn(auditLogger, 'error');
    await afterCreate(sequelize, instance, options);
    expect(auditLogger.error).toHaveBeenCalledWith(JSON.stringify({ err: error }));
  });
});
