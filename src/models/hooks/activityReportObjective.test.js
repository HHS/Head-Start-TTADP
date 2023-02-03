import {
  sequelize,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  ObjectiveResource,
  Objective,
  File,
  ActivityReport,
  Topic,
} from '..';

import { draftObject } from './testHelpers';
import { FILE_STATUSES, OBJECTIVE_STATUS } from '../../constants';
import { beforeDestroy } from './activityReportObjective';

describe('activityReportObjective hooks', () => {
  let ar;
  let topic;
  let objective;
  let aro;
  let file;
  let or;

  beforeAll(async () => {
    ar = await ActivityReport.create({ ...draftObject });

    objective = await Objective.create({
      title: 'test objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    aro = await ActivityReportObjective.create({
      activityReportId: ar.id,
      objectiveId: objective.id,
    });

    topic = await Topic.create({
      name: 'Javascript Mastery',
    });

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aro.id,
      topicId: topic.id,
    });

    or = await ObjectiveResource.create({
      objectiveId: objective.id,
      userProvidedUrl: 'https://gnarlyfootbaths.com',
    });

    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: aro.id,
      objectiveResourceId: or.id,
      userProvidedUrl: 'https://gnarlyfootbaths.com',
    });

    file = await File.create({
      originalFileName: 'the-last-spreadsheet-anyone-will-ever-need.xlsx',
      key: 'the-last-spreadsheet-anyone-will-ever-need.xlsx',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });

    await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: aro.id,
      fileId: file.id,
    });
  });

  afterAll(async () => {
    await ActivityReportObjectiveFile.destroy({
      where: { activityReportObjectiveId: aro.id },
    });

    await File.destroy({
      where: { id: file.id },
    });

    await ActivityReportObjectiveResource.destroy({
      where: { activityReportObjectiveId: aro.id },
    });

    await ObjectiveResource.destroy({
      where: { id: or.id },
    });

    await ActivityReportObjectiveTopic.destroy({
      where: { activityReportObjectiveId: aro.id },
    });

    await Topic.destroy({
      where: { id: topic.id },
    });

    await ActivityReportObjective.destroy({
      where: { id: aro.id },
    });

    await Objective.destroy({
      where: { id: objective.id },
    });

    await ActivityReport.destroy({
      where: { id: ar.id },
    });

    await sequelize.close();
  });

  describe('beforeDestroy', () => {
    it('should propagate destroy to metadata', async () => {
      const transaction = await sequelize.transaction();

      await beforeDestroy(sequelize, { id: aro.id }, { transaction });

      const aroFiles = await ActivityReportObjectiveFile.findAll({
        where: { activityReportObjectiveId: aro.id },
        transaction,
      });

      const aroResources = await ActivityReportObjectiveResource.findAll({
        where: { activityReportObjectiveId: aro.id },
        transaction,
      });

      const aroTopics = await ActivityReportObjectiveTopic.findAll({
        where: { activityReportObjectiveId: aro.id },
        transaction,
      });

      await transaction.commit();

      expect(aroFiles.length).toBe(0);
      expect(aroResources.length).toBe(0);
      expect(aroTopics.length).toBe(0);
    });
  });
});
