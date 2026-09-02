import faker from '@faker-js/faker';
import db, { CommunicationLog, CommunicationLogStaff, User } from '..';

describe('CommunicationLogStaff', () => {
  let author;
  let staffUser;
  let log;
  let communicationLogStaff;

  const createMockUser = () =>
    User.create({
      id: faker.datatype.number(),
      homeRegionId: 1,
      hsesUsername: faker.datatype.string(),
      hsesUserId: faker.datatype.string(),
      lastLogin: new Date(),
    });

  beforeAll(async () => {
    author = await createMockUser();
    staffUser = await createMockUser();

    log = await CommunicationLog.create({
      userId: author.id,
      data: { regionId: 1 },
    });

    communicationLogStaff = await CommunicationLogStaff.create({
      communicationLogId: log.id,
      userId: staffUser.id,
    });
  });

  afterAll(async () => {
    await CommunicationLogStaff.destroy({ where: { id: communicationLogStaff.id } });
    await CommunicationLog.destroy({ where: { id: log.id } });
    await User.destroy({ where: { id: [author.id, staffUser.id] } });
    await db.sequelize.close();
  });

  it('persists the foreign keys', async () => {
    const found = await CommunicationLogStaff.findOne({
      where: { id: communicationLogStaff.id },
    });

    expect(found).toHaveProperty('id');
    expect(found.communicationLogId).toEqual(log.id);
    expect(found.userId).toEqual(staffUser.id);
  });

  it('associates with the user', async () => {
    const found = await CommunicationLogStaff.findOne({
      where: { id: communicationLogStaff.id },
      include: [{ model: User, as: 'user' }],
    });

    expect(found.user).toBeTruthy();
    expect(found.user.id).toEqual(staffUser.id);
  });

  it('associates with the communication log', async () => {
    const found = await CommunicationLogStaff.findOne({
      where: { id: communicationLogStaff.id },
      include: [{ model: CommunicationLog, as: 'communicationLog' }],
    });

    expect(found.communicationLog).toBeTruthy();
    expect(found.communicationLog.id).toEqual(log.id);
  });

  it('is reachable from the communication log association', async () => {
    const found = await CommunicationLog.findOne({
      where: { id: log.id },
      include: [{ model: CommunicationLogStaff, as: 'communicationLogStaff' }],
    });

    expect(found.communicationLogStaff.length).toEqual(1);
    expect(found.communicationLogStaff[0].userId).toEqual(staffUser.id);
  });
});
