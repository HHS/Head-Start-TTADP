import moment from 'moment';
import faker from '@faker-js/faker';
import { SiteAlert, User, sequelize } from '../../models';
import { ALERT_STATUSES } from '../../constants';
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
    });

    // Create a published alert
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: moment().add(1, 'day').format('YYYY-MM-DD'),
      startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
    }));

    // create a second published alert, the newest one
    newestAlert = await SiteAlert.create(({
      userId: mockUser.id,
      endDate: moment().add(1, 'day').format('YYYY-MM-DD'),
      startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
    }));

    // create a draft alert
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: moment().add(1, 'day').format('YYYY-MM-DD'),
      startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.DRAFT,
      title: faker.lorem.sentence(),
    }));

    // create an alert that's already ended
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
      startDate: moment().subtract(2, 'day').format('YYYY-MM-DD'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
    }));

    // create an alert that hasn't started yet
    await SiteAlert.create(({
      userId: mockUser.id,
      endDate: moment().add(2, 'day').format('YYYY-MM-DD'),
      startDate: moment().add(1, 'day').format('YYYY-MM-DD'),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
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
