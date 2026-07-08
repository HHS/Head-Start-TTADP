import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { EventReportPilot, sequelize, User } from '../../models';
import filtersToScopes from '../index';

describe('trainingReports/myReports', () => {
  let me;
  let other;

  let eventOwnedByMe;
  let eventCollabByMe;
  let eventPocByMe;
  let eventWithoutMe;
  let possibleIds;

  beforeAll(async () => {
    me = await User.create({
      id: faker.datatype.number({ min: 1000000, max: 9999999 }),
      homeRegionId: 1,
      name: 'tr my reports me',
      hsesUsername: faker.datatype.string(12),
      hsesUserId: faker.datatype.string(12),
      lastLogin: new Date(),
    });

    other = await User.create({
      id: faker.datatype.number({ min: 1000000, max: 9999999 }),
      homeRegionId: 1,
      name: 'tr my reports other',
      hsesUsername: faker.datatype.string(12),
      hsesUserId: faker.datatype.string(12),
      lastLogin: new Date(),
    });

    eventOwnedByMe = await EventReportPilot.create({
      ownerId: me.id,
      pocIds: [other.id],
      collaboratorIds: [other.id],
      regionId: 1,
      data: {},
    });

    eventCollabByMe = await EventReportPilot.create({
      ownerId: other.id,
      pocIds: [other.id],
      collaboratorIds: [me.id],
      regionId: 1,
      data: {},
    });

    eventPocByMe = await EventReportPilot.create({
      ownerId: other.id,
      pocIds: [me.id],
      collaboratorIds: [other.id],
      regionId: 1,
      data: {},
    });

    eventWithoutMe = await EventReportPilot.create({
      ownerId: other.id,
      pocIds: [other.id],
      collaboratorIds: [other.id],
      regionId: 1,
      data: {},
    });

    possibleIds = [eventOwnedByMe.id, eventCollabByMe.id, eventPocByMe.id, eventWithoutMe.id];
  });

  afterAll(async () => {
    await EventReportPilot.destroy({ where: { id: possibleIds } });
    await User.destroy({ where: { id: [me.id, other.id] } });
    await sequelize.close();
  });

  const findWithScope = async (scope) =>
    EventReportPilot.findAll({
      where: { [Op.and]: [scope, { id: possibleIds }] },
    });

  it('includes events where the user is the TR event creator', async () => {
    const filters = { 'myReports.in': ['TR event creator'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id)).toEqual([eventOwnedByMe.id]);
  });

  it('includes events where the user is a TR event collaborator', async () => {
    const filters = { 'myReports.in': ['TR event collaborator'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id)).toEqual([eventCollabByMe.id]);
  });

  it('includes events where the user is the TR POC', async () => {
    const filters = { 'myReports.in': ['TR POC'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id)).toEqual([eventPocByMe.id]);
  });

  it('unions multiple selected TR roles', async () => {
    const filters = { 'myReports.in': ['TR event creator', 'TR POC'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id).sort()).toEqual([eventOwnedByMe.id, eventPocByMe.id].sort());
  });

  it('matches nothing when only AR roles are selected (include)', async () => {
    const filters = { 'myReports.in': ['AR creator'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.length).toBe(0);
  });

  it('excludes events where the user is the TR event creator', async () => {
    const filters = { 'myReports.nin': ['TR event creator'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id).sort()).toEqual(
      [eventCollabByMe.id, eventPocByMe.id, eventWithoutMe.id].sort()
    );
  });

  it('excludes events where the user is a TR event collaborator', async () => {
    const filters = { 'myReports.nin': ['TR event collaborator'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id).sort()).toEqual(
      [eventOwnedByMe.id, eventPocByMe.id, eventWithoutMe.id].sort()
    );
  });

  it('excludes events where the user is the TR POC', async () => {
    const filters = { 'myReports.nin': ['TR POC'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id).sort()).toEqual(
      [eventOwnedByMe.id, eventCollabByMe.id, eventWithoutMe.id].sort()
    );
  });

  it('excludes events matching any of multiple selected TR roles', async () => {
    const filters = { 'myReports.nin': ['TR event creator', 'TR POC'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id).sort()).toEqual(
      [eventCollabByMe.id, eventWithoutMe.id].sort()
    );
  });

  it('matches everything when only AR roles are selected (exclude)', async () => {
    const filters = { 'myReports.nin': ['AR approver'] };
    const { trainingReport: scope } = await filtersToScopes(filters, { userId: me.id });
    const found = await findWithScope(scope);
    expect(found.map((f) => f.id).sort()).toEqual(possibleIds.slice().sort());
  });
});
