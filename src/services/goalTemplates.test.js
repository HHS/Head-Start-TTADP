import faker from '@faker-js/faker';
import crypto from 'crypto';
import db from '../models';
import { setFieldPromptsForCuratedTemplate } from './goalTemplates';
import { AUTOMATIC_CREATION } from '../constants';

const {
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Grant,
  Recipient,
  sequelize,
} = db;

describe('setFieldPromptsForCuratedTemplate', () => {
  let promptResponses;
  let template;
  let goalIds;
  let grant;
  let recipient;

  beforeAll(async () => {
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 56000 }),
      name: faker.datatype.string(20),
    });

    grant = await Grant.create({
      regionId: 2,
      status: 'Active',
      id: faker.datatype.number({ min: 56000 }),
      number: faker.datatype.string(255),
      recipientId: recipient.id,
    });

    const n = faker.lorem.sentence(5);

    const secret = 'secret';
    const hash = crypto
      .createHmac('md5', secret)
      .update(n)
      .digest('hex');

    template = await GoalTemplate.create({
      hash,
      templateName: n,
      creationMethod: AUTOMATIC_CREATION,
    });

    const promptTitle = faker.datatype.string(255);

    const prompt = await GoalTemplateFieldPrompt.create({
      goalTemplateId: template.id,
      ordinal: 1,
      title: promptTitle,
      prompt: promptTitle,
      hint: '',
      options: ['option 1', 'option 2', 'option 3'],
      fieldType: 'multiselect',
      fieldValidations: {},
    });

    promptResponses = [
      { promptId: prompt.id, response: ['option 1', 'option 2'] },
    ];

    const goal = await Goal.create({
      grantId: grant.id,
      templateId: template.id,
      name: n,
    });

    goalIds = [goal.id];
  });

  afterAll(async () => {
    await GoalFieldResponse.destroy({ where: { goalId: goalIds } });
    await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id } });
    await Goal.destroy({ where: { templateId: template.id } });
    await GoalTemplate.destroy({ where: { id: template.id } });
    await Grant.destroy({ where: { id: grant.id } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await sequelize.close();
  });

  it('should call setFieldPromptForCuratedTemplate for each prompt response', async () => {
    // save initial field responses
    await setFieldPromptsForCuratedTemplate(goalIds, promptResponses);

    // check that the field responses were saved
    const fieldResponses = await GoalFieldResponse.findAll({
      where: { goalId: goalIds },
    });

    expect(fieldResponses.length).toBe(promptResponses.length);
    expect(fieldResponses[0].response).toEqual(promptResponses[0].response);

    const { promptId } = promptResponses[0];

    // update field responses
    await setFieldPromptsForCuratedTemplate(goalIds, [
      { promptId, response: ['option 1'] },
    ]);

    // check that the field responses were updated
    const updatedFieldResponses = await GoalFieldResponse.findAll({
      where: { goalId: goalIds },
    });

    expect(updatedFieldResponses.length).toBe(promptResponses.length);
    expect(updatedFieldResponses[0].response).toEqual(['option 1']);

    // test validation error (no more than 2 options can be selected)
    await expect(setFieldPromptsForCuratedTemplate(goalIds, [
      { promptId, response: ['option 1', 'option 2', 'option 3'] },
    ])).rejects.toThrow('Validation error');

    // check that the field responses were not updated
    const notUpdatedFieldResponses = await GoalFieldResponse.findAll({
      where: { goalId: goalIds },
    });

    expect(notUpdatedFieldResponses.length).toBe(promptResponses.length);
    expect(notUpdatedFieldResponses[0].response).toEqual(['option 1']);

    // remove field responses
    await setFieldPromptsForCuratedTemplate(goalIds, [
      { promptId, response: [] },
    ]);

    // check that the field responses were removed
    const removedFieldResponses = await GoalFieldResponse.findAll({
      where: { goalId: goalIds },
    });

    expect(removedFieldResponses.length).toBe(0);
  });
});
