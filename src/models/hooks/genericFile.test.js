import {
  sequelize,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ObjectiveTemplate,
  ObjectiveTemplateFile,
  ObjectiveFile,
  Objective,
  File,
  ActivityReport,
  ActivityReportFile,
} from '..';
import { FILE_STATUSES, OBJECTIVE_STATUS } from '../../constants';
import { propagateDestroyToFile } from './genericFile';
import { draftObject, objectiveTemplateGenerator } from './testHelpers';

describe('propagateDestroyToFile', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('should delete the file if it is not associated with any other models', async () => {
    const file = await File.create({
      originalFileName: 'test.pdf',
      key: 'test.pdf',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });

    const mockInstance = {
      fileId: file.id,
    };

    const transaction = await sequelize.transaction();

    const mockOptions = {
      transaction,
    };

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions);

    const foundFile = await File.findOne({
      where: { id: file.id },
      transaction,
    });

    expect(foundFile).toBeNull();

    await transaction.commit();
  });

  it('won\'t destroy the file if its on a report', async () => {
    const ar = await ActivityReport.create({ ...draftObject });
    const file = await File.create({
      originalFileName: 'test.pdf',
      key: 'test.pdf',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });

    await ActivityReportFile.create({
      activityReportId: ar.id,
      fileId: file.id,
    });

    const mockInstance = {
      fileId: file.id,
    };

    const transaction = await sequelize.transaction();

    const mockOptions = {
      transaction,
    };

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions);

    const foundFile = await File.findOne({
      where: { id: file.id },
      transaction,
    });

    expect(foundFile).not.toBeNull();

    await ActivityReportFile.destroy({
      where: { activityReportId: ar.id, fileId: file.id },
    });

    await File.destroy({
      where: { id: file.id },
    });

    await ActivityReport.destroy({
      where: { id: ar.id },
    });

    await transaction.commit();
  });

  it('won\'t destroy the file if its on a report objective', async () => {
    const transaction = await sequelize.transaction();

    const ar = await ActivityReport.create({ ...draftObject }, { transaction });
    const objective = await Objective.create({
      title: 'test',
      status: OBJECTIVE_STATUS.DRAFT,
    }, { transaction });

    const file = await File.create({
      originalFileName: 'test.pdf',
      key: 'test.pdf',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    }, { transaction });

    const aro = await ActivityReportObjective.create({
      activityReportId: ar.id,
      objectiveId: objective.id,
    }, { transaction });

    await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: aro.id,
      fileId: file.id,
    }, { transaction });

    const mockInstance = {
      fileId: file.id,
    };

    const mockOptions = {
      transaction,
    };

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions);

    const foundFile = await File.findOne({
      where: { id: file.id },
      transaction,
    });

    expect(foundFile).not.toBeNull();

    // rollback deletes all the created files :)
    await transaction.rollback();
  });

  it('won\'t destroy the file if its on an objective', async () => {
    const objective = await Objective.create({
      title: 'test',
      status: OBJECTIVE_STATUS.DRAFT,
    });

    const file = await File.create({
      originalFileName: 'test.pdf',
      key: 'test.pdf',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });

    await ObjectiveFile.create({
      objectiveId: objective.id,
      fileId: file.id,
    });

    const mockInstance = {
      fileId: file.id,
    };

    const transaction = await sequelize.transaction();
    const mockOptions = {
      transaction,
    };

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions);

    const foundFile = await File.findOne({
      where: { id: file.id },
      transaction,
    });

    expect(foundFile).not.toBeNull();

    await ObjectiveFile.destroy({
      where: { objectiveId: objective.id, fileId: file.id },
      transaction,
    });

    await Objective.destroy({
      where: { id: objective.id },
      transaction,
    });

    await File.destroy({
      where: { id: file.id },
      transaction,
    });

    await transaction.commit();
  });

  it('won\'t destroy the file if its on an objective template', async () => {
    const objectiveTemplate = await ObjectiveTemplate.create(
      objectiveTemplateGenerator('genericFileTest'),
    );

    const file = await File.create({
      originalFileName: 'test.pdf',
      key: 'test.pdf',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });

    await ObjectiveTemplateFile.create({
      objectiveTemplateId: objectiveTemplate.id,
      fileId: file.id,
    });

    const mockInstance = {
      fileId: file.id,
    };

    const transaction = await sequelize.transaction();
    const mockOptions = {
      transaction,
    };

    await propagateDestroyToFile(sequelize, mockInstance, mockOptions);

    const foundFile = await File.findOne({
      where: { id: file.id },
      transaction,
    });

    expect(foundFile).not.toBeNull();

    await ObjectiveTemplateFile.destroy({
      where: { objectiveTemplateId: objectiveTemplate.id, fileId: file.id },
      transaction,
    });

    await ObjectiveTemplate.destroy({
      where: { id: objectiveTemplate.id },
      transaction,
    });

    await File.destroy({
      where: { id: file.id },
      transaction,
    });

    await transaction.commit();
  });
});
