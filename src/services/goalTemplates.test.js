import faker from '@faker-js/faker';
import { GOAL_SOURCES } from '@ttahub/common';
import crypto from 'crypto';
import db from '../models';
import {
  setFieldPromptsForCuratedTemplate,
  getSourceFromTemplate,
  getCuratedTemplates,
  getFieldPromptsForCuratedTemplate,
  getOptionsByGoalTemplateFieldPromptName,
  setFieldPromptForCuratedTemplate,
} from './goalTemplates';
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

  describe('getCuratedTemplates', () => {
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

      await GoalTemplate.create({
        templateName: faker.lorem.sentence(5),
        creationMethod: AUTOMATIC_CREATION,
      });
    });

    afterAll(async () => {
      await GoalTemplate.destroy({ where: {}, individualHooks: true });
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: recipient.id }, individualHooks: true });
    });

    it('retrieves curated templates', async () => {
      const templates = await getCuratedTemplates([grant.id]);
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
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

  describe('setFieldPromptForCuratedTemplate', () => {
    let template;
    let goal;
    let grant;
    let recipient;
    let prompt;

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

      prompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 1,
        title: faker.datatype.string(255),
        prompt: faker.datatype.string(255),
        hint: '',
        options: ['option 1', 'option 2', 'option 3'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });

      goal = await Goal.create({
        grantId: grant.id,
        goalTemplateId: template.id,
        name: n,
      });
    });

    afterAll(async () => {
      await GoalFieldResponse.destroy({ where: { goalId: goal.id }, individualHooks: true });
      // eslint-disable-next-line max-len
      await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id }, individualHooks: true });
      // eslint-disable-next-line max-len, object-curly-newline
      await Goal.destroy({ where: { goalTemplateId: template.id }, force: true, paranoid: true, individualHooks: true });
      await GoalTemplate.destroy({ where: { id: template.id }, individualHooks: true });
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: recipient.id }, individualHooks: true });
    });

    it('rejects invalid response values', async () => {
      const invalidResponse = ['invalid option'];
      await expect(setFieldPromptForCuratedTemplate([goal.id], prompt.id, invalidResponse))
        .rejects.toThrow(`Response for '${prompt.title}' contains invalid values. Invalid values: 'invalid option'.`);
    });

    it('handles missing maxSelections rule gracefully', async () => {
      const response = ['option 1'];
      const promptWithNoMaxSelections = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 2,
        title: faker.datatype.string(255),
        prompt: faker.datatype.string(255),
        hint: '',
        options: ['option 1', 'option 2', 'option 3'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'minSelections', value: 1, message: 'You must select at least 1 option' }] },
      });

      // eslint-disable-next-line max-len
      await expect(setFieldPromptForCuratedTemplate([goal.id], promptWithNoMaxSelections.id, response))
        .resolves.not.toThrow();
    });

    it('returns Promise.resolve() when there are no updates or records to create', async () => {
      const newPrompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 3,
        title: faker.datatype.string(255),
        prompt: faker.datatype.string(255),
        hint: '',
        options: ['option 7', 'option 8', 'option 9'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });
      const result = await setFieldPromptForCuratedTemplate([], newPrompt.id, null);
      expect(result).toBeUndefined();
    });
  });

  describe('getFieldPromptsForCuratedTemplate', () => {
    let template;
    let goal;
    let grant;
    let recipient;
    let prompt;
    let promptTwo;

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

      prompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 1,
        title: faker.datatype.string(255),
        prompt: faker.datatype.string(255),
        hint: '',
        options: ['option 1', 'option 2', 'option 3'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });

      promptTwo = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 2,
        title: faker.datatype.string(255),
        prompt: faker.datatype.string(255),
        hint: '',
        options: ['option 4', 'option 5', 'option 6'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });

      goal = await Goal.create({
        grantId: grant.id,
        goalTemplateId: template.id,
        name: n,
      });

      await GoalFieldResponse.create({
        goalId: goal.id,
        goalTemplateFieldPromptId: prompt.id,
        response: ['option 1'],
      });

      await GoalFieldResponse.create({
        goalId: goal.id,
        goalTemplateFieldPromptId: promptTwo.id,
        response: ['option 4'],
      });
    });

    afterAll(async () => {
      await GoalFieldResponse.destroy({ where: { goalId: goal.id }, individualHooks: true });
      // eslint-disable-next-line max-len
      await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id }, individualHooks: true });
      // eslint-disable-next-line max-len, object-curly-newline
      await Goal.destroy({ where: { goalTemplateId: template.id }, force: true, paranoid: true, individualHooks: true });
      await GoalTemplate.destroy({ where: { id: template.id }, individualHooks: true });
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
      await Recipient.destroy({ where: { id: recipient.id }, individualHooks: true });
    });

    it('retrieves field prompts for a curated template', async () => {
      const prompts = await getFieldPromptsForCuratedTemplate(template.id, [goal.id]);
      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].promptId).toBe(prompt.id);
    });

    it('restructures prompts with responses', async () => {
      const prompts = await getFieldPromptsForCuratedTemplate(template.id, [goal.id]);
      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);

      const promptWithResponse = prompts.find((p) => p.promptId === prompt.id);
      const promptWithoutResponse = prompts.find((p) => p.promptId === promptTwo.id);

      expect(promptWithResponse).toBeDefined();
      expect(promptWithResponse.response).toEqual(['option 1']);

      expect(promptWithoutResponse).toBeDefined();
      expect(promptWithoutResponse.response).toEqual(['option 4']);
    });

    it('returns prompts with existing responses', async () => {
      const existingResponse = ['existing response'];
      const promptWithExistingResponse = await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 3,
        title: faker.datatype.string(255),
        prompt: faker.datatype.string(255),
        hint: '',
        options: ['option 7', 'option 8', 'option 9'],
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });

      await GoalFieldResponse.create({
        goalId: goal.id,
        goalTemplateFieldPromptId: promptWithExistingResponse.id,
        response: existingResponse,
      });

      const prompts = await getFieldPromptsForCuratedTemplate(template.id, [goal.id]);
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const prompt = prompts.find((p) => p.promptId === promptWithExistingResponse.id);

      expect(prompt).toBeDefined();
      expect(prompt.response).toEqual(existingResponse);
    });
  });

  describe('getOptionsByGoalTemplateFieldPromptName', () => {
    let template;
    let promptTitle;
    let options;

    beforeAll(async () => {
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
      options = ['option 1', 'option 2', 'option 3'];

      await GoalTemplateFieldPrompt.create({
        goalTemplateId: template.id,
        ordinal: 1,
        title: promptTitle,
        prompt: promptTitle,
        hint: '',
        options,
        fieldType: 'multiselect',
        validations: { required: 'Select a root cause', rules: [{ name: 'maxSelections', value: 2, message: 'You can only select 2 options' }] },
      });
    });

    afterAll(async () => {
      // eslint-disable-next-line max-len
      await GoalTemplateFieldPrompt.destroy({ where: { goalTemplateId: template.id }, individualHooks: true });
      await GoalTemplate.destroy({ where: { id: template.id }, individualHooks: true });
    });

    it('retrieves options by goal template field prompt name', async () => {
      const result = await getOptionsByGoalTemplateFieldPromptName(promptTitle);
      expect(result).toBeDefined();
      expect(result.options).toEqual(options);
    });
  });
});
