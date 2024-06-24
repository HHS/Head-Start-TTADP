import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import filtersToScopes from '../index';

import {
  User,
  EventReportPilot,
  EventReportPilotNationalCenterUser,
  NationalCenterUser,
  NationalCenter,
  sequelize,
} from '../../models';

const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'John Smith',
  hsesUsername: faker.datatype.string(10),
  hsesUserId: faker.datatype.string(10),
  lastLogin: new Date(),
};

const mockCollaboratorUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'Bill Jones',
  hsesUsername: 'collabUser13874748',
  hsesUserId: 'collabUser13874748',
  lastLogin: new Date(),
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
        pocIds: [mockUser.id],
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {
          startDate: '2021/06/06',
        },
      });

      // create gte report.
      gteEventReportPilot = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {
          startDate: '2021/06/08',
        },
      });

      // create between report.
      betweenEventReportPilot = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
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
        pocIds: [mockUser.id],
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {},
      });

      // create report with region 2.
      reportWithRegion2 = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [],
        regionId: mockUser.homeRegionId,
        data: {},
      });

      // create report with different region.
      reportWithoutRegion = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
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

  describe('eventId', () => {
    let reportWithEventId;
    let reportWithoutEventId;
    let reportWithNullEventId;
    let possibleIds;

    beforeAll(async () => {
      // create user.
      await User.create(mockUser);

      // Report with event to find.
      reportWithEventId = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: { eventId: 'R01-TR-23-1035' },
      }, { individualHooks: false });

      // Report without event to find.
      reportWithoutEventId = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: { eventId: 'R01-TR-23-2484' },
      }, { individualHooks: false });

      // Report with null event.
      reportWithNullEventId = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: { },
      }, { individualHooks: false });

      possibleIds = [
        reportWithEventId.id,
        reportWithoutEventId.id,
        reportWithNullEventId.id];
    });
    afterAll(async () => {
      // destroy reports.
      await EventReportPilot.destroy({
        where: {
          id: possibleIds,
        },
      });

      // destroy user.
      await User.destroy({ where: { id: [mockUser.id, mockCollaboratorUser.id] } });
    });

    it('returns event with event id', async () => {
      const filters = { 'eventId.ctn': '1035' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found[0].id).toBe(reportWithEventId.id);
    });

    it('returns events without event id', async () => {
      const filters = { 'eventId.nctn': '1035' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      const reportIds = found.map((report) => report.id);

      // Assert report ids includes the report without event id.
      expect(reportIds.includes(reportWithoutEventId.id)).toBe(true);
      expect(reportIds.includes(reportWithNullEventId.id)).toBe(true);
    });
  });

  describe('National Center Names', () => {
    let reportWithCollaborator;
    let reportWithBothCollaborators;
    let reportWithOtherCollaborator;
    let possibleIds;
    // National Centers.
    let nationalCenterToFind;
    let nationalCenterToNotFind;
    // National Center Users.
    let nationalCenterUserToFind;
    let nationalCenterUserToNotFind;

    beforeAll(async () => {
      // create user.
      await User.create(mockUser);

      // Create collaborator user.
      await User.create(mockCollaboratorUser);

      // create national center to find.
      nationalCenterToFind = await NationalCenter.create({
        name: 'NC Test 1',
      });

      // create national center to not find.
      nationalCenterToNotFind = await NationalCenter.create({
        name: 'NC Test 2',
      });

      // create national center user to find.
      nationalCenterUserToFind = await NationalCenterUser.create({
        nationalCenterId: nationalCenterToFind.id,
        userId: mockUser.id,
      });

      // create national center user to not find.
      nationalCenterUserToNotFind = await NationalCenterUser.create({
        nationalCenterId: nationalCenterToNotFind.id,
        userId: mockCollaboratorUser.id,
      });

      // create report with region 1.
      reportWithCollaborator = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockUser.id],
        regionId: mockUser.homeRegionId,
        data: {},
      });

      // create report with region 2.
      reportWithBothCollaborators = await EventReportPilot.create({
        ownerId: mockUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockCollaboratorUser.id, mockUser.id],
        regionId: mockUser.homeRegionId,
        data: {},
      });

      // create report with different region.
      reportWithOtherCollaborator = await EventReportPilot.create({
        ownerId: mockCollaboratorUser.id,
        pocIds: [mockUser.id],
        collaboratorIds: [mockCollaboratorUser.id],
        regionId: 3,
        data: {},
      });

      possibleIds = [
        reportWithCollaborator.id,
        reportWithBothCollaborators.id,
        reportWithOtherCollaborator.id];
    });
    afterAll(async () => {
      await EventReportPilotNationalCenterUser.destroy({
        where: {
          nationalCenterId: [nationalCenterToFind.id, nationalCenterToNotFind.id],
        },
      });
      // destroy national centers users.
      await NationalCenterUser.destroy({
        where: {
          id: [nationalCenterUserToFind.id, nationalCenterUserToNotFind.id],
        },
      });

      // destroy national centers.
      await NationalCenter.destroy({
        where: {
          id: [nationalCenterToFind.id, nationalCenterToNotFind.id],
        },
        force: true,
      });

      await NationalCenter.destroy({
        where: {
          id: [nationalCenterToFind.id, nationalCenterToNotFind.id],
        },
      });

      // destroy reports.
      await EventReportPilot.destroy({
        where: {
          id: possibleIds,
        },
      });

      // destroy user.
      await User.destroy({ where: { id: [mockUser.id, mockCollaboratorUser.id] } });
    });

    it('before returns reports with mock contains collaborator national center', async () => {
      const filters = { 'collaborators.in': 'NC Test 1' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);

      const reportIds = found.map((report) => report.id);

      expect(reportIds.includes(reportWithCollaborator.id)).toBe(true);
      expect(reportIds.includes(reportWithBothCollaborators.id)).toBe(true);
    });

    it('before returns reports with mock contains creator national center', async () => {
      const filters = { 'creator.in': 'NC Test 1' };
      const { trainingReport: scope } = await filtersToScopes(filters);
      const found = await EventReportPilot.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);

      const reportIds = found.map((report) => report.id);

      expect(reportIds.includes(reportWithCollaborator.id)).toBe(true);
      expect(reportIds.includes(reportWithBothCollaborators.id)).toBe(true);
    });
  });
});
