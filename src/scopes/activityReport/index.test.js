import { Op } from 'sequelize';
import { filtersToScopes } from '.';

import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, ActivityReportCollaborator, NonGrantee,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';

const mockUser = {
  id: 2000,
  homeRegionId: 1,
  name: 'u2000',
  hsesUsername: 'u2000',
  hsesUserId: '2000',
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

describe('filtersToScopes', () => {
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportIncluded.id, reportIncludedLegacy.id]));
    });

    it('excluded has conditions for legacy and non-legacy reports', async () => {
      const filters = { 'reportId.nin': ['12345'] };
      const scope = filtersToScopes(filters);
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
        nonGranteeIncluded1 = await NonGrantee.create({ id: 16, name: 'test' });
        nonGranteeIncluded2 = await NonGrantee.create({ id: 17, name: 'another test' });
        nonGranteeExcluded = await NonGrantee.create({ id: 18, name: 'nonGrantee' });

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
        const scope = filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes non-grantees that do not partial match or have no non-grantees', async () => {
        const filters = { 'grantee.nin': ['test'] };
        const scope = filtersToScopes(filters);
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
        granteeIncluded1 = await Grantee.create({ id: 16, name: '1234' });
        granteeIncluded2 = await Grantee.create({ id: 17, name: 'testing 1234' });
        granteeExcluded = await Grantee.create({ id: 18, name: '4321' });

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
        const scope = filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportIncluded1.id, reportIncluded2.id]));
      });

      it('excludes grantees that do not partial match or have no grantees', async () => {
        const filters = { 'grantee.nin': ['1234'] };
        const scope = filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope, { id: possibleIds }] },
        });
        expect(found.length).toBe(2);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([reportExcluded.id, globallyExcluded.id]));
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id]));
    });

    it('after returns reports with start dates before the given date', async () => {
      const filters = { 'startDate.aft': '2021/06/06' };
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('within returns reports with start dates between the two dates', async () => {
      const filters = { 'startDate.win': '2020/06/06-2022/06/06' };
      const scope = filtersToScopes(filters);
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id, globallyExcluded.id]));
    });

    it('after returns reports with updated ats before the given date', async () => {
      const filters = { 'lastSaved.aft': '2021/06/06' };
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([thirdReport.id, fourthReport.id]));
    });

    it('within returns reports with updated ats between the two dates', async () => {
      const filters = { 'lastSaved.win': '2020/06/06-2022/06/06' };
      const scope = filtersToScopes(filters);
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'creator.nin': ['person'] };
      const scope = filtersToScopes(filters);
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'topic.nin': ['tes'] };
      const scope = filtersToScopes(filters);
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'collaborators.nin': ['person'] };
      const scope = filtersToScopes(filters);
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
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'status.nin': ['app'] };
      const scope = filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, globallyExcluded.id]));
    });
  });

  describe('defaultScope', () => {
    it('excludes deleted reports', async () => {
      await ActivityReport.create({ ...reportObject });
      const beginningAR = await ActivityReport.findAll();
      expect(beginningAR.length).toEqual(2);
      await ActivityReport.create({ ...deletedReport });
      const endAR = await ActivityReport.findAll();
      expect(endAR.length).toEqual(2);
    });
  });
});
