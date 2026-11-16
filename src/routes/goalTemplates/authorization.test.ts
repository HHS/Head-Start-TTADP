import type { Request, Response } from 'express';
import { CREATION_METHOD, GOAL_STATUS } from '../../constants';
import { goalRegionsById } from '../../goalServices/goals';
import SCOPES from '../../middleware/scopeConstants';
import db from '../../models';
import { getUserReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { createRecipient, createRegion, getUniqueId } from '../../testUtils';
import { getPrompts } from './handlers';

jest.mock('../../services/accessValidation', () => ({ getUserReadRegions: jest.fn() }));
jest.mock('../../services/currentUser', () => ({ currentUserId: jest.fn() }));
jest.mock('../../services/users', () => ({ userById: jest.fn() }));

const {
  Goal,
  Grant,
  Recipient,
  Region,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  sequelize,
} = db;

describe('prompt authorization for mapped goals', () => {
  let regions;
  let recipient;
  let grants;
  let template;
  let accessibleGoal;
  let mappedGoal;
  let initialized = false;

  beforeAll(async () => {
    await sequelize.transaction(async () => {
      regions = await Promise.all([
        createRegion({ id: getUniqueId() }),
        createRegion({ id: getUniqueId() }),
      ]);
      recipient = await createRecipient({});
      grants = await Promise.all(
        regions.map((region) =>
          Grant.create(
            {
              id: getUniqueId(),
              number: `auth-${getUniqueId()}`,
              regionId: region.id,
              recipientId: recipient.id,
            },
            { hooks: false }
          )
        )
      );
      template = await GoalTemplate.create(
        {
          hash: `auth-${getUniqueId()}`,
          templateName: 'Prompt authorization regression',
          creationMethod: CREATION_METHOD.CURATED,
          templateNameModifiedAt: new Date(),
        },
        { hooks: false }
      );
      const goalFields = {
        name: 'Prompt authorization regression',
        goalTemplateId: template.id,
        status: GOAL_STATUS.NOT_STARTED,
        isFromSmartsheetTtaPlan: false,
      };
      accessibleGoal = await Goal.create(
        { ...goalFields, grantId: grants[0].id },
        { hooks: false }
      );
      mappedGoal = await Goal.create(
        {
          ...goalFields,
          grantId: grants[1].id,
          mapsToParentGoalId: accessibleGoal.id,
        },
        { hooks: false }
      );
      const prompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 1,
        title: 'Root cause',
        prompt: 'Select root cause',
        fieldType: 'multiselect',
      });
      await Promise.all([
        GoalFieldResponse.create(
          {
            goalId: accessibleGoal.id,
            goalTemplateFieldPromptId: prompt.id,
            response: ['Authorized response'],
            onAR: false,
            onApprovedAR: false,
          },
          { hooks: false }
        ),
        GoalFieldResponse.create(
          {
            goalId: mappedGoal.id,
            goalTemplateFieldPromptId: prompt.id,
            response: ['Cross-region response'],
            onAR: false,
            onApprovedAR: false,
          },
          { hooks: false }
        ),
      ]);
    });
    initialized = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(currentUserId).mockResolvedValue(1);
    // never rely on whichever user happens to have id 1 in the shared database
    jest.mocked(userById).mockResolvedValue({
      permissions: [{ regionId: regions[0].id, scopeId: SCOPES.READ_REPORTS }],
    });
    jest.mocked(getUserReadRegions).mockResolvedValue([regions[0].id]);
  });

  afterAll(async () => {
    try {
      if (initialized) {
        await sequelize.transaction(async () => {
          await GoalFieldResponse.destroy({
            where: { goalId: [accessibleGoal.id, mappedGoal.id] },
            hooks: false,
          });
          await Goal.unscoped().destroy({
            where: { id: mappedGoal.id },
            force: true,
            hooks: false,
          });
          await Goal.unscoped().destroy({
            where: { id: accessibleGoal.id },
            force: true,
            hooks: false,
          });
          await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id } });
          await GoalTemplate.destroy({ where: { id: template.id }, hooks: false });
          await Grant.destroy({ where: { id: grants.map((grant) => grant.id) }, hooks: false });
          await Recipient.destroy({ where: { id: recipient.id }, hooks: false });
          await Region.destroy({ where: { id: regions.map((region) => region.id) } });
        });
      }
    } finally {
      await sequelize.close();
    }
  });

  it('resolves mapped goal regions even when the goal is soft deleted', async () => {
    await mappedGoal.destroy({ hooks: false });
    try {
      expect(await goalRegionsById([accessibleGoal.id, mappedGoal.id])).toEqual(
        expect.arrayContaining(regions.map((region) => region.id))
      );
    } finally {
      await mappedGoal.restore({ hooks: false });
    }
  });

  it.each(['false', 'true', undefined])(
    'rejects a mixed-region request before returning responses (%s)',
    async (flag) => {
      const req = {
        params: { goalTemplateId: String(template.id) },
        query: {
          goalIds: [String(accessibleGoal.id), String(mappedGoal.id)],
          isForActivityReport: flag,
        },
      };
      const res = { sendStatus: jest.fn(), json: jest.fn() };
      await getPrompts(req as unknown as Request, res as unknown as Response);
      expect(res.sendStatus).toHaveBeenCalledWith(403);
      expect(res.json).not.toHaveBeenCalled();
    }
  );

  it('lets an administrator read responses across regions', async () => {
    jest.mocked(userById).mockResolvedValue({
      permissions: [{ regionId: regions[0].id, scopeId: SCOPES.ADMIN }],
    });
    const req = {
      params: { goalTemplateId: String(template.id) },
      query: {
        goalIds: [String(accessibleGoal.id), String(mappedGoal.id)],
        isForActivityReport: 'false',
      },
    };
    const res = { sendStatus: jest.fn(), json: jest.fn() };
    await getPrompts(req as unknown as Request, res as unknown as Response);
    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('still returns authorized curated responses', async () => {
    const req = {
      params: { goalTemplateId: String(template.id) },
      query: { goalIds: String(accessibleGoal.id), isForActivityReport: 'false' },
    };
    const res = { sendStatus: jest.fn(), json: jest.fn() };
    await getPrompts(req as unknown as Request, res as unknown as Response);
    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([
      [expect.objectContaining({ response: ['Authorized response'] })],
      null,
    ]);
  });
});
