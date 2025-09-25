import faker from '@faker-js/faker';
import { EVENT_REPORT_STATUSES } from '@ttahub/common';
import db from '../models';
import {
  findAll,
  create,
  updateById,
  deleteById,
} from './nationalCenters';
import { auditLogger } from '../logger';

jest.spyOn(auditLogger, 'info');
jest.mock('../models/hooks/sessionReport');

describe('nationalCenters service', () => {
  afterAll(() => {
    db.sequelize.close();
  });

  describe('findAll', () => {
    const centerOneName = faker.lorem.words(8);
    const centerTwoName = faker.lorem.words(8);
    let centers;
    beforeAll(async () => {
      centers = await db.NationalCenter.bulkCreate([
        { name: centerOneName },
        { name: centerTwoName },
      ]);
    });

    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: centers.map((center) => center.id),
        },
        force: true,
      });
    });

    it('returns all nationalCenters', async () => {
      const results = await findAll();

      expect(results.length).toBeGreaterThanOrEqual(2);
      const names = results.map((center) => center.name);
      expect(names).toContain(centerOneName);
      expect(names).toContain(centerTwoName);
    });
  });

  describe('create', () => {
    let center;
    const centerName = faker.lorem.words(8);
    let mockNcUser;
    beforeEach(async () => {
      // Create mock user.
      mockNcUser = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });
    });

    afterEach(async () => {
      // Destroy NationalCenterUser.
      await db.NationalCenterUser.destroy({
        where: {
          nationalCenterId: center.id,
        },
      });

      // Destroy User.
      await db.User.destroy({
        where: {
          id: mockNcUser.id,
        },
      });

      // Destroy NationalCenter.
      await db.NationalCenter.destroy({
        where: {
          id: center.id,
        },
        force: true,
      });
    });

    it('creates a nationalCenter without a user', async () => {
      center = await create({ name: centerName }, null);
      expect(center.name).toBe(centerName);
    });

    it('creates a nationalCenter with a user', async () => {
      center = await create({ name: centerName }, mockNcUser.id);
      expect(center.name).toBe(centerName);
      expect(center.users.length).toBe(1);
      expect(center.users[0].name).toBe(mockNcUser.name);
    });
  });

  describe('updateById', () => {
    let center;
    const originalCenterName = faker.lorem.words(8);
    const newCenterName = faker.lorem.words(8);
    const ids = [];
    let firstCenterUser;
    let secondCenterUser;
    beforeEach(async () => {
      // Create first mock users.
      firstCenterUser = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });
      // Create second mock users.
      secondCenterUser = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      // Create National Center.
      center = await db.NationalCenter.create({ name: originalCenterName });
      ids.push(center.id);

      // Create National Center Users.
      await db.NationalCenterUser.create({
        nationalCenterId: center.id,
        userId: firstCenterUser.id,
      });
    });

    afterEach(async () => {
      // Destroy national center users.
      await db.NationalCenterUser.destroy({
        where: {
          nationalCenterId: center.id,
        },
      });

      // Destroy National.
      await db.NationalCenter.destroy({
        where: {
          id: ids,
        },
        force: true,
      });

      // Destroy users.
      await db.User.destroy({
        where: {
          id: [firstCenterUser.id, secondCenterUser.id],
        },
      });
    });

    it('updates a nationalCenter', async () => {
      center = await updateById(center.id, { name: newCenterName, userId: secondCenterUser.id });
      ids.push(center.id);
      expect(center.name).toBe(newCenterName);
      expect(center.users.length).toBe(1);
      expect(center.users[0].id).toBe(secondCenterUser.id);
      expect(center.users[0].name).toBe(secondCenterUser.name);
    });

    it('updates a nationalCenter with no user', async () => {
      await db.NationalCenterUser.destroy({
        where: {
          nationalCenterId: center.id,
        },
      });
      center = await updateById(center.id, {
        name: originalCenterName, userId: secondCenterUser.id,
      });
      ids.push(center.id);
      expect(center.name).toBe(originalCenterName);
      expect(auditLogger.info).toHaveBeenCalledWith(
        `Name ${center.name} has not changed`,
      );
      expect(center.users.length).toBe(1);
      expect(center.users[0].id).toBe(secondCenterUser.id);
      expect(center.users[0].name).toBe(secondCenterUser.name);
    });

    it('doesn\'t update if name hasn\'t changed', async () => {
      center = await updateById(center.id, {
        name: originalCenterName,
        userId: firstCenterUser.id,
      });
      ids.push(center.id);
      expect(center.name).toBe(originalCenterName);
      expect(auditLogger.info).toHaveBeenCalledWith(
        `Name ${center.name} has not changed`,
      );
      expect(auditLogger.info).toHaveBeenCalledWith(
        `Name ${center.name} has not changed the national center user`,
      );
    });
    it('destroy user if removed', async () => {
      center = await updateById(center.id, {
        name: originalCenterName,
        userId: null,
      });
      ids.push(center.id);
      expect(center.name).toBe(originalCenterName);
      expect(auditLogger.info).toHaveBeenCalledWith(
        `Name ${center.name} has not changed`,
      );
      expect(center.users.length).toBe(0);
    });
  });

  describe('updateById with the firing of hooks', () => {
    let center1;
    const centerOneName = faker.lorem.words(8);
    let center2;
    const centerTwoName = faker.lorem.words(8);
    let center3;
    const centerThreeName = faker.lorem.words(8);
    let eventReport1;
    let eventReport2;
    let sessionReport;
    let sessionReport2;
    const ids = [];

    beforeAll(async () => {
      center1 = await db.NationalCenter.create({ name: centerOneName });
      center2 = await db.NationalCenter.create({ name: centerTwoName });
      center3 = await db.NationalCenter.create({ name: centerThreeName });

      eventReport1 = await db.TrainingReport.create({
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3, 4],
        regionId: [1],
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
        },
        imported: {},
      });

      eventReport2 = await db.TrainingReport.create({
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3, 4],
        regionId: [1],
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
        },
        imported: {},
      });

      sessionReport = await db.SessionReport.create({
        eventId: eventReport1.id,
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
          objectiveTrainers: [center1.name, center2.name],
        },
      });
      sessionReport2 = await db.SessionReport.create({
        eventId: eventReport2.id,
        data: {
          status: EVENT_REPORT_STATUSES.COMPLETE,
          objectiveTrainers: [center1.name, center2.name, center3.name],
        },
      });

      await eventReport2.update({
        data: {
          status: EVENT_REPORT_STATUSES.COMPLETE,
        },
      });
    });

    afterAll(async () => {
      await db.SessionReport.destroy({
        where: {
          id: [sessionReport.id, sessionReport2.id],
        },
      });

      await db.TrainingReport.destroy({
        where: {
          id: [eventReport1.id, eventReport2.id],
        },
      });

      await db.NationalCenter.destroy({
        where: {
          id: [center1.id, center2.id, center3.id, ...ids],
        },
        force: true,
      });
    });

    it('updates a nationalCenter and the proper session report', async () => {
      const newCenterName = faker.lorem.words(8);
      center1 = await updateById(center1.id, { name: newCenterName });
      ids.push(center1.id);
      expect(center1.name).toBe(newCenterName);

      const updatedSessionReport = await db.SessionReport.findByPk(sessionReport.id);
      expect(
        updatedSessionReport.data.objectiveTrainers.sort(),
      ).toEqual([newCenterName, center2.name].sort());

      const reportNotUpdated = await db.SessionReport.findByPk(sessionReport2.id);
      expect(
        reportNotUpdated.data.objectiveTrainers.sort(),
      ).toEqual([centerOneName, center2.name, center3.name].sort());
    });
  });
  describe('deleteById', () => {
    let center;
    let centerWithUser;
    const centerName = faker.lorem.words(8);
    const centerNameWitUserName = faker.lorem.words(8);
    let mockNcUser;
    beforeAll(async () => {
      // Create mock user.
      mockNcUser = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      // Create National Center.
      center = await db.NationalCenter.create({ name: centerName });

      // Create National Center with user.
      centerWithUser = await db.NationalCenter.create({ name: centerNameWitUserName });

      // Create National Center User.
      await db.NationalCenterUser.create({
        nationalCenterId: centerWithUser.id,
        userId: mockNcUser.id,
      });
    });

    afterAll(async () => {
      // Destroy NationalCenterUser.
      await db.NationalCenterUser.destroy({
        where: {
          nationalCenterId: center.id,
        },
      });

      // Destroy User.
      await db.User.destroy({
        where: {
          id: mockNcUser.id,
        },
      });

      // Destroy NationalCenter.
      await db.NationalCenter.destroy({
        where: {
          id: [center.id, centerWithUser.id],
        },
        force: true,
      });
    });

    it('deletes a nationalCenter without a user', async () => {
      await deleteById(center.id);
      const results = await db.NationalCenter.findAll({
        where: {
          id: center.id,
        },
      });
      expect(results.length).toBe(0);
    });

    it('deletes a nationalCenter with a user', async () => {
      await deleteById(centerWithUser.id);
      const results = await db.NationalCenter.findAll({
        where: {
          id: centerWithUser.id,
        },
      });
      expect(results.length).toBe(0);

      const results2 = await db.NationalCenterUser.findAll({
        where: {
          nationalCenterId: centerWithUser.id,
        },
      });
      expect(results2.length).toBe(0);
    });
  });
});
