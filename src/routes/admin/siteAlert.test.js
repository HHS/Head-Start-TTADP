import faker from '@faker-js/faker';
import moment from 'moment';
import httpCodes from 'http-codes';
import { ALERT_STATUSES, ALERT_VARIANTS } from '../../constants';
import SCOPES from '../../middleware/scopeConstants';
import {
  User,
  SiteAlert,
  Permission,
  sequelize,
} from '../../models';
import {
  getAlerts,
  getAlert,
  deleteAlert,
  createAlert,
  saveAlert,
} from './siteAlert';

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

describe('site alert admin handler', () => {
  let adminUser;
  beforeAll(async () => {
    adminUser = await User.create({
      hsesUserId: faker.datatype.string(),
      name: faker.name.findName(),
      email: faker.internet.email(),
      homeRegionId: 1,
      hsesUsername: faker.internet.userName(),
    });

    await Permission.create({
      userId: adminUser.id,
      scopeId: SCOPES.ADMIN,
      regionId: 1,
    });

    await SiteAlert.create({
      userId: adminUser.id,
      endDate: faker.date.future(),
      startDate: faker.date.past(),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.UNPUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
    });

    await SiteAlert.create({
      userId: adminUser.id,
      endDate: faker.date.future(),
      startDate: faker.date.past(),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
    });

    await SiteAlert.create({
      userId: adminUser.id,
      endDate: faker.date.future(),
      startDate: faker.date.past(),
      message: faker.lorem.sentence(),
      status: ALERT_STATUSES.PUBLISHED,
      title: faker.lorem.sentence(),
      variant: ALERT_VARIANTS.INFO,
    });
  });

  afterAll(async () => {
    await SiteAlert.destroy({
      where: {
        userId: adminUser.id,
      },
    });

    await Permission.destroy({
      where: {
        userId: adminUser.id,
      },
    });
    await User.destroy({
      where: {
        id: adminUser.id,
      },
    });

    await sequelize.close();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('getAlerts', () => {
    it('should return all alerts', async () => {
      await getAlerts({}, mockResponse);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('handles errors', async () => {
      const oldFindAll = SiteAlert.findAll;
      const mockFindAll = jest.fn().mockRejectedValue(new Error('error'));
      SiteAlert.findAll = mockFindAll;
      await getAlerts({}, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
      SiteAlert.findAll = oldFindAll;
    });
  });

  describe('getAlert', () => {
    it('should return a single alert', async () => {
      const existingAlert = await SiteAlert.findOne({
        where: {
          userId: adminUser.id,
          status: ALERT_STATUSES.UNPUBLISHED,
        },
      });

      await getAlert({ params: { alertId: existingAlert.id } }, mockResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminUser.id,
          variant: existingAlert.variant,
          endDate: existingAlert.endDate,
          startDate: existingAlert.startDate,
          message: existingAlert.message,
          status: ALERT_STATUSES.UNPUBLISHED,
          title: expect.any(String),
        }),
      );
    });

    it('handles errors', async () => {
      const oldFindByPk = SiteAlert.findByPk;
      const mockFindByPk = jest.fn().mockRejectedValue(new Error('error'));
      SiteAlert.findByPk = mockFindByPk;
      await getAlert({ params: { alertId: 1 } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
      SiteAlert.findByPk = oldFindByPk;
    });
  });

  describe('deleteAlert', () => {
    it('should delete a single alert', async () => {
      const existingAlert = await SiteAlert.findOne({
        where: {
          userId: adminUser.id,
          status: ALERT_STATUSES.PUBLISHED,
        },
      });

      await deleteAlert({ params: { alertId: existingAlert.id } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.NO_CONTENT);
    });

    it('handles errors', async () => {
      const oldFindOne = SiteAlert.findOne;
      const oldDestroy = SiteAlert.destroy;
      const mockFindOne = jest.fn().mockResolvedValue({ id: 1 });
      const mockDestroy = jest.fn().mockRejectedValue(new Error('error'));
      SiteAlert.destroy = mockDestroy;
      SiteAlert.findOne = mockFindOne;
      await deleteAlert({ params: { alertId: 1 } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
      SiteAlert.destroy = oldDestroy;
      SiteAlert.findOne = oldFindOne;
    });
  });

  describe('createAlert', () => {
    it('should create an alert', async () => {
      const newAlert = {
        endDate: moment(faker.date.future()).format('MM/DD/YYYY'),
        startDate: moment(faker.date.past()).format('MM/DD/YYYY'),
        message: faker.lorem.sentence(),
        status: ALERT_STATUSES.UNPUBLISHED,
        title: faker.lorem.sentence(),
        variant: ALERT_VARIANTS.INFO,
      };

      await createAlert({ body: newAlert, session: { userId: adminUser.id } }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining(newAlert));
    });

    it('errors if a required field isn\'t provided', async () => {
      const newAlert = {
        endDate: faker.date.future(),
        startDate: faker.date.past(),
        message: faker.lorem.sentence(),
      };

      await createAlert({ body: newAlert }, mockResponse, true);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    });

    it('handles generic errors', async () => {
      const newAlert = {
        endDate: faker.date.future(),
        startDate: faker.date.past(),
        message: faker.lorem.sentence(),
        status: ALERT_STATUSES.UNPUBLISHED,
        title: faker.lorem.sentence(),
        userId: adminUser.id,
        variant: ALERT_VARIANTS.INFO,
      };
      const oldCreate = SiteAlert.create;
      const mockCreate = jest.fn().mockRejectedValue(new Error('error'));
      SiteAlert.create = mockCreate;
      await createAlert({ body: newAlert }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
      SiteAlert.create = oldCreate;
    });
  });

  describe('saveAlert', () => {
    it('updates an existing alert', async () => {
      const existingAlert = await SiteAlert.findOne({
        where: {
          userId: adminUser.id,
          status: ALERT_STATUSES.UNPUBLISHED,
        },
      });

      const message = faker.lorem.sentence();
      const title = faker.lorem.sentence();

      await saveAlert(
        {
          body: {
            message,
            title,
          },
          params: {
            alertId: existingAlert.id,
          },
        },
        mockResponse,
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminUser.id,
          endDate: existingAlert.endDate,
          startDate: existingAlert.startDate,
          message,
          status: ALERT_STATUSES.UNPUBLISHED,
          title,
          variant: existingAlert.variant,
        }),
      );
    });

    it('handles generic errors', async () => {
      const oldUpdate = SiteAlert.update;
      const oldFindByPk = SiteAlert.findByPk;
      const mockUpdate = jest.fn().mockRejectedValue(new Error('error'));
      const mockFindByPk = jest.fn().mockResolvedValue({ id: 1 });
      SiteAlert.update = mockUpdate;
      SiteAlert.findByPk = mockFindByPk;
      await saveAlert({ params: { alertId: 1 } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
      SiteAlert.update = oldUpdate;
      SiteAlert.findByPk = oldFindByPk;
    });

    it('handles errors if the alert doesn\'t exist', async () => {
      const oldFindByPk = SiteAlert.findByPk;
      const mockFindByPk = jest.fn().mockResolvedValue(null);
      SiteAlert.findByPk = mockFindByPk;
      await saveAlert({ params: { alertId: 1 } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
      SiteAlert.findByPk = oldFindByPk;
    });
  });
});
