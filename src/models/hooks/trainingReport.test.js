import { Op } from 'sequelize';
import { afterUpdate, afterCreate } from './trainingReport';
import {
  trCollaboratorAdded,
} from '../../lib/mailer';
import { auditLogger } from '../../logger';
import db from '..';
import { createUser } from '../../testUtils';

jest.mock('../../lib/mailer', () => ({
  trCollaboratorAdded: jest.fn(),
  trPocEventComplete: jest.fn(),
  trVisionComplete: jest.fn(),
}));

describe('trainingReport', () => {
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
  });
});
describe('createOrUpdateNationalCenterUserCacheTable', () => {
  const sequelize = {
    models: {
      User: {
        findAll: jest.fn(),
      },
      TrainingReportNationalCenterUser: {
        bulkCreate: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn(() => null),
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
        trainingReportId: 1,
        nationalCenterId: 10,
        nationalCenterName: 'National Center 1',
      },
      {
        userId: 5,
        userName: 'John Doe',
        trainingReportId: 1,
        nationalCenterId: 11,
        nationalCenterName: 'National Center 2',
      },
      {
        userId: 1,
        userName: 'Jane Smith',
        trainingReportId: 1,
        nationalCenterId: 10,
        nationalCenterName: 'National Center 1',
      },
      {
        userId: 2,
        userName: 'Bob Johnson',
        trainingReportId: 1,
        nationalCenterId: 11,
        nationalCenterName: 'National Center 2',
      },
    ];

    sequelize.models.User.findAll.mockResolvedValue(users);
    bulks.forEach((b, i) => {
      sequelize.models.TrainingReportNationalCenterUser.create.mockResolvedValueOnce(
        { ...b, id: i + 1 },
      );
    });

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

    bulks.forEach((bulk) => {
      expect(sequelize.models.TrainingReportNationalCenterUser.create).toHaveBeenCalledWith(
        bulk,
        { transaction: options.transaction },
      );
    });

    expect(sequelize.models.TrainingReportNationalCenterUser.destroy).toHaveBeenCalledWith({
      where: {
        trainingReportId: 1,
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

  describe('real data test', () => {
    let owner;
    let collaborator;
    let collaborator2;
    let nc;
    let nt;
    let n3;
    let newEvent;
    beforeAll(async () => {
      owner = await createUser();
      collaborator = await createUser();
      collaborator2 = await createUser();
      nc = await db.NationalCenter.create({
        name: 'Test National Center (Owner)',
      }, { individualHooks: true });
      await db.NationalCenterUser.create({
        userId: owner.id,
        nationalCenterId: nc.id,
      }, { individualHooks: true });
      nt = await db.NationalCenter.create({
        name: 'Test National Center (Collaborator)',
      }, { individualHooks: true });
      n3 = await db.NationalCenter.create({
        name: 'Test National Center (Collaborator 2)',
      }, { individualHooks: true });
      await db.NationalCenterUser.create({
        userId: collaborator.id,
        nationalCenterId: nt.id,
      }, { individualHooks: true });
      await db.NationalCenterUser.create({
        userId: collaborator2.id,
        nationalCenterId: n3.id,
      }, { individualHooks: true });
      newEvent = await db.TrainingReport.create({
        regionId: 1,
        data: {},
        ownerId: owner.id,
        collaboratorIds: [collaborator.id, collaborator2.id],
      }, { individualHooks: true });
    });

    afterAll(async () => {
      await db.TrainingReportNationalCenterUser.destroy({
        where: {
          userId: [owner.id, collaborator.id, collaborator2.id],
        },
      }, { individualHooks: true });

      await newEvent.destroy({ individualHooks: true });

      await db.NationalCenterUser.destroy({
        where: {
          userId: [owner.id, collaborator.id, collaborator2.id],
        },
      }, { individualHooks: true });

      await nc.destroy({ individualHooks: true });
      await nt.destroy({ individualHooks: true });

      await owner.destroy({ individualHooks: true });
      await collaborator.destroy({ individualHooks: true });
      await collaborator2.destroy({ individualHooks: true });
      await db.sequelize.close();
    });

    afterEach(() => jest.clearAllMocks());

    it('should create the national center user cache table', async () => {
      const e = await db.TrainingReportNationalCenterUser.findAll({
        where: {
          trainingReportId: newEvent.id,
        },
      });

      expect(e.length).toBe(3);
    });

    it('should update the national center user cache table', async () => {
      await db.NationalCenter.update({
        name: 'Test National Center (Owner) Updated',
      }, {
        where: {
          id: nc.id,
        },
        individualHooks: true,
      });
      await db.TrainingReport.update({
        data: { status: 'complete' },
        collaboratorIds: [collaborator.id],
      }, {
        where: {
          id: newEvent.id,
        },
        individualHooks: true,
      });

      const e = await db.TrainingReportNationalCenterUser.findAll({
        where: {
          trainingReportId: newEvent.id,
        },
      });

      expect(e.length).toBe(2);
    });
  });
});
