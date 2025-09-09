import { Op } from 'sequelize';
import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  BAD_REQUEST,
  UNAUTHORIZED,
} from 'http-codes';
import db from '../../models';
import { userById } from '../../services/users';
import getGoalsMissingDataForActivityReportSubmission from '../../goalServices/getGoalsMissingDataForActivityReportSubmission';
import SCOPES from '../../middleware/scopeConstants';
import {
  changeGoalStatus,
  createGoals,
  retrieveObjectiveOptionsByGoalTemplate,
  deleteGoal,
  createGoalsForReport,
  getMissingDataForActivityReport,
  createGoalsFromTemplate,
  getGoalHistory,
} from './handlers';
import {
  updateGoalStatusById,
  createOrUpdateGoals,
  destroyGoal,
  goalByIdWithActivityReportsAndRegions,
  createOrUpdateGoalsForActivityReport,
  goalsByIdsAndActivityReport,
} from '../../goalServices/goals';
import goalsFromTemplate from '../../goalServices/goalsFromTemplate';
import { currentUserId } from '../../services/currentUser';

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../goalServices/goals', () => ({
  updateGoalStatusById: jest.fn(),
  createOrUpdateGoals: jest.fn(),
  goalByIdWithActivityReportsAndRegions: jest.fn(),
  goalByIdAndRecipient: jest.fn(),
  destroyGoal: jest.fn(),
  createOrUpdateGoalsForActivityReport: jest.fn(),
  goalsByIdsAndActivityReport: jest.fn(),
  goalRegionsById: jest.fn(),
  getGoalsMissingDataForActivityReportSubmission: jest.fn(),
}));

jest.mock('../../goalServices/getGoalsMissingDataForActivityReportSubmission', () => jest.fn());

jest.mock('../../goalServices/goalsFromTemplate', () => jest.fn());

jest.mock('../../goalServices/changeGoalStatus', () => jest.fn());

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/accessValidation');

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
    send: jest.fn(),
  })),
};

