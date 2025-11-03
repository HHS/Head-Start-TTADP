import {
  Op,
  filtersToScopes,
  User,
  EventReportPilot,
  sequelize,
  mockUser,
} from './testHelpers';

describe('trainingReports/region', () => {
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

    await sequelize.close();
  });

  it('returns reports with matching region', async () => {
    const filters = { 'region.in': '1' };
    const { trainingReport: scope } = await filtersToScopes(filters);
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(2);
    expect(found[0].id).toBe(reportWithRegion1.id);
    expect(found[1].id).toBe(reportWithRegion2.id);
  });

  it('returns reports without matching region', async () => {
    const filters = { 'region.nin': '1' };
    const { trainingReport: scope } = await filtersToScopes(filters);
    const found = await EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });
    expect(found.length).toBe(1);
    expect(found[0].id).toBe(reportWithoutRegion.id);
  });
});
