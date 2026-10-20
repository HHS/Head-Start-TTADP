import { faker } from '@faker-js/faker';
import db, { NationalCenter, NationalCenterUser, User } from '..';

describe('NationalCenterUser', () => {
  let user;
  let updatedUser;
  let nationalCenter;
  let updatedNationalCenter;
  let nationalCenterUser;
  beforeAll(async () => {
    // Create mock user.
    user = await User.create({
      id: faker.number.int({ min: 0, max: 99999 }),
      homeRegionId: 1,
      hsesUsername: faker.string.sample(),
      hsesUserId: faker.string.sample(),
      lastLogin: new Date(),
    });

    // create mock updated user.
    updatedUser = await User.create({
      id: faker.number.int({ min: 0, max: 99999 }),
      homeRegionId: 1,
      hsesUsername: faker.string.sample(),
      hsesUserId: faker.string.sample(),
      lastLogin: new Date(),
    });

    // Create mock national center.
    nationalCenter = await NationalCenter.create({
      id: faker.number.int({ min: 10000, max: 100000 }),
      name: faker.company.name(),
    });

    // create mock updated national center.
    updatedNationalCenter = await NationalCenter.create({
      id: faker.number.int({ min: 10000, max: 100000 }),
      name: faker.company.name(),
    });

    // Create mock national center user.
    nationalCenterUser = await NationalCenterUser.create({
      nationalCenterId: nationalCenter.id,
      userId: user.id,
    });
  });
  afterAll(async () => {
    // Delete mock national center user.
    await NationalCenterUser.destroy({
      where: {
        id: nationalCenterUser.id,
      },
    });

    // Delete mock national center.
    await NationalCenter.destroy({
      where: {
        id: [nationalCenter.id, updatedNationalCenter.id],
      },
    });

    // Delete mock user.
    await User.destroy({
      where: {
        id: [user.id, updatedUser.id],
      },
    });
    await db.sequelize.close();
  });

  it('nationalCenterUser', async () => {
    // Get the national center user.
    const nationalCenterUserToCheck = await NationalCenterUser.findOne({
      where: {
        id: nationalCenterUser.id,
      },
    });

    // Assert national center user values.
    expect(nationalCenterUserToCheck).toHaveProperty('id');
    expect(nationalCenterUserToCheck.nationalCenterId).toEqual(parseInt(nationalCenter.id, 10));
    expect(nationalCenterUserToCheck.userId).toEqual(user.id);

    // Update the national center user values.
    await nationalCenterUserToCheck.update({
      nationalCenterId: updatedNationalCenter.id,
      userId: updatedUser.id,
    });

    // Retrieve updated national center user.
    const updatedNationalCenterUser = await NationalCenterUser.findOne({
      where: {
        id: nationalCenterUser.id,
      },
    });

    // Assert updated national center user values.
    expect(updatedNationalCenterUser).toHaveProperty('id');
    // eslint-disable-next-line max-len
    expect(updatedNationalCenterUser.nationalCenterId).toEqual(
      parseInt(updatedNationalCenter.id, 10)
    );
    expect(updatedNationalCenterUser.userId).toEqual(updatedUser.id);
  });
});
