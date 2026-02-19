/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  User,
  EventReportPilot,
  sequelize,
  mockUser,
} from './testHelpers';
import { filterAssociation } from './utils';

describe('trainingReports/startDate', () => {
  let lteEventReportPilot;
  let gteEventReportPilot;
  let superGteEventReportPilot;
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
        startDate: '06/06/2021',
      },
    });

    // create gte report.
    gteEventReportPilot = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {
        startDate: '06/08/2021',
      },
    });

    // create gte report.
    superGteEventReportPilot = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {
        startDate: '09/08/2019',
      },
    });

    // create between report.
    betweenEventReportPilot = await EventReportPilot.create({
      ownerId: mockUser.id,
      pocIds: [mockUser.id],
      collaboratorIds: [],
      regionId: mockUser.homeRegionId,
      data: {
        startDate: '06/07/2021',
      },
    });

    possibleIds = [lteEventReportPilot.id, gteEventReportPilot.id, betweenEventReportPilot.id, superGteEventReportPilot.id];
  });

  afterAll(async () => {
    // destroy reports.
    await EventReportPilot.destroy({
      where: {
        id: [lteEventReportPilot.id, gteEventReportPilot.id, betweenEventReportPilot.id, superGteEventReportPilot.id],
      },
    });

    // destroy user.
    await User.destroy({ where: { id: mockUser.id } });

    await sequelize.close();
  });

  it('before returns reports with start dates before the given date', async () => {
    const filters = { 'startDate.bef': '2021/06/06' };
    const { trainingReport: scope } = await filtersToScopes(filters);
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    // Should include lteEventReportPilot (06/06/2021) and superGteEventReportPilot (09/08/2019)
    // The 09/08/2019 date is chronologically before 06/06/2021, even though "09" > "06" lexicographically
    expect(found.length).toBe(2);
    const foundIds = found.map((f) => f.id);
    expect(foundIds).toContain(lteEventReportPilot.id);
    expect(foundIds).toContain(superGteEventReportPilot.id);
  });

  it('within returns reports with start dates between the given dates', async () => {
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

  it('returns an empty object when date range is invalid', async () => {
    const filters = { 'startDate.win': '2021/06/07' };
    const { trainingReport: scope } = await filtersToScopes(filters);
    expect(scope).toEqual([{}]);
  });

  it('uses default comparator when none is provided', async () => {
    const out = filterAssociation('asdf', ['1', '2'], false);
    expect(out.where[Op.or][0]).toStrictEqual(sequelize.literal('"EventReportPilot"."id" IN (asdf ~* \'1\')'));
    expect(out.where[Op.or][1]).toStrictEqual(sequelize.literal('"EventReportPilot"."id" IN (asdf ~* \'2\')'));
  });
});
