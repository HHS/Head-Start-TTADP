/* eslint-disable no-unused-vars */
import { Op } from 'sequelize';
import determineFiltersToScopes from '../index';

import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, ActivityReportCollaborator, NonGrantee,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';

const userBluePrint = {
  homeRegionId: 1,
  name: 'u2000',
  hsesUsername: 'u2000',
  hsesUserId: '2000',
};

const mockUser = {
  id: 2000,
  ...userBluePrint,
};

const reportObject = {
  status: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
};

const approvedReport = {
  regionId: 1,
  status: REPORT_STATUSES.APPROVED,
  approvingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

// Included to test default scope
const deletedReport = {
  status: REPORT_STATUSES.DELETED,
  userId: mockUser.id,
  regionId: 1,
};

describe('determineFiltersToScopes', () => {
  let globallyExcluded;
  let includedUser1;
  let includedUser2;
  let excludedUser;

  beforeAll(async () => {
    await User.create(mockUser);
    includedUser1 = await User.create({ name: 'person', hsesUserId: 'user111', hsesUsername: 'user111' });
    includedUser2 = await User.create({ name: 'another person', hsesUserId: 'user222', hsesUsername: 'user222' });
    excludedUser = await User.create({ name: 'excluded', hsesUserId: 'user333', hsesUsername: 'user333' });
    globallyExcluded = await ActivityReport.create({ ...reportObject, updatedAt: '2000-01-01' }, { silent: true });
  });

  afterAll(async () => {
    await ActivityReport.destroy({ where: { id: globallyExcluded.id } });
    await User.destroy({
      where: { id: [mockUser.id, includedUser1.id, includedUser2.id, excludedUser.id] },
    });
    await db.sequelize.close();
  });

  describe('reportId', () => {
    let reportIncluded;
    let reportIncludedLegacy;
    let reportExcluded;
    let possibleIds;

    beforeAll(async () => {
      reportIncluded = await ActivityReport.create({ ...reportObject, id: 12345 });
      reportIncludedLegacy = await ActivityReport.create({ ...reportObject, legacyId: 'R01-AR-012345' });
      reportExcluded = await ActivityReport.create({ ...reportObject, id: 12346 });
      possibleIds = [
        reportIncluded.id,
        reportIncludedLegacy.id,
        reportExcluded.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [reportIncluded.id, reportIncludedLegacy.id, reportExcluded.id] },
      });
    });

    it('included has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.in': ['12345'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportIncluded.id, reportIncludedLegacy.id]));
    });

    it('excluded has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.nin': ['12345'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([globallyExcluded.id, reportExcluded.id]));
    });
  });

  describe('grantee', () => {
    describe('for nonGrantees', () => {
      let reportIncluded1;
      let reportIncluded2;
      let reportExcluded;

      let nonGranteeIncluded1;
      let nonGranteeIncluded2;
      let nonGranteeExcluded;

      let activityRecipientIncluded1;
      let activityRecipientIncluded2;
      let activityRecipientExcluded;

      let possibleIds;

      beforeAll(async () => {
        nonGranteeIncluded1 = await NonGrantee.create({ id: 40, name: 'test' });
        nonGranteeIncluded2 = await NonGrantee.create({ id: 41, name: 'another test' });
        nonGranteeExcluded = await NonGrantee.create({ id: 42, name: 'nonGrantee' });

        reportIncluded1 = await ActivityReport.create({ ...reportObject });
        reportIncluded2 = await ActivityReport.create({ ...reportObject });
        reportExcluded = await ActivityReport.create({ ...reportObject });

        activityRecipientIncluded1 = await ActivityRecipient.create({
          activityReportId: reportIncluded1.id,
          nonGranteeId: nonGranteeIncluded1.id,
        });
        activityRecipientIncluded2 = await ActivityRecipient.create({
          activityReportId: reportIncluded2.id,
          nonGranteeId: nonGranteeIncluded2.id,
        });
        activityRecipientExcluded = await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          nonGranteeId: nonGranteeExcluded.id,
        });
        possibleIds = [
          reportIncluded1.id,
          reportIncluded2.id,
          reportExcluded.id,
          globallyExcluded.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            id: [
              activityRecipientIncluded1.id,
              activityRecipientIncluded2.id,
              activityRecipientExcluded.id,
            ],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
        });
        await NonGrantee.destroy({
          where: { id: [nonGranteeIncluded1.id, nonGranteeIncluded2.id, nonGranteeExcluded.id] },
        });
      });

      it('includes non-grantees with a partial match', async () => {
        const filters = { 'grantee.in': ['test'] };
        const scope = determineFiltersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes non-grantees that do not partial match or have no non-grantees', async () => {
        const filters = { 'grantee.nin': ['test'] };
        const scope = determineFiltersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcluded.id]));
      });
    });

    describe('for grants', () => {
      let reportIncluded1;
      let reportIncluded2;
      let reportExcluded;

      let granteeIncluded1;
      let granteeIncluded2;
      let granteeExcluded;

      let grantIncluded1;
      let grantIncluded2;
      let grantExcluded;

      let activityRecipientIncluded1;
      let activityRecipientIncluded2;
      let activityRecipientExcluded;

      let possibleIds;

      beforeAll(async () => {
        granteeIncluded1 = await Grantee.create({ id: 50, name: '1234' });
        granteeIncluded2 = await Grantee.create({ id: 51, name: 'testing 1234' });
        granteeExcluded = await Grantee.create({ id: 52, name: '4321' });

        grantIncluded1 = await Grant.create({
          id: granteeIncluded1.id, number: 1234, granteeId: granteeIncluded1.id,
        });
        grantIncluded2 = await Grant.create({
          id: granteeIncluded2.id, number: 1235, granteeId: granteeIncluded2.id,
        });
        grantExcluded = await Grant.create({
          id: granteeExcluded.id, number: 1236, granteeId: granteeExcluded.id,
        });

        reportIncluded1 = await ActivityReport.create({ ...reportObject });
        reportIncluded2 = await ActivityReport.create({ ...reportObject });
        reportExcluded = await ActivityReport.create({ ...reportObject });

        activityRecipientIncluded1 = await ActivityRecipient.create({
          activityReportId: reportIncluded1.id,
          grantId: grantIncluded1.id,
        });
        activityRecipientIncluded2 = await ActivityRecipient.create({
          activityReportId: reportIncluded2.id,
          grantId: grantIncluded2.id,
        });
        activityRecipientExcluded = await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          grantId: grantExcluded.id,
        });
        possibleIds = [
          reportIncluded1.id,
          reportIncluded2.id,
          reportExcluded.id,
          globallyExcluded.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            id: [
              activityRecipientIncluded1.id,
              activityRecipientIncluded2.id,
              activityRecipientExcluded.id,
            ],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
        });
        await Grant.destroy({
          where: { id: [grantIncluded1.id, grantIncluded2.id, grantExcluded.id] },
        });
        await Grantee.destroy({
          where: { id: [granteeIncluded1.id, granteeIncluded2.id, granteeExcluded.id] },
        });
      });

      it('includes grantees with a partial match', async () => {
        const filters = { 'grantee.in': ['1234'] };
        const scope = determineFiltersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes grantees that do not partial match or have no grantees', async () => {
        const filters = { 'grantee.nin': ['1234'] };
        const scope = determineFiltersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcluded.id]));
      });
    });

    describe('for granteeId', () => {
      let reportIncluded;
      let reportExcluded;

      let granteeIncluded;
      let granteeExcluded;

      let grantIncluded;
      let grantExcluded;

      let activityRecipientIncluded;
      let activityRecipientExcluded;

      let possibleIds;

      beforeAll(async () => {
        granteeIncluded = await Grantee.create({ id: 54, name: '1234' });
        granteeExcluded = await Grantee.create({ id: 56, name: '4321' });

        grantIncluded = await Grant.create({
          id: granteeIncluded.id, number: 2234, granteeId: granteeIncluded.id,
        });
        grantExcluded = await Grant.create({
          id: granteeExcluded.id, number: 2236, granteeId: granteeExcluded.id,
        });

        reportIncluded = await ActivityReport.create({ ...reportObject });
        reportExcluded = await ActivityReport.create({ ...reportObject });

        activityRecipientIncluded = await ActivityRecipient.create({
          activityReportId: reportIncluded.id,
          grantId: grantIncluded.id,
        });
        activityRecipientExcluded = await ActivityRecipient.create({
          activityReportId: reportExcluded.id,
          grantId: grantExcluded.id,
        });
        possibleIds = [
          reportIncluded.id,
          reportExcluded.id,
          globallyExcluded.id,
        ];
      });

      afterAll(async () => {
        await ActivityRecipient.destroy({
          where: {
            id: [
              activityRecipientIncluded.id,
              activityRecipientExcluded.id,
            ],
          },
        });
        await ActivityReport.destroy({
          where: { id: [reportIncluded.id, reportExcluded.id] },
        });
        await Grant.destroy({
          where: { id: [grantIncluded.id, grantExcluded.id] },
        });
        await Grantee.destroy({
          where: { id: [granteeIncluded.id, granteeExcluded.id] },
        });
      });

      it('includes grantees with a matching id', async () => {
        const filters = { 'granteeId.in': [granteeIncluded.id] };
        const scope = determineFiltersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded.id]));
      });
    });
  });

  describe('startDate', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create({ ...reportObject, startDate: '2020-01-01' });
      secondReport = await ActivityReport.create({ ...reportObject, startDate: '2021-01-01' });
      thirdReport = await ActivityReport.create({ ...reportObject, startDate: '2022-01-01' });
      fourthReport = await ActivityReport.create({ ...reportObject, startDate: '2023-01-01' });
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with start dates before the given date', async () => {
      const filters = { 'startDate.bef': '2021/06/06' };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id]));
    });

    it('after returns reports with start dates before the given date', async () => {
      const filters = { 'startDate.aft': '2021/06/06' };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('within returns reports with start dates between the two dates', async () => {
      const filters = { 'startDate.win': '2020/06/06-2022/06/06' };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });
  });

  describe('lastSaved', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create({ ...reportObject, updatedAt: '2020-01-01' }, { silent: true });
      secondReport = await ActivityReport.create({ ...reportObject, updatedAt: '2021-01-01' }, { silent: true });
      thirdReport = await ActivityReport.create({ ...reportObject, updatedAt: '2022-01-01' }, { silent: true });
      fourthReport = await ActivityReport.create({ ...reportObject, updatedAt: '2023-01-01' }, { silent: true });
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with updated ats before the given date', async () => {
      const filters = { 'lastSaved.bef': '2021/06/06' };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id, globallyExcluded.id]));
    });

    it('after returns reports with updated ats before the given date', async () => {
      const filters = { 'lastSaved.aft': '2021/06/06' };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('within returns reports with updated ats between the two dates', async () => {
      const filters = { 'lastSaved.win': '2020/06/06-2022/06/06' };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });
  });

  describe('creator', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({ ...reportObject, userId: includedUser1.id });
      includedReport2 = await ActivityReport.create({ ...reportObject, userId: includedUser2.id });
      excludedReport = await ActivityReport.create({ ...reportObject, userId: excludedUser.id });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'creator.in': ['person'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'creator.nin': ['person'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcluded.id]));
    });
  });

  describe('topic', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({ ...reportObject, topics: ['test', 'test 2'] });
      includedReport2 = await ActivityReport.create({ ...reportObject, topics: ['a test', 'another topic'] });
      excludedReport = await ActivityReport.create({ ...reportObject, topics: ['another topic'] });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'topic.in': ['tes'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'topic.nin': ['tes'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcluded.id]));
    });
  });

  describe('collaborators', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    let includedActivityReportCollaborator1;
    let includedActivityReportCollaborator2;
    let excludedActivityReportCollaborator;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create(reportObject);
      includedReport2 = await ActivityReport.create(reportObject);
      excludedReport = await ActivityReport.create(reportObject);

      includedActivityReportCollaborator1 = await ActivityReportCollaborator.create({
        activityReportId: includedReport1.id, userId: includedUser1.id,
      });
      includedActivityReportCollaborator2 = await ActivityReportCollaborator.create({
        activityReportId: includedReport2.id, userId: includedUser2.id,
      });
      excludedActivityReportCollaborator = await ActivityReportCollaborator.create({
        activityReportId: excludedReport.id, userId: excludedUser.id,
      });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
      await User.ActivityReportCollaborator({
        where: {
          id: [
            includedActivityReportCollaborator1.id,
            includedActivityReportCollaborator2.id,
            excludedActivityReportCollaborator.id,
          ],
        },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'collaborators.in': ['person'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'collaborators.nin': ['person'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcluded.id]));
    });
  });

  describe('status', () => {
    let includedReport;
    let excludedReport;
    let possibleIds;

    beforeAll(async () => {
      includedReport = await ActivityReport.create({ ...approvedReport, status: 'approved' });
      excludedReport = await ActivityReport.create({ ...reportObject, status: 'draft' });
      possibleIds = [
        includedReport.id,
        excludedReport.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport.id, excludedReport.id] },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'status.in': ['app'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'status.nin': ['app'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcluded.id]));
    });
  });

  describe('role', () => {
    const possibleIds = [777, 778, 779];

    beforeAll(async () => {
      await User.create({
        id: 777, name: 'u777', hsesUsername: 'u777', hsesUserId: '777', role: ['System Specialist', 'Grantee Specialist'],
      });
      await User.create({
        id: 778, name: 'u778', hsesUsername: 'u778', hsesUserId: '778', role: ['Grantee Specialist'],
      });
      await User.create({
        id: 779, name: 'u779', hsesUsername: 'u779', hsesUserId: '779', role: ['Grants Specialist'],
      });
      await ActivityReport.create({ ...approvedReport, id: 777, userId: 777 });
      await ActivityReport.create({ ...approvedReport, id: 778, userId: 779 });
      await ActivityReport.create({ ...approvedReport, id: 779, userId: 779 });
      await ActivityReportCollaborator.create({
        id: 777,
        activityReportId: 778,
        userId: 778,
      });
    });

    afterAll(async () => {
      await User.destroy({
        where: {
          id: possibleIds,
        },
      });

      await ActivityReportCollaborator.destroy({
        where: {
          id: possibleIds,
        },
      });

      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });
    });
    it('finds reports based on author role', async () => {
      const filters = { 'role.in': ['System Specialist'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([777]);
    });

    it('filters out reports based on author role', async () => {
      const filters = { 'role.nin': ['System Specialist'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.map((f) => f.id)).toStrictEqual([778, 779]);
    });

    it('finds reports based on collaborator role', async () => {
      const filters = { 'role.in': ['Grantee Specialist'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id)).toStrictEqual([777, 778]);
    });

    it('filters out reports based on collaborator role', async () => {
      const filters = { 'role.nin': ['Grantee Specialist'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id)).toStrictEqual([779]);
    });

    it('only allows valid roles to be passed', async () => {
      let filters = { 'role.in': ['DROP * FROM *'] };
      let scope = determineFiltersToScopes(filters);
      let found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id)).toStrictEqual(possibleIds);

      filters = { 'role.nin': ['Grantee Specialist & Potato Salesman'] };
      scope = determineFiltersToScopes(filters);
      found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id)).toStrictEqual(possibleIds);
    });
  });

  describe('program specialist', () => {
    let reportIncluded1;
    let reportIncluded2;
    let reportExcluded;

    let granteeIncluded1;
    let granteeIncluded2;
    let granteeExcluded;

    let grantIncluded1;
    let grantIncluded2;
    let grantExcluded;

    let activityRecipientIncluded1;
    let activityRecipientIncluded2;
    let activityRecipientExcluded;

    let possibleIds;

    beforeAll(async () => {
      granteeIncluded1 = await Grantee.create({ id: 120, name: 'Grantee 1 PS' });
      granteeIncluded2 = await Grantee.create({ id: 121, name: 'Grantee 2 PS' });
      granteeExcluded = await Grantee.create({ id: 122, name: 'Grantee 3 PS' });

      grantIncluded1 = await Grant.create({
        id: granteeIncluded1.id, number: 64968, granteeId: granteeIncluded1.id, programSpecialistName: 'Pat Bowman',
      });
      grantIncluded2 = await Grant.create({
        id: granteeIncluded2.id, number: 85248, granteeId: granteeIncluded2.id, programSpecialistName: 'Patton Blake',
      });
      grantExcluded = await Grant.create({
        id: granteeExcluded.id, number: 45877, granteeId: granteeExcluded.id, programSpecialistName: 'Jon Jones',
      });

      reportIncluded1 = await ActivityReport.create({ ...reportObject });
      reportIncluded2 = await ActivityReport.create({ ...reportObject });
      reportExcluded = await ActivityReport.create({ ...reportObject });

      activityRecipientIncluded1 = await ActivityRecipient.create({
        activityReportId: reportIncluded1.id,
        grantId: grantIncluded1.id,
      });
      activityRecipientIncluded2 = await ActivityRecipient.create({
        activityReportId: reportIncluded2.id,
        grantId: grantIncluded2.id,
      });
      activityRecipientExcluded = await ActivityRecipient.create({
        activityReportId: reportExcluded.id,
        grantId: grantExcluded.id,
      });
      possibleIds = [
        reportIncluded1.id,
        reportIncluded2.id,
        reportExcluded.id,
        globallyExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityRecipient.destroy({
        where: {
          id: [
            activityRecipientIncluded1.id,
            activityRecipientIncluded2.id,
            activityRecipientExcluded.id,
          ],
        },
      });
      await ActivityReport.destroy({
        where: { id: [reportIncluded1.id, reportIncluded2.id, reportExcluded.id] },
      });
      await Grant.destroy({
        where: { id: [grantIncluded1.id, grantIncluded2.id, grantExcluded.id] },
      });
      await Grantee.destroy({
        where: { id: [granteeIncluded1.id, granteeIncluded2.id, granteeExcluded.id] },
      });
    });

    it('includes program specialist with a partial match', async () => {
      const filters = { 'programSpecialist.in': ['pat'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
    });

    it('excludes grantees that do not partial match or have no grantees', async () => {
      const filters = { 'programSpecialist.nin': ['pat'] };
      const scope = determineFiltersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcluded.id]));
    });
  });

  describe('defaultScope', () => {
    it('excludes deleted reports', async () => {
      const beginningARCount = await ActivityReport.count();
      const deleted = await ActivityReport.create({ ...deletedReport });
      expect(deleted.id).toBeDefined();
      const endARCount = await ActivityReport.count();
      expect(endARCount).toEqual(beginningARCount);
      await deleted.destroy();
    });
  });
});
