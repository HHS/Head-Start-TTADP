import fs from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db, {
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Grant,
  Program,
  Recipient,
} from '../../../../models';
import { AUTOMATIC_CREATION, PROMPT_FIELD_TYPE } from '../../../../constants';
import {
  createGoal,
  getUniqueId,
} from '../../../../testUtils';
import { setFilters } from '../../../../services/ssdi';

const FEI_TEMPLATE_ID = 19017;

const sqlContent = (() => {
  const raw = fs.readFileSync(path.join(__dirname, 'fei.sql'), 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//, '').trim();
})();

const runWithFilters = (filterValues) => db.sequelize.transaction(async () => {
  await setFilters(filterValues);
  return db.sequelize.query(sqlContent, { type: QueryTypes.SELECT });
});

const getDataset = (result, dataSet) => result.find((d) => d.data_set === dataSet);

describe('fei.sql dataset selection', () => {
  let recipient;
  let grant;
  let program;
  let goal;
  let prompt;
  let response;

  beforeAll(async () => {
    await GoalTemplate.findOrCreate({
      where: { id: FEI_TEMPLATE_ID },
      defaults: {
        id: FEI_TEMPLATE_ID,
        hash: `qa-fei-${FEI_TEMPLATE_ID}`,
        templateName: 'QA FEI Test Template',
        creationMethod: AUTOMATIC_CREATION,
        templateNameModifiedAt: new Date(),
      },
    });

    prompt = await GoalTemplateFieldPrompt.create({
      goalTemplateId: FEI_TEMPLATE_ID,
      ordinal: 1,
      title: 'Root cause',
      prompt: 'Root cause',
      fieldType: PROMPT_FIELD_TYPE.MULTISELECT,
      options: ['Workforce'],
      validations: {},
    });

    recipient = await Recipient.create({
      id: getUniqueId(),
      name: `QA FEI Recipient ${getUniqueId()}`,
      uei: `QAFEI${getUniqueId(1000, 9999)}`,
    });

    grant = await Grant.create({
      id: getUniqueId(),
      number: `QAFEI-${getUniqueId()}`,
      regionId: 1,
      recipientId: recipient.id,
      status: 'Active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
    }, { individualHooks: true });

    program = await Program.create({
      id: getUniqueId(),
      grantId: grant.id,
      programType: 'HS',
      status: 'Active',
    });

    goal = await createGoal({
      grantId: grant.id,
      goalTemplateId: FEI_TEMPLATE_ID,
      status: 'In Progress',
      createdAt: new Date('2025-01-15'),
    });

    response = await GoalFieldResponse.create({
      goalId: goal.id,
      goalTemplateFieldPromptId: prompt.id,
      response: ['Workforce'],
    });
  });

  afterAll(async () => {
    if (response) {
      await GoalFieldResponse.destroy({ where: { id: response.id }, force: true });
    }
    if (prompt) {
      await GoalTemplateFieldPrompt.destroy({ where: { id: prompt.id }, force: true });
    }
    if (goal) {
      await db.Goal.destroy({ where: { id: goal.id }, force: true, individualHooks: true });
    }
    if (program) {
      await Program.destroy({ where: { id: program.id } });
    }
    if (grant) {
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    }
    if (recipient) {
      await Recipient.destroy({ where: { id: recipient.id } });
    }
  });

  it('returns only the widget dataset when only with_fei_widget is requested', async () => {
    const result = await runWithFilters({
      region: [1],
      grantNumber: [grant.number],
      dataSetSelection: ['with_fei_widget'],
    });

    expect(result.map((d) => d.data_set)).toEqual(['with_fei_widget']);

    const widget = getDataset(result, 'with_fei_widget');
    expect(widget.data[0]).toMatchObject({
      total: 1,
      'recipients with fei': 1,
      '% recipients with fei': 100.00,
      'grants with fei': 1,
    });
  });

  it('returns graph data when only with_fei_graph is requested', async () => {
    const result = await runWithFilters({
      region: [1],
      grantNumber: [grant.number],
      dataSetSelection: ['with_fei_graph'],
    });

    expect(result.map((d) => d.data_set)).toEqual(['with_fei_graph']);

    const graph = getDataset(result, 'with_fei_graph');
    expect(graph.data).toEqual([
      expect.objectContaining({
        rootCause: 'Workforce',
        percentage: 100,
      }),
    ]);
    expect(graph.data[0].response_count).toBeGreaterThan(0);
  });
});