describe('goal handlers', () => {
  afterAll(() => db.sequelize.close());

  describe('createGoalsFromTemplate', () => {
    it('checks permissions', async () => {
      const req = {
        body: {
          regionId: 1,
        },
        params: {
          goalTemplateId: 1,
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      await createGoalsFromTemplate(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('handles success', async () => {
      const req = {
        body: {
          regionId: 1,
        },
        params: {
          goalTemplateId: 1,
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      goalsFromTemplate.mockResolvedValueOnce([1]);

      await createGoalsFromTemplate(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith([1]);
    });

    it('sad path', async () => {
      const req = {
        body: {
          regionId: 1,
        },
        params: {
          goalTemplateId: 1,
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      goalsFromTemplate.mockRejectedValue(new Error('Big time error'));

      await createGoalsFromTemplate(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('createGoals', () => {
    afterAll(async () => {
      jest.clearAllMocks();
      userById.mockReset();
    });

    it('checks permissions', async () => {
      const req = {
        body: {
          goals: [{
            goalId: 2,
            recipientId: 2,
          }],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      await createGoals(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('handles success', async () => {
      const req = {
        body: {
          goals: [{
            goalId: 2,
            recipientId: 2,
            regionId: 2,
          }],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      createOrUpdateGoals.mockResolvedValueOnce({});
      await createGoals(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({});
    });

    it('handles failures', async () => {
      const req = {
        body: {
          goals: [{
            goalId: 2,
            recipientId: 2,
            regionId: 2,
          }],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      createOrUpdateGoals.mockImplementationOnce(() => {
        throw new Error();
      });

      await createGoals(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('getMissingDataForActivityReport', () => {
    afterAll(async () => {
      jest.clearAllMocks();
      userById.mockReset();
    });

    it('checks permissions', async () => {
      const req = {
        params: {
          regionId: 2,
        },
        query: {
          goalIds: [1, 2],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      await getMissingDataForActivityReport(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('handles success', async () => {
      const req = {
        params: {
          regionId: 2,
        },
        query: {
          goalIds: [1, 2],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      getGoalsMissingDataForActivityReportSubmission.mockResolvedValueOnce({});
      await getMissingDataForActivityReport(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({});
    });

    it('handles failures', async () => {
      const req = {
        params: {
          regionId: 2,
        },
        query: {
          goalIds: [1, 2],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      getGoalsMissingDataForActivityReportSubmission.mockImplementationOnce(() => {
        throw new Error();
      });

      await getMissingDataForActivityReport(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('changeGoalStatus', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      userById.mockReset();
      goalByIdWithActivityReportsAndRegions.mockReset();
    });
    const goalWhere = { name: 'My updated goal' };

    it('updates status goal by id', async () => {
      const req = {
        body: {
          goalIds: [100000],
          newStatus: 'New Status',
          closeSuspendReason: 'TTA complete',
          closeSuspendContext: 'Sample context.',
          regionId: 2,
        },
        session: {
          userId: 1,
        },
      };
      updateGoalStatusById.mockResolvedValueOnce(goalWhere);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      goalByIdWithActivityReportsAndRegions.mockResolvedValue({
        objectives: [],
        grant: { regionId: 2 },
      });

      await changeGoalStatus(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(goalWhere);
    });

    it('returns a bad request when the goal status cannot be so updated', async () => {
      const req = {
        body: {
          goalIds: [100000],
          newStatus: 'New Status',
          closeSuspendReason: 'TTA complete',
          closeSuspendContext: 'Sample context.',
          regionId: 2,
        },
        session: {
          userId: 1,
        },
      };
      updateGoalStatusById.mockResolvedValueOnce(false);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      goalByIdWithActivityReportsAndRegions.mockResolvedValue({
        objectives: [],
        grant: { regionId: 2 },
      });

      await changeGoalStatus(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(BAD_REQUEST);
    });

    it('returns a 401 based on permissions checks', async () => {
      const req = {
        body: {
          goalIds: [100000],
          newStatus: 'New Status',
          closeSuspendReason: 'TTA complete',
          closeSuspendContext: 'Sample context.',
          regionId: 1,
        },
        session: {
          userId: 1,
        },
      };
      updateGoalStatusById.mockResolvedValue(goalWhere);
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      goalByIdWithActivityReportsAndRegions.mockResolvedValue({
        objectives: [],
        grant: { regionId: 2 },
      });

      await changeGoalStatus(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('returns a 404 when a goal can\'t be found', async () => {
      const req = {
        body: {
          goalIds: [100000],
          newStatus: 'New Status',
          closeSuspendReason: 'TTA complete',
          closeSuspendContext: 'Sample context.',
          regionId: 2,
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      goalByIdWithActivityReportsAndRegions.mockResolvedValue(null);

      updateGoalStatusById.mockResolvedValue(null);
      await changeGoalStatus(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
    });

    it('returns a 500 on error', async () => {
      const req = {
      };
      await changeGoalStatus(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });

    it('automatically suspends in-progress objectives when goal is suspended', async () => {
      db.Objective.update = jest.fn().mockResolvedValue([1, [{ id: 1 }]]);
      const req = {
        body: {
          goalIds: [100000],
          newStatus: 'Suspended',
          closeSuspendReason: 'Temporarily paused',
          closeSuspendContext: 'Will resume later',
          oldStatus: 'In Progress',
        },
        session: {
          userId: 1,
        },
      };

      updateGoalStatusById.mockResolvedValueOnce({ id: 100000, status: 'Suspended' });
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      goalByIdWithActivityReportsAndRegions.mockResolvedValue({
        objectives: [],
        grant: { regionId: 2 },
      });

      await changeGoalStatus(req, mockResponse);

      expect(db.Objective.update).toHaveBeenCalledWith(
        {
          status: 'Suspended',
          closeSuspendReason: 'Temporarily paused',
          closeSuspendContext: 'Will resume later',
        },
        {
          where: {
            goalId: 100000,
            status: 'In Progress',
          },
          individualHooks: true,
        },
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ id: 100000, status: 'Suspended' });
    });
  });

  describe('deleteGoal', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.resetModules();
    });

    it('checks permissions', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
        objectives: [],
        grant: { regionId: 2 },
      });

      await deleteGoal(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('handles success', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
        objectives: [],
        grant: { regionId: 2 },
      });

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      destroyGoal.mockResolvedValueOnce(1);
      await deleteGoal(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(1);
    });

    it('handles no goal to delete', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
        objectives: [],
        grant: { regionId: 2 },
      });

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      destroyGoal.mockResolvedValueOnce(0);
      await deleteGoal(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
    });

    it('handles failures', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
        objectives: [],
        grants: [{ regionId: 2 }],
      });

      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      destroyGoal.mockImplementationOnce(() => {
        throw new Error('This is an error');
      });

      await deleteGoal(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('createGoalsForReport', () => {
    it('handles success', async () => {
      const req = {
        body: {
          activityReportId: 1,
          regionId: 2,
          goals: [
            {
              name: 'Goal 1',
              objectives: [
                {
                  name: 'Objective 1',
                },
              ],
            },
          ],
        },
        session: {
          userId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      createOrUpdateGoalsForActivityReport.mockResolvedValueOnce(1);
      await createGoalsForReport(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(1);
    });

    it('rejects based on permissions', async () => {
      const req = {
        body: {
          activityReportId: 1,
          regionId: 2,
          goals: [
            {
              name: 'Goal 1',
              objectives: [
                {
                  name: 'Objective 1',
                },
              ],
            },
          ],
        },
        session: {
          userId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [],
      });

      await createGoalsForReport(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('handles errors', async () => {
      const req = {
        body: {
          activityReportId: 1,
          regionId: 2,
          goals: [
            {
              name: 'Goal 1',
              objectives: [
                {
                  name: 'Objective 1',
                },
              ],
            },
          ],
        },
        session: {
          userId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      });

      createOrUpdateGoalsForActivityReport.mockImplementationOnce(() => {
        throw new Error('a test error for the goals handler');
      });
      await createGoalsForReport(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('retrieveObjectiveOptionsByGoalTemplate', () => {
    beforeAll(() => {
      db.ActivityReport.findByPk = jest.fn();
    });
    it('successfully returns the deduplicated objectives for the standard goal', async () => {
      const req = {
        query: {
          goalTemplateId: 1,
        },
        session: {
          userId: 1,
        },
      };

      db.ActivityReport.findByPk.mockResolvedValueOnce({
        id: 1,
        grants: [{ id: 2, regionId: 2 }],
      });

      // Mock Goal.findAll once to return a object.
      db.Goal.findAll = jest.fn().mockResolvedValueOnce([
        {
          id: 1,
          name: 'Goal 1',
          grant: { id: 1, regionId: 1 },
        },
        {
          id: 2,
          name: 'Goal 2',
          grant: { id: 2, regionId: 1 },
        },
      ]);

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });
      goalsByIdsAndActivityReport.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Goal 1',
          objectives: [
            {
              id: 1,
              title: 'Objective 1',
            },
          ],
        },
        {
          id: 2,
          name: 'Goal 2',
          objectives: [
            {
              id: 2,
              title: 'Objective 2',
            },
          ],
        },
      ]);

      await retrieveObjectiveOptionsByGoalTemplate(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith([
        { id: 1, title: 'Objective 1' },
        { id: 2, title: 'Objective 2' },
      ]);
    });
    it('rejects based on permissions', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      db.ActivityReport.findByPk.mockResolvedValueOnce({
        id: 1,
        grants: [{ id: 2, regionId: 2 }],
      });

      // Mock Goal.findAll once to return a object.
      db.Goal.findAll = jest.fn().mockResolvedValueOnce([
        {
          id: 1,
          name: 'Goal 1',
          grant: { id: 1, regionId: 1 },
        },
        {
          id: 2,
          name: 'Goal 2',
          grant: { id: 2, regionId: 2 }, // Wrong region should trigger permission error.
        },
      ]);

      goalByIdWithActivityReportsAndRegions.mockResolvedValue({
        objectives: [],
        grant: { regionId: 2 },
      });

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [],
      });

      await retrieveObjectiveOptionsByGoalTemplate(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    });

    it('handles goals not found', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.ActivityReport.findByPk.mockResolvedValueOnce({
        id: 1,
        grants: [{ id: 2, regionId: 2 }],
      });

      // Mock Goal.findAll once to return a object.
      db.Goal.findAll = jest.fn().mockResolvedValueOnce([]);

      goalsByIdsAndActivityReport.mockResolvedValueOnce([]);

      await retrieveObjectiveOptionsByGoalTemplate(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });

    it('the reducer returning null', async () => {
      const req = {
        query: {
          goalIds: [1],
        },
        session: {
          userId: 1,
        },
      };

      db.ActivityReport.findByPk.mockResolvedValueOnce({
        id: 1,
        grants: [{ id: 2, regionId: 2 }],
      });

      // Mock Goal.findAll once to return a object.
      db.Goal.findAll = jest.fn().mockResolvedValueOnce([
        {
          id: 1,
          name: 'Goal 1',
          grant: { id: 1, regionId: 1 },
        },
        {
          id: 2,
          name: 'Goal 2',
          grant: { id: 2, regionId: 1 },
        },
      ]);

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      goalsByIdsAndActivityReport.mockResolvedValueOnce(null);

      await retrieveObjectiveOptionsByGoalTemplate(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });

    it('handles error', async () => {
      const req = {
        query: {
          goalTemplateId: 1,
        },
        session: {
          userId: 1,
        },
      };

      db.ActivityReport.findByPk.mockResolvedValueOnce({
        id: 1,
        grants: [{ id: 2, regionId: 2 }],
      });

      // Mock Goal.findAll once to return a object.
      db.Goal.findAll = jest.fn().mockResolvedValueOnce([
        {
          id: 1,
          name: 'Goal 1',
          grant: { id: 1, regionId: 1 },
        },
        {
          id: 2,
          name: 'Goal 2',
          grant: { id: 2, regionId: 1 },
        },
      ]);

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      goalsByIdsAndActivityReport.mockImplementationOnce(() => {
        throw new Error('a test error for the goals handler');
      });

      await retrieveObjectiveOptionsByGoalTemplate(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('getGoalHistory', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      currentUserId.mockReset();
      userById.mockReset();
      db.Goal.findByPk = jest.fn();
      db.Grant.findByPk = jest.fn();
      db.Goal.findAll = jest.fn();
    });

    it('handles success', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      const mockGoalsWithDetails = [
        {
          id: 1,
          name: 'Goal 1',
          status: 'In Progress',
          statusChanges: [
            {
              id: 1,
              oldStatus: 'Draft',
              newStatus: 'In Progress',
              user: {
                name: 'Test User',
              },
            },
          ],
        },
      ];

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);
      db.Goal.findAll.mockResolvedValueOnce(mockGoalsWithDetails);

      await getGoalHistory(req, mockResponse);

      expect(db.Goal.findByPk).toHaveBeenCalledWith(1);
      expect(db.Grant.findByPk).toHaveBeenCalledWith(100);
      expect(db.Goal.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          goalTemplateId: 10,
          grantId: 100,
          [Op.or]: [
            {
              createdVia: { [Op.ne]: 'activityReport' },
            },
            {
              onApprovedAR: true,
            },
          ],
        },
      }));
      expect(mockResponse.json).toHaveBeenCalledWith(mockGoalsWithDetails);
    });

    it('returns 404 when goal is not found', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(null);

      await getGoalHistory(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
    });

    it('returns 404 when grant is not found', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(null);

      await getGoalHistory(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
    });

    it('returns 401 when user does not have permission in the region', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 3, // Different region than the grant
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);

      await getGoalHistory(req, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(UNAUTHORIZED);
    });

    it('returns empty array when no goals with same template are found', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);
      db.Goal.findAll.mockResolvedValueOnce([]);

      await getGoalHistory(req, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });

    it('handles errors', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await getGoalHistory(req, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });

    it('ensures only objectives with createdVia = "rtr" or onApprovedAR = true are queried', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);
      db.Goal.findAll.mockResolvedValueOnce([]);

      await getGoalHistory(req, mockResponse);

      expect(db.Goal.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              as: 'objectives',
              required: false,
              where: {
                [Op.or]: [
                  { createdVia: 'rtr' },
                  { onApprovedAR: true },
                ],
              },
            }),
          ]),
        }),
      );
    });

    it('ensures only approved activity reports are included', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);
      db.Goal.findAll.mockResolvedValueOnce([]);

      await getGoalHistory(req, mockResponse);

      // Check that activity reports in objectives are filtered by approved status
      expect(db.Goal.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              as: 'objectives',
              include: expect.arrayContaining([
                expect.objectContaining({
                  as: 'activityReportObjectives',
                  include: expect.arrayContaining([
                    expect.objectContaining({
                      as: 'activityReport',
                      where: {
                        calculatedStatus: 'approved',
                      },
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('excludes prestandard goals from history queries', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
        prestandard: false,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);
      db.Goal.findAll.mockResolvedValueOnce([]);

      await getGoalHistory(req, mockResponse);

      expect(db.Goal.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prestandard: false,
          }),
        }),
      );
    });

    it('only retrieves prestandard goals when requested goal is prestandard', async () => {
      const req = {
        params: {
          goalId: '1',
        },
        session: {
          userId: 1,
        },
      };

      const mockGoal = {
        id: 1,
        goalTemplateId: 10,
        grantId: 100,
        prestandard: true,
      };

      const mockGrant = {
        id: 100,
        regionId: 2,
      };

      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      });

      db.Goal.findByPk.mockResolvedValueOnce(mockGoal);
      db.Grant.findByPk.mockResolvedValueOnce(mockGrant);
      db.Goal.findAll.mockResolvedValueOnce([]);

      await getGoalHistory(req, mockResponse);

      expect(db.Goal.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            goalTemplateId: 10,
            grantId: 100,
            prestandard: true,
          }),
        }),
      );
    });
  });
});
