import faker from '@faker-js/faker';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db, {
  EventReportPilot,
  EventReportPilotNationalCenterUser,
  User,
  NationalCenter,
  NationalCenterUser,
} from '../models';
import updateCompletedEventReportPilots from './updateCompletedEventReportPilots';
import { createUser } from '../testUtils';

describe('updateCompletedEventReportPilots', () => {
  let nationalCenter1;
  let nationalCenter2;
  let nationalCenter3;

  let user1;
  let user2;
  let user3;

  let erp1;
  let erp2;
  let erp3;

  beforeAll(async () => {
    nationalCenter1 = await NationalCenter.create({ name: faker.datatype.string(4) });
    nationalCenter2 = await NationalCenter.create({ name: faker.datatype.string(4) });
    nationalCenter3 = await NationalCenter.create({ name: faker.datatype.string(4) });

    user1 = await createUser();
    user2 = await createUser();
    user3 = await createUser();

    await NationalCenterUser.create({ userId: user1.id, nationalCenterId: nationalCenter1.id });
    await NationalCenterUser.create({ userId: user2.id, nationalCenterId: nationalCenter2.id });
    await NationalCenterUser.create({ userId: user3.id, nationalCenterId: nationalCenter3.id });

    erp1 = await EventReportPilot.create({
      regionId: 1,
      ownerId: user1.id,
      collaboratorIds: [user2.id, user3.id],
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE },
    }, { individualHooks: false });
    erp2 = await EventReportPilot.create({
      ownerId: user2.id,
      regionId: 1,
      collaboratorIds: [user1.id, user3.id, 123_123],
      data: { status: TRAINING_REPORT_STATUSES.COMPLETE },
    }, { individualHooks: false });
    erp3 = await EventReportPilot.create({
      regionId: 1,
      collaboratorIds: [],
      ownerId: user3.id,
      data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS },
    }, { individualHooks: false });

    await EventReportPilotNationalCenterUser.destroy({
      where: {
        eventReportPilotId: [erp1.id, erp2.id, erp3.id],
      },
    });
  });

  afterAll(async () => {
    await EventReportPilotNationalCenterUser.destroy({
      where: {
        eventReportPilotId: [erp1.id, erp2.id, erp3.id],
      },
    });
    await EventReportPilot.destroy({ where: { id: [erp1.id, erp2.id, erp3.id] } });
    await NationalCenterUser.destroy({ where: { userId: [user1.id, user2.id, user3.id] } });
    await User.destroy({ where: { id: [user1.id, user2.id, user3.id] } });
    await NationalCenter.destroy({
      where: { id: [nationalCenter1.id, nationalCenter2.id, nationalCenter3.id] },
    });

    await db.sequelize.close();
  });

  it('creates EventReportPilotNationalCenterUser records for completed event report pilots', async () => {
    await updateCompletedEventReportPilots();

    let erp1Users = await EventReportPilotNationalCenterUser.findAll({
      where: { eventReportPilotId: erp1.id },
    });
    let erp2Users = await EventReportPilotNationalCenterUser.findAll({
      where: { eventReportPilotId: erp2.id },
    });
    let erp3Users = await EventReportPilotNationalCenterUser.findAll({
      where: { eventReportPilotId: erp3.id },
    });

    expect(erp1Users).toHaveLength(3);
    expect(erp2Users).toHaveLength(3);
    expect(erp3Users).toHaveLength(0);

    expect(erp1Users.map((u) => u.userId))
      .toEqual(expect.arrayContaining([user1.id, user2.id, user3.id]));
    expect(erp2Users.map((u) => u.userId))
      .toEqual(expect.arrayContaining([user1.id, user2.id, user3.id]));

    // run it again to make sure that it doesn't error on existing
    await updateCompletedEventReportPilots();

    erp1Users = await EventReportPilotNationalCenterUser.findAll({
      where: { eventReportPilotId: erp1.id },
    });
    erp2Users = await EventReportPilotNationalCenterUser.findAll({
      where: { eventReportPilotId: erp2.id },
    }); erp3Users = await EventReportPilotNationalCenterUser.findAll({
      where: { eventReportPilotId: erp3.id },
    });

    expect(erp1Users).toHaveLength(3);
    expect(erp2Users).toHaveLength(3);
    expect(erp3Users).toHaveLength(0);

    expect(erp1Users.map((u) => u.userId))
      .toEqual(expect.arrayContaining([user1.id, user2.id, user3.id]));
    expect(erp2Users.map((u) => u.userId))
      .toEqual(expect.arrayContaining([user1.id, user2.id, user3.id]));
  });
});
