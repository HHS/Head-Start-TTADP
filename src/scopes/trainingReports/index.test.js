import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import filtersToScopes from '../index';

import db, {
  User,
  EventReportPilot,
  sequelize,
} from '../../models';

jest.mock('bull');

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user13705748',
  hsesUsername: 'user13705748',
  hsesUserId: 'user13705748',
};

describe('filtersToScopes', () => {
  afterAll(async () => {
    await sequelize.close();
  });
  describe('startDate', () => {
    let lteEventReportPilot;
    let gteEventReportPilot;
    let betweenEventReportPilot;
    let possibleIds;

    beforeAll(async () => {
      // create user.
      await User.create(mockUser);

      // create lte report.
      lteEventReportPilot = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocId: mockUser.id,
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {
          startDate: '2021/06/06',
        },
      });

      // create gte report.
      gteEventReportPilot = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocId: mockUser.id,
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {
          startDate: '2021/06/08',
        },
      });

      // create between report.
      betweenEventReportPilot = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocId: mockUser.id,
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {
          startDate: '2021/06/07',
        },
      });

      possibleIds = [lteEventReportPilot.id, gteEventReportPilot.id, betweenEventReportPilot.id];
    });
    afterAll(async () => {
      // destroy reports.
      await EventReportPilot.destroy({
        where: {
          id: [lteEventReportPilot.id, gteEventReportPilot.id, betweenEventReportPilot.id],
        },
      });

      // destroy user.
      await User.destroy({ where: { id: mockUser.id } });
    });

    it('before returns reports with start dates before the given date', async () => {
      const filters = { 'startDate.bef': '2021/06/06' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(lteEventReportPilot.id);
    });

    it('before returns reports with start dates between the given dates', async () => {
      const filters = { 'startDate.win': '2021/06/07-2021/06/07' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(betweenEventReportPilot.id);
    });

    it('before returns reports with start dates after the given date', async () => {
      const filters = { 'startDate.aft': '2021/06/08' };
      const { trainingReport: scope } = await filtersToScopes(filters);

      // get all reports.
      const testFound = await EventReportPilot.findAll({
        where: {
          id: possibleIds.map((id) => id),
        },
      });

      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(gteEventReportPilot.id);
    });
  });

  describe('region', () => {
    let reportWithRegion1;
    let reportWithRegion2;
    let reportWithoutRegion;
    let possibleIds;

    beforeAll(async () => {
      // create user.
      await User.create(mockUser);

      // create report with region 1.
      reportWithRegion1 = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocId: mockUser.id,
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {},
      });

      // create report with region 2.
      reportWithRegion2 = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocId: mockUser.id,
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {},
      });

      // create report with different region.
      reportWithoutRegion = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocId: mockUser.id,
        collaboratorIds: [],
        regionId: 3,
        data: {},
      });

      possibleIds = [reportWithRegion1.id, reportWithRegion2.id, reportWithoutRegion.id];
    });
    afterAll(async () => {
      // destroy reports.
      await EventReportPilot.destroy({
        where: {
          id: possibleIds,
        },
      });

      // destroy user.
      await User.destroy({ where: { id: mockUser.id } });
    });

    it('before returns reports with start dates before the given date', async () => {
      const filters = { 'region.in': '1' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found[0].id).toBe(reportWithRegion1.id);
      expect(found[1].id).toBe(reportWithRegion2.id);
    });

    it('before returns reports with start dates between the given dates', async () => {
      const filters = { 'region.nin': '1' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(reportWithoutRegion.id);
    });
  });
});
