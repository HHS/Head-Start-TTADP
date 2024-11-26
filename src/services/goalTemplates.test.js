import faker from '@faker-js/faker';
import { GOAL_SOURCES } from '@ttahub/common';
import crypto from 'crypto';
import db from '../models';
import { setFieldPromptsForCuratedTemplate, getSourceFromTemplate } from './goalTemplates';
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

describe('goalTemplates services', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  describe('getSourceFromTemplate', () => {
    let template;
    let templateTwo;
    let grant;
    let grantTwo;
    let grantThree;
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

      grantTwo = await Grant.create({
        regionId: 2,
        status: 'Active',
        id: faker.datatype.number({ min: 56000 }),
        number: faker.datatype.string(255),
        recipientId: recipient.id,
      });

      grantThree = await Grant.create({
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
        source: GOAL_SOURCES[1],
      });

      await Goal.create({
        grantId: grant.id,
        goalTemplateId: template.id,
        name: n,
        source: GOAL_SOURCES[0],
      });

      await Goal.create({
        grantId: grantTwo.id,
        goalTemplateId: template.id,
        name: n,
      });

      const n2 = faker.lorem.sentence(5);

      const hash2 = crypto
        .createHmac('md5', secret)
        .update(n2)
        .digest('hex');

      templateTwo = await GoalTemplate.create({
        hash: hash2,
        templateName: n2,
        creationMethod: AUTOMATIC_CREATION,
      });

      await Goal.create({
        grantId: grantThree.id,
        goalTemplateId: templateTwo.id,
        name: n2,
      });
    });

    afterAll(async () => {
      await Goal.destroy({
        where: {
          goalTemplateId: [
            template.id,
            templateTwo.id,
          ],
        },
        force: true,
        paranoid: true,
        individualHooks: true,
      });
      await GoalTemplate.destroy({
        where: {
          id: [
            template.id,
            templateTwo.id],
        },
        individualHooks: true,
      });
      await Grant.destroy({
        where: {
          id: [
            grant.id,
            grantTwo.id,
            grantThree.id,
          ],
        },
        individualHooks: true,
      });
      await Recipient.destroy({ where: { id: recipient.id }, individualHooks: true });
    });

    it('returns source from the goal', async () => {
      const source = await getSourceFromTemplate(template.id, [grant.id]);

      expect(source).toBe(GOAL_SOURCES[0]);
    });
    it('returns source from the template', async () => {
      const source = await getSourceFromTemplate(template.id, [grantTwo.id]);

      expect(source).toBe(GOAL_SOURCES[1]);
    });

    it('returns null source', async () => {
      const source = await getSourceFromTemplate(template.id, [grantThree.id]);

      expect(source).toBeFalsy();
    });
  });

  describe('setFieldPromptsForCuratedTemplate', () => {
    let promptResponses;
    let template;
    let goalIds;
    let grant;
    let recipient;
    let promptId;
    let promptTitle;

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

      promptTitle = faker.datatype.string(255);

      const prompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 1,
        title: promptTitle,
        prompt: promptTitle,
        hint: '',
        options: ['option 1', 'option 2', 'option 3'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });

      promptId = prompt.id;

      promptResponses = [
        { promptId: prompt.id, response: ['option 1', 'option 2'] },
      ];

      const goal = await Goal.create({
        grantId: grant.id,
        goalTemplateId: template.id,
        name: n,
      });

      goalIds = [goal.id];
    });

    afterAll(async () => {
      await GoalFieldResponse.destroy({ where: { goalId: goalIds }, individualHooks: true });
      // eslint-disable-next-line max-len
      await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id }, individualHooks: true });
      await Goal.destroy({
        where: { goalTemplateId: template.id }, force: true, paranoid: true, individualHooks: true,
      });
      await GoalTemplate.destroy({ where: { id: template.id }, individualHooks: true });
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: recipient.id }, individualHooks: true });
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
    });

    it('should use the provided validations', async () => {
      const fieldResponses = await GoalFieldResponse.findAll({
        where: { goalId: goalIds },
        raw: true,
      });

      // test validation error (no more than 2 options can be selected)
      await expect(setFieldPromptsForCuratedTemplate(goalIds, [
        { promptId, response: ['option 1', 'option 2', 'option 3'] },
      ])).rejects.toThrow();

      // check that the field responses were not updated
      const notUpdatedFieldResponses = await GoalFieldResponse.findAll({
        where: { goalId: goalIds },
        raw: true,
      });

      expect(notUpdatedFieldResponses.length).toBe(fieldResponses.length);
      expect(notUpdatedFieldResponses[0].response).toStrictEqual(fieldResponses[0].response);
    });

    it('does nothing if the prompt doesn\'t exist', async () => {
      const fictionalId = 123454345345;
      await expect(setFieldPromptsForCuratedTemplate(goalIds, [
        { promptId: fictionalId, response: ['option 1'] },
      ])).rejects.toThrow(`No prompt found with ID ${fictionalId}`);
    });
  });
});
