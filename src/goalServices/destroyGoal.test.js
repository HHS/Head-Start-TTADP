import faker from '@faker-js/faker';
import { destroyGoal } from './goals';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ObjectiveResource,
  ActivityReport,
  Resource,
  ObjectiveFile,
  File,
} from '../models';
import { processObjectiveForResourcesById } from '../services/resource';
import { auditLogger } from '../logger';
import { FILE_STATUSES } from '../constants';

describe('destroyGoal handler', () => {
  const oldFindAll = ActivityReport.findAll;

  let goal;
  let goalTwo;
  let recipient;
  let objective;
  let file;

  let grant = {
    id: faker.datatype.number({ min: 67000, max: 68000 }),
    number: faker.random.alphaNumeric(10),
    cdi: false,
    regionId: 1,
    startDate: new Date(),
    endDate: new Date(),
  };

  beforeAll(async () => {
    recipient = await Recipient.create({ name: `recipient${faker.datatype.number()}`, id: faker.datatype.number({ min: 67000, max: 68000 }), uei: faker.datatype.string(12) });
    grant = await Grant.create({ ...grant, recipientId: recipient.id });
    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
      grantId: grant.id,
    });

    goalTwo = await Goal.create({
      name: 'This is another goal',
      status: 'Not Started',
      grantId: grant.id,
    });

    objective = await Objective.create({
      goalId: goal.id,
      status: 'Not Started',
      title: 'Make everything ok',
    });

    await processObjectiveForResourcesById(objective.id, ['http://website.com']);

    file = await File.create({
      originalFileName: 'obj-file-cleanup.xlsx',
      key: 'obj-file-cleanup.xlsx',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });

    await ObjectiveFile.create({
      objectiveId: objective.id,
      fileId: file.id,
      sourceFields: ['file'],
    });
  });

  afterAll(async () => {
    await ObjectiveResource.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    await ObjectiveFile.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    await Resource.destroy({
      where: {
        url: 'http://website.com',
      },
      individualHooks: true,
    });

    await File.destroy({
      where: {
        id: file.id,
      },
      individualHooks: true,
    });

    await Objective.destroy({
      where: {
        goalId: goal.id,
      },
      individualHooks: true,
      force: true,
    });

    await Goal.destroy({
      where: {
        id: [goal.id, goalTwo.id],
      },
      individualHooks: true,
      force: true,
    });

    await Grant.destroy({
      where: {
        id: grant.id,
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
      individualHooks: true,
    });

    jest.clearAllMocks();

    await db.sequelize.close();
  });

  it('destroys goals and associated data', async () => {
    let foundGoal = await Goal.findAll({
      where: {
        id: goal.id,
      },
    });

    let foundObjective = await Objective.findAll({
      where: {
        goalId: goal.id,
      },
    });

    let foundObjectiveResource = await ObjectiveResource.findAll({
      where: {
        objectiveId: objective.id,
      },
      include: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
        where: { url: 'http://website.com' },
      }],
    });

    let foundObjectiveFile = await ObjectiveFile.findAll({
      where: {
        objectiveId: objective.id,
      },
      include: [{
        attributes: ['originalFileName'],
        model: File,
        as: 'file',
        where: { id: file.id },
      }],
    });

    expect(foundGoal.length).toBe(1);
    // expect(foundGrantGoal.length).toBe(1);
    expect(foundObjective.length).toBe(1);
    expect(foundObjectiveResource.length).toBe(1);
    expect(foundObjectiveFile.length).toBe(1);

    const result = await destroyGoal(goal.id);
    expect(result.objectivesDestroyed).toBe(1);
    expect(result.objectiveResourcesDestroyed).toBe(1);
    expect(result.goalsDestroyed).toBe(1);
    expect(result.objectiveFilesDestroyed).toBe(1);

    foundGoal = await Goal.findAll({
      where: {
        id: goal.id,
      },
    });

    foundObjective = await Objective.findAll({
      where: {
        goalId: goal.id,
      },
    });

    foundObjectiveResource = await ObjectiveResource.findAll({
      where: {
        objectiveId: objective.id,
      },
      include: [{
        attributes: ['url'],
        model: Resource,
        as: 'resource',
        where: { url: 'http://website.com' },
      }],
    });

    foundObjectiveFile = await ObjectiveFile.findAll({
      where: {
        objectiveId: objective.id,
      },
      include: [{
        attributes: ['originalFileName'],
        model: File,
        as: 'file',
        where: { id: file.id },
      }],
    });

    expect(foundGoal.length).toBe(0);
    expect(foundObjective.length).toBe(0);
    expect(foundObjectiveResource.length).toBe(0);
    expect(foundObjectiveFile.length).toBe(0);
  });

  it('wont delete a goal if its on an AR', async () => {
    ActivityReport.findAll = jest.fn().mockResolvedValue([1]);
    const spy = jest.spyOn(auditLogger, 'error');
    const result = await destroyGoal(goalTwo.id);

    const foundGoal = await Goal.findByPk(goalTwo.id);
    expect(foundGoal).toBeTruthy();

    expect(result).toBe(0);
    expect(spy).toBeCalledWith(
      'SERVICE:GOALS - Sequelize error - unable to delete from db - Error: Goal is on an activity report and can\'t be deleted',
    );
    ActivityReport.findAll = oldFindAll;
  });

  it('handles invalid ids', async () => {
    const result = await destroyGoal('fish');
    expect(result).toBe(0);
  });
});
