import waitFor from 'wait-for-expect';
import { REPORT_STATUSES, SUPPORT_TYPES } from '@ttahub/common';
import db, {
  ActivityRecipient,
  ActivityReport,
  User,
  Objective,
  ObjectiveResource,
  ObjectiveFile,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  File,
  Resource,
  sequelize,
  Grant,
  Goal,
  Recipient,
  OtherEntity,
} from '../models';
import { FILE_STATUSES } from '../constants';

import { saveObjectivesForReport, getObjectiveById, getObjectivesByReportId } from './objectives';

jest.mock('bull');

const mockUser = {
  id: 8088,
  homeRegionId: 1,
  name: 'user8000',
  hsesUsername: 'user8000',
  hsesUserId: '8000',
  lastLogin: new Date(),
};

const reportObject = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  activityRecipientType: 'other-entity',
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  version: 2,
};

const mockGrant = {
  id: 43259435,
  number: '99CH3499',
  regionId: 2,
  status: 'Active',
  startDate: new Date('2022-07-19T15:13:00.000Z'),
  endDate: new Date('2022-07-19T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  anualFundingMonth: 'October',
};

const mockRecipient = {
  id: 654925,
  name: 'Sample Obj File Recipient',
  recipientType: 'Community Action Agency (CAA)',
};

const mockOtherEntity = {
  name: 'Mock Other Entity for OE Objectives',
};

describe('Objectives DB service', () => {
  let report;
  let objective;
  let keepAro;
  let file;
  let keepFile;
  let resource;
  let keepResource;

  let secondObjective;

  let thirdObjective;
  let thirdAro;

  let objectiveInfo;
  let grantInfo;
  let recipientInfo;
  let goalInfo;

  let otherEntity;

  let findObjectiveById;
  let findObjectiveByTitle;

  const objectives = [
    {
      id: 'uuid',
      title: 'first objective',
      ttaProvided: 'tta first',
      status: 'In Progress',
      isNew: true,
      recipientIds: [1],
      ids: ['uuid'],
      topics: [],
      resources: [],
      files: [],
    },
    {
      id: 'uuid2',
      title: 'second objective',
      ttaProvided: 'tta second',
      status: 'In Progress',
      isNew: true,
      recipientIds: [1],
      ids: ['uuid2'],
      topics: [],
      resources: [],
      files: [],
    },
  ];

  beforeAll(async () => {
    await User.create(mockUser);
    report = await ActivityReport.create(reportObject);
    objective = await Objective.create({
      title: 'title',
      ttaProvided: 'tta provided',
      status: 'Draft',
      otherEntityId: 1,
    });

    secondObjective = await Objective.create({
      title: 'second title',
      status: 'Draft',
      otherEntityId: 1,
      createdVia: 'activityReport',
    });

    thirdObjective = await Objective.create({
      title: 'third title',
      status: 'Draft',
      otherEntityId: 1,
      createdVia: 'activityReport',
    });

    keepAro = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: report.id,
      ttaProvided: 'tta provided',
      status: objective.status,
      supportType: SUPPORT_TYPES[2],
    });

    await ActivityReportObjective.create({
      objectiveId: secondObjective.id,
      activityReportId: report.id,
      status: secondObjective.status,
      supportType: SUPPORT_TYPES[2],
    });

    thirdAro = await ActivityReportObjective.create({
      objectiveId: thirdObjective.id,
      activityReportId: report.id,
      status: secondObjective.status,
      supportType: SUPPORT_TYPES[2],
    });

    // Create objective files.
    file = await File.create({
      originalFileName: 'second-objective-file.txt',
      key: 'second-objective-file.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    });
    keepFile = await File.create({
      originalFileName: 'keep-objective-file.txt',
      key: 'keep-objective-file.key',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 1234,
    });

    // Objective to delete files.
    await ObjectiveFile.create({
      objectiveId: thirdObjective.id,
      fileId: file.id,
    });
    await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: thirdAro.id,
      fileId: file.id,
    });

    await ObjectiveFile.create({
      objectiveId: thirdObjective.id,
      fileId: keepFile.id,
    });
    await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: thirdAro.id,
      fileId: keepFile.id,
    });

    // Objective to keep files.
    await ObjectiveFile.create({
      objectiveId: objective.id,
      fileId: keepFile.id,
    });
    await ActivityReportObjectiveFile.create({
      activityReportObjectiveId: keepAro.id,
      fileId: keepFile.id,
    });

    // Create resources.
    resource = await Resource.create({ url: 'https://second-obj-resource.gov' });
    keepResource = await Resource.create({ url: 'https://keep-obj-resource.gov' });

    // Create objective delete resource.
    await ObjectiveResource.create({
      objectiveId: thirdObjective.id,
      resourceId: resource.id,
      sourceFields: ['resource'],
    });
    await ObjectiveResource.create({
      objectiveId: thirdObjective.id,
      resourceId: keepResource.id,
      sourceFields: ['resource'],
    });
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: thirdAro.id,
      resourceId: resource.id,
      sourceFields: ['resource'],
    });
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: thirdAro.id,
      resourceId: keepResource.id,
      sourceFields: ['resource'],
    });

    // Create objective keep resource.
    await ObjectiveResource.create({
      objectiveId: objective.id,
      resourceId: keepResource.id,
      sourceFields: ['resource'],
    });
    await ActivityReportObjectiveResource.create({
      activityReportObjectiveId: keepAro.id,
      resourceId: keepResource.id,
      sourceFields: ['resource'],
    });

    let checkARO = await ActivityReportObjective.findOne({
      where: { objectiveId: objective.id },
    });

    await ActivityReportObjectiveResource.findOne({
      where: { activityReportObjectiveId: checkARO.id },
    });

    // Clean up unused objective resource.
    await ObjectiveResource.destroy({
      where: { resourceId: [resource.id] },
      individualHooks: true,
    });

    await sequelize.transaction(async () => {
      await saveObjectivesForReport([...objectives, {
        id: objective.id,
        title: objective.title,
        ttaProvided: 'tta provided',
        status: objective.status,
        recipientIds: [1],
        ids: [objective.id],
        files: [{ id: keepFile.id }],
        resources: [{ value: 'https://keep-obj-resource.gov' }],
        supportType: SUPPORT_TYPES[3],
      }], report);
    });

    checkARO = await ActivityReportObjective.findOne({
      where: { objectiveId: objective.id },
    });

    await ActivityReportObjectiveResource.findOne({
      where: { activityReportObjectiveId: checkARO.id },
    });

    otherEntity = await OtherEntity.create({ ...mockOtherEntity, id: 685497 });
    recipientInfo = await Recipient.create({ ...mockRecipient });
    grantInfo = await Grant.create({ ...mockGrant, recipientId: recipientInfo.id });
    goalInfo = await Goal.create({ name: 'sample goal for obj info', grantId: grantInfo.id });
    objectiveInfo = await Objective.create({ title: 'sample obj for info', goalId: goalInfo.id });
    findObjectiveById = await Objective.create({
      id: 598742,
      title: 'i already exist with an id',
      status: 'In Progress',
      otherEntityId: 1,
    });
    findObjectiveByTitle = await Objective.create({
      id: 594743,
      title: 'there are many titles but this one is mine',
      status: 'In Progress',
      otherEntityId: 1,
    });
  });

  afterAll(async () => {
    const aros = await ActivityReportObjective.findAll({ where: { activityReportId: report.id } });
    const objectiveIds = aros.map((aro) => aro.objectiveId);
    const aroIds = aros.map((aro) => aro.id);

    // Destroy objective file.
    await ActivityReportObjectiveFile.destroy({
      where: { activityReportObjectiveId: aroIds, fileId: [file.id, keepFile.id] },
    });
    await ObjectiveFile.destroy({ where: { fileId: [file.id, keepFile.id] } });
    await File.destroy({
      where: { id: [file.id, keepFile.id] },
      individualHooks: true,
    });

    // Destroy objective resource.
    await ActivityReportObjectiveResource.destroy({
      where: { activityReportObjectiveId: aroIds, resourceId: [resource.id, keepResource.id] },
    });
    await ObjectiveResource.destroy({ where: { resourceId: [resource.id, keepResource.id] } });
    await Resource.destroy({
      where: { id: [resource.id, keepResource.id] },
      individualHooks: true,
    });

    await ActivityReportObjective.destroy({ where: { activityReportId: report.id } });
    await Objective.destroy({
      where: {
        id:
          [...objectiveIds,
            objective.id,
            secondObjective.id,
            thirdObjective.id,
            findObjectiveById.id,
            findObjectiveByTitle.id,
          ],
      },
      force: true,
    });
    await ActivityRecipient.destroy({ where: { activityReportId: report.id } });
    await ActivityReport.destroy({ where: { id: report.id } });

    await Objective.destroy({ where: { id: objectiveInfo.id }, force: true });
    await Goal.destroy({ where: { id: goalInfo.id }, force: true });
    await Grant.destroy({ where: { id: grantInfo.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipientInfo.id } });
    await OtherEntity.destroy({ where: { id: otherEntity.id } });
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  describe('saveObjectivesForReport', () => {
    it('gets objective by id', async () => {
      const foundObj = await getObjectiveById(objectiveInfo.id);
      expect(foundObj).not.toBeNull();
      expect(foundObj.goal.grant.regionId).toBe(2);
    });
    it('gets objectives by report id', async () => {
      const reportObjectives = await getObjectivesByReportId(report.id);
      expect(reportObjectives).not.toBeNull();
      expect(reportObjectives.length).toBe(3);
    });
    it('deletes old objectives', async () => {
      waitFor(async () => {
        const found = await Objective.findOne({
          where: { id: secondObjective.id, title: secondObjective.title },
        });
        expect(found).toBeNull();
      });
    });

    it('deletes old activity report objectives', async () => {
      const found = await ActivityReportObjective.findOne({
        where: {
          objectiveId: secondObjective.id,
          activityReportId: report.id,
        },
      });
      expect(found).toBeNull();
    });

    it('deletes orphaned objective file', async () => {
      // Check ARO keep file wasn't deleted.
      const checkAROF = await ActivityReportObjectiveFile.findOne({
        where: { activityReportObjectiveId: keepAro.id },
      });
      expect(checkAROF).not.toBeNull();

      // Check keep objective file wasn't deleted.
      const keepObjectiveFile = await ObjectiveFile.findOne({
        where: { objectiveId: objective.id },
      });
      expect(keepObjectiveFile).not.toBeNull();

      // Check keep file wasn't deleted.
      const keepFileExists = await File.findOne({
        where: { id: keepFile.id },
      });
      expect(keepFileExists).not.toBeNull();

      // Check ARO file was deleted.
      const deletedActivityObjectiveFile = await ActivityReportObjectiveFile.findOne({
        where: { activityReportObjectiveId: thirdAro.id },
      });
      expect(deletedActivityObjectiveFile).toBeNull();

      // Check objective file was deleted.
      const deletedObjectiveFile = await ObjectiveFile.findOne({
        where: { objectiveId: thirdObjective.id },
      });
      expect(deletedObjectiveFile).toBeNull();

      // Check file was deleted.
      const deletedFile = await File.findOne({
        where: { id: file.id },
      });
      expect(deletedFile).toBeNull();
    });

    it('deletes orphaned objective resource', async () => {
      // Check ARO keep resource wasn't deleted.
      const checkAROR = await ActivityReportObjectiveResource.findOne({
        where: { activityReportObjectiveId: keepAro.id },
      });
      expect(checkAROR).not.toBeNull();

      // Check keep objective resource wasn't deleted.
      const keepObjectiveResource = await ObjectiveResource.findOne({
        where: { objectiveId: objective.id },
      });
      expect(keepObjectiveResource).not.toBeNull();

      // Check keep resource wasn't deleted.
      const keepResourceExists = await Resource.findOne({
        where: { id: keepResource.id },
      });
      expect(keepResourceExists).not.toBeNull();

      // Check ARO resource was deleted.
      const deletedActivityObjectiveResource = await ActivityReportObjectiveResource.findOne({
        where: { activityReportObjectiveId: thirdAro.id },
      });
      expect(deletedActivityObjectiveResource).toBeNull();

      // Check objective resource was deleted.
      const deletedObjectiveResource = await ObjectiveResource.findOne({
        where: { objectiveId: thirdObjective.id },
      });
      expect(deletedObjectiveResource).toBeNull();

      // Check resource was deleted.
      const deletedResource = await Resource.findOne({
        where: { id: resource.id },
      });
      expect(deletedResource).toBeNull();
    });

    it('creates new objectives and activityReportObjectives', async () => {
      const foundReport = await ActivityReport.findOne({
        where: {
          id: report.id,
        },
        include: [{
          model: Objective,
          as: 'objectivesWithoutGoals',
        }],
      });
      const objs = foundReport.objectivesWithoutGoals;
      expect(objs.length).toBe(3);
      expect(objs.map((o) => o.title).sort())
        .toEqual([objective, ...objectives].map((o) => o.title).sort());
    });
    it('finds existing objective by id', async () => {
      expect(findObjectiveById).not.toBeNull();

      await sequelize.transaction(async () => {
        await saveObjectivesForReport([{
          ...findObjectiveById,
          ids: [findObjectiveById.id],
          recipientIds: [1],
          otherEntityId: 1,
          status: 'In Progress',
          title: 'i have a new title but same id',
        }], report);
      });
      const foundObj = await getObjectiveById(findObjectiveById.id);
      expect(foundObj.title).toBe('i have a new title but same id');
    });

    it('finds existing objective by title and entity', async () => {
      expect(findObjectiveByTitle).not.toBeNull();

      await sequelize.transaction(async () => {
        await saveObjectivesForReport([{
          ...findObjectiveByTitle,
          recipientIds: [1],
          otherEntityId: 1,
          status: 'Not Started',
          title: 'there are many titles but this one is mine',
        }], report);
      });
      const foundObj = await getObjectiveById(findObjectiveByTitle.id);
      expect(foundObj.title).toBe('there are many titles but this one is mine');
      expect(foundObj.status).toBe('Not Started');
    });
  });
});
