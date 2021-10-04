import {
  Grantee, Grant, ActivityReport, ActivityRecipient, sequelize,
} from '../models';
import { allGrantees, granteeByScopes } from './grantee';
import filtersToScopes from '../scopes';
import { REPORT_STATUSES } from '../constants';

describe('Grantee DB service', () => {
  const grantees = [
    {
      id: 73,
      name: 'grantee 1',
    },
    {
      id: 74,
      name: 'grantee 2',
    },
    {
      id: 75,
      name: 'grantee 3',
    },
  ];

  beforeAll(async () => {
    await Promise.all([
      ...grantees.map((g) => Grantee.create(g)),
      await ActivityReport.create({
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
        id: 61905,
      }),
      await ActivityReport.create({
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
        id: 61906,
      }),
      await Grant.create({
        id: 75,
        number: '1145543',
        regionId: 1,
        granteeId: 75,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      }),
      await Grant.create({
        id: 74,
        number: '1145341',
        regionId: 1,
        granteeId: 74,
        status: 'Active',
        startDate: new Date(),
        endDate: new Date(),
      }),
      await ActivityRecipient.create({
        activityReportId: 61905,
        grantId: 74,
      }),
      await ActivityRecipient.create({
        activityReportId: 61906,
        grantId: 75,
      }),
    ]);
  });

  afterAll(async () => {
    await ActivityRecipient.destroy({ where: { activityReportId: [61905, 61906] } });
    await Grant.destroy({ where: { id: grantees.map((g) => g.id) } });
    await Grantee.destroy({ where: { id: grantees.map((g) => g.id) } });
    await ActivityReport.destroy({ where: { id: [61905, 61906] } });
    await sequelize.close();
  });

  describe('allGrantees', () => {
    it('returns all grantees', async () => {
      const foundGrantees = await allGrantees();
      const foundIds = foundGrantees.map((g) => g.id);
      expect(foundIds).toContain(73);
      expect(foundIds).toContain(74);
      expect(foundIds).toContain(75);
    });
  });

  describe('granteeByScopes', () => {
    it('returns a grantee by grantee id and region id', async () => {
      const query = { 'region.in': ['1'], 'granteeId.in': [75] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee3 = await granteeByScopes(75, grantScopes);

      // Grantee Name.
      expect(grantee3.name).toBe('grantee 3');

      // Number of Grants.
      expect(grantee3.grants.length).toBe(1);

      // Grants.
      expect(grantee3.grants[0].id).toBe(75);
      expect(grantee3.grants[0].regionId).toBe(1);
      expect(grantee3.grants[0].number).toBe('1145543');
      expect(grantee3.grants[0].status).toBe('Active');
      expect(grantee3.grants[0].programSpecialistName).toBe(null);
      expect(grantee3.grants[0].startDate).toBeTruthy();
      expect(grantee3.grants[0].endDate).toBeTruthy();
    });
    it('returns grantee and grants without a region specified', async () => {
      const query = { 'granteeId.in': [74] };
      const grantScopes = filtersToScopes(query, 'grant');
      const grantee2 = await granteeByScopes(74, grantScopes);

      // Grantee Name.
      expect(grantee2.name).toBe('grantee 2');

      // Number of Grants.
      expect(grantee2.grants.length).toBe(1);

      // Grants.
      expect(grantee2.grants[0].id).toBe(74);
      expect(grantee2.grants[0].regionId).toBe(1);
      expect(grantee2.grants[0].number).toBe('1145341');
      expect(grantee2.grants[0].status).toBe('Active');
      expect(grantee2.grants[0].programSpecialistName).toBe(null);
      expect(grantee2.grants[0].startDate).toBeTruthy();
      expect(grantee2.grants[0].endDate).toBeTruthy();
    });
  });
});
