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
jest.mock('../models/hooks/sessionReportPilot');

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
    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: center.id,
        },
        force: true,
      });
    });

    it('creates a nationalCenter', async () => {
      center = await create({ name: centerName });

      expect(center.name).toBe(centerName);
    });
  });

  describe('updateById', () => {
    let center;
    const originalCenterName = faker.lorem.words(8);
    const newCenterName = faker.lorem.words(8);
    const ids = [];
    beforeAll(async () => {
      center = await db.NationalCenter.create({ name: originalCenterName });
      ids.push(center.id);
    });

    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: ids,
        },
        force: true,
      });
    });

    it('updates a nationalCenter', async () => {
      center = await updateById(center.id, { name: newCenterName });
      ids.push(center.id);
      expect(center.name).toBe(newCenterName);
    });

    it('doesn\'t update if name hasn\'t changed', async () => {
      center = await updateById(center.id, { name: newCenterName });
      ids.push(center.id);
      expect(center.name).toBe(newCenterName);
      expect(auditLogger.info).toHaveBeenCalledWith(
        `Name ${center.name} has not changed`,
      );
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

      eventReport1 = await db.EventReportPilot.create({
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3, 4],
        regionId: [1],
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
        },
        imported: {},
      });

      eventReport2 = await db.EventReportPilot.create({
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3, 4],
        regionId: [1],
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
        },
        imported: {},
      });

      sessionReport = await db.SessionReportPilot.create({
        eventId: eventReport1.id,
        data: {
          status: EVENT_REPORT_STATUSES.IN_PROGRESS,
          objectiveTrainers: [center1.name, center2.name],
        },
      });
      sessionReport2 = await db.SessionReportPilot.create({
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
      await db.SessionReportPilot.destroy({
        where: {
          id: [sessionReport.id, sessionReport2.id],
        },
      });

      await db.EventReportPilot.destroy({
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

      const updatedSessionReport = await db.SessionReportPilot.findByPk(sessionReport.id);
      expect(
        updatedSessionReport.data.objectiveTrainers.sort(),
      ).toEqual([newCenterName, center2.name].sort());

      const reportNotUpdated = await db.SessionReportPilot.findByPk(sessionReport2.id);
      expect(
        reportNotUpdated.data.objectiveTrainers.sort(),
      ).toEqual([centerOneName, center2.name, center3.name].sort());
    });
  });
  describe('deleteById', () => {
    let center;
    const centerName = faker.lorem.words(8);
    beforeAll(async () => {
      center = await db.NationalCenter.create({ name: centerName });
    });

    afterAll(async () => {
      await db.NationalCenter.destroy({
        where: {
          id: center.id,
        },
        force: true,
      });
    });

    it('deletes a nationalCenter', async () => {
      await deleteById(center.id);
      const results = await db.NationalCenter.findAll({
        where: {
          id: center.id,
        },
      });
      expect(results.length).toBe(0);
    });
  });
});
