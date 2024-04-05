import { SUPPORT_TYPES } from '@ttahub/common';
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
} from '../models';

import { draftObject } from './testHelpers';
import { FILE_STATUSES, OBJECTIVE_STATUS } from '../constants';
import { beforeDestroy } from './activityReportObjective';
import { processObjectiveForResourcesById, processActivityReportObjectiveForResourcesById } from '../services/resource';

describe('activityReportObjective hooks', () => {
  let ar;
  let topic;
  let objective;
  let secondObjective;
  let thirdObjective;

  let aro;
  let file;

  beforeAll(async () => {
    ar = await ActivityReport.create({ ...draftObject });

    objective = await Objective.create({
      title: 'test objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    secondObjective = await Objective.create({
      title: 'second test objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    thirdObjective = await Objective.create({
      title: 'third test objective',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
      supportType: SUPPORT_TYPES[0],
    });

    aro = await ActivityReportObjective.create({
      activityReportId: ar.id,
      objectiveId: objective.id,
      supportType: SUPPORT_TYPES[0],
    }, { individualHooks: true });

    await ActivityReportObjective.create({
      activityReportId: ar.id,
      objectiveId: secondObjective.id,
    }, { individualHooks: true });

    await ActivityReportObjective.create({
      activityReportId: ar.id,
      objectiveId: thirdObjective.id,
    }, { individualHooks: true });

    topic = await Topic.create({
      name: 'Javascript Mastery',
    });

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aro.id,
      topicId: topic.id,
    });

    await processObjectiveForResourcesById(objective.id, ['https://gnarlyfootbaths.com']);
    await processActivityReportObjectiveForResourcesById(aro.id, ['https://gnarlyfootbaths.com']);

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
      where: { objectiveId: objective.id },
    });

    await ActivityReportObjectiveTopic.destroy({
      where: { activityReportObjectiveId: aro.id },
    });

    await Topic.destroy({
      where: { id: topic.id },
    });

    await ActivityReportObjective.destroy({
      where: {
        objectiveId: [
          objective.id,
          secondObjective.id,
          thirdObjective.id,
        ],
      },
    });

    await Objective.destroy({
      where: {
        id: [
          objective.id,
          secondObjective.id,
          thirdObjective.id,
        ],
      },
      force: true,
    });

    await ActivityReport.destroy({
      where: { id: ar.id },
    });

    await sequelize.close();
  });

  describe('supportType', () => {
    it('should propogate supportType to objective', async () => {
      const objective1 = await Objective.findByPk(objective.id);
      const objective2 = await Objective.findByPk(secondObjective.id);
      const objective3 = await Objective.findByPk(thirdObjective.id);

      expect(objective1.supportType).toBe(SUPPORT_TYPES[0]);
      expect(objective2.supportType).toBe(null);
      expect(objective3.supportType).toBe(SUPPORT_TYPES[0]);
    });
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
      expect(transaction.finished).toBe('commit');
    });
  });
});
