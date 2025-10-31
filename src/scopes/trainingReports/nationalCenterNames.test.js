import {
  Op,
  filtersToScopes,
  User,
  EventReportPilot,
  NationalCenterUser,
  NationalCenter,
  EventReportPilotNationalCenterUser,
  sequelize,
  mockUser,
  mockCollaboratorUser,
} from './testHelpers';

describe('trainingReports/nationalCenterNames', () => {
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
    await EventReportPilotNationalCenterUser.destroy({ where: {} });

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

    await sequelize.close();
  });

  it('returns reports with mock contains collaborator national center', async () => {
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

  it('returns reports with mock contains creator national center', async () => {
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
