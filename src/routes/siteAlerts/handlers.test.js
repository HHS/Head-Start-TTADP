import { DateTime } from 'luxon';
import faker from '@faker-js/faker';
import { ALERT_STATUSES, ALERT_VARIANTS, ALERT_SIZES } from '@ttahub/common';
import { SiteAlert, User, sequelize } from '../../models';
import { getSiteAlerts } from './handlers';

describe('site alerts', () => {
  let mockUser;
  let newestAlert;

  beforeAll(async () => {
    mockUser = await User.create({
      hsesUserId: faker.datatype.string(),
      name: faker.name.findName(),
      email: faker.internet.email(),
      homeRegionId: 1,
      hsesUsername: faker.internet.userName(),
      lastLogin: new Date(),
    });

    // Create a published alert
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: DateTime.local().plus({ days: 1 }).toFormat('yyyy-MM-dd'),
      startDate: DateTime.local().minus({ days: 1 }).toFormat('yyyy-MM-dd'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
      size: ALERT_SIZES.STANDARD,
    }));

    // create a second published alert, the newest one
    newestAlert = await SiteAlert.create(({
      userId: mockUser.id,
      endDate: DateTime.local().plus({ days: 1 }).toFormat('yyyy-MM-dd'),
      startDate: DateTime.local().minus({ days: 1 }).toFormat('yyyy-MM-dd'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
      size: ALERT_SIZES.STANDARD,
    }));

    // create a draft alert
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: DateTime.local().plus({ days: 1 }).toFormat('yyyy-MM-dd'),
      startDate: DateTime.local().minus({ days: 1 }).toFormat('yyyy-MM-dd'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.DRAFT,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
      size: ALERT_SIZES.STANDARD,
    }));

    // create an alert that's already ended
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: DateTime.local().minus({ days: 1 }).toFormat('yyyy-MM-dd'),
      startDate: DateTime.local().minus({ days: 2 }).toFormat('yyyy-MM-dd'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.EMERGENCY,
      size: ALERT_SIZES.STANDARD,
    }));

    // create an alert that hasn't started yet
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: DateTime.local().plus({ days: 2 }).toFormat('yyyy-MM-dd'),
      startDate: DateTime.local().plus({ days: 1 }).toFormat('yyyy-MM-dd'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
      size: ALERT_SIZES.STANDARD,
    }));
  });

  afterAll(async () => {
    await SiteAlert.destroy({
      where: {
        userId: mockUser.id,
      },
    });

    await User.destroy({
      where: {
        id: mockUser.id,
      },
    });

    await sequelize.close();
  });

  it('fetches the most recently created published alert', async () => {
    const mockResponse = {
      json: jest.fn(),
    };

    await getSiteAlerts({}, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith({
      id: newestAlert.id,
      endDate: expect.any(Date),
      startDate: expect.any(Date),
      message: newestAlert.message,
      status: ALERT_STATUSES.PUBLISHED,
      title: newestAlert.title,
      variant: ALERT_VARIANTS.INFO,
      size: ALERT_SIZES.STANDARD,
    });
  });

  it('handles errors', async () => {
    const mockResponse = {
      sendStatus: jest.fn(),
    };

    const oldFindAll = SiteAlert.findAll;
    const mockFindAll = jest.fn().mockRejectedValue(new Error('test error'));
    SiteAlert.findAll = mockFindAll;

    await getSiteAlerts({}, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(500);
    SiteAlert.findAll = oldFindAll;
  });
});
