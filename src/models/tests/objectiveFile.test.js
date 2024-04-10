import faker from '@faker-js/faker';
import db from '..';
import {
  beforeValidate, afterCreate, beforeDestroy, afterDestroy,
} from '../../hooks/objectiveFile';
import { FILE_STATUSES } from '../../constants';

jest.mock('../../hooks/objectiveFile', () => ({
  beforeValidate: jest.fn(),
  afterCreate: jest.fn(),
  beforeDestroy: jest.fn(),
  afterDestroy: jest.fn(),
}));

const {
  sequelize, Objective, File, ObjectiveFile,
} = db;

describe('objectiveFile', () => {
  let file;
  let objective;

  beforeAll(async () => {
    file = await File.create({
      originalFileName: faker.system.fileName(),
      key: faker.system.fileName(),
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    });
    objective = await Objective.create({
      name: `Test Objective ${faker.random.words(10)}`,
      status: 'In Progress',
    });

    await ObjectiveFile.create({
      fileId: file.id,
      objectiveId: objective.id,
    }, { individualHooks: true });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await ObjectiveFile.destroy({
      where: {
        objectiveId: objective.id,
      },
    });
    await Objective.destroy({ where: { id: objective.id }, force: true });
    await File.destroy({ where: { id: file.id }, force: true });
    await sequelize.close();
  });

  it('calls hooks', async () => {
    expect(beforeValidate).toHaveBeenCalledTimes(1);
    expect(afterCreate).toHaveBeenCalledTimes(1);

    await ObjectiveFile.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    expect(beforeDestroy).toHaveBeenCalledTimes(1);
    expect(afterDestroy).toHaveBeenCalledTimes(1);
  });
});
