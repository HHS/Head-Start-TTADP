import { INTERNAL_SERVER_ERROR } from 'http-codes';
import {
  getUserSettings,
  getUserEmailSettings,
  subscribe,
  unsubscribe,
  updateSettings,
} from './handlers';
import {
  saveSettings,
  subscribeAll,
  unsubscribeAll,
  userEmailSettingsById,
  userSettingsById,
} from '../../services/userSettings';

jest.mock('../../services/userSettings', () => ({
  saveSettings: jest.fn(),
  subscribeAll: jest.fn(),
  unsubscribeAll: jest.fn(),
  userEmailSettingsById: jest.fn(),
  userSettingsById: jest.fn(),
}));

describe('Settings handlers', () => {
  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };

  describe('getUserSettings', () => {
    it('should return the user settings', async () => {
      const settings = [{ id: 1, name: 'Setting 1' }, { id: 2, name: 'Setting 2' }];
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userSettingsById.mockResolvedValue(settings);

      await getUserSettings(req, res);

      expect(res.json).toHaveBeenCalledWith(settings);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userSettingsById.mockRejectedValue(error);
      await getUserSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('getUserEmailSettings', () => {
    it('should return the user email settings', async () => {
      const settings = [{ id: 1, name: 'Setting 1' }, { id: 2, name: 'Setting 2' }];
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userEmailSettingsById.mockResolvedValue(settings);

      await getUserEmailSettings(req, res);

      expect(res.json).toHaveBeenCalledWith(settings);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userEmailSettingsById.mockRejectedValue(error);
      await getUserEmailSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateSettings', () => {
    it('should update the user settings', async () => {
      const userId = 1;
      const req = { user: { id: userId }, body: [{ key: 'key', value: 'value' }] };
      const res = { ...mockResponse };

      await updateSettings(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });
    it('errors out if the body is not an array', async () => {
      const userId = 1;
      const req = {
        user: {
          id: userId,
        },
        body: 'not an array',
      };
      const res = { ...mockResponse };

      await updateSettings(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(400);
    });
    it('errors out if the body is not present', async () => {
      const userId = 1;
      const req = {
        user: {
          id: userId,
        },
      };
      const res = { ...mockResponse };

      await updateSettings(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(400);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId }, body: [{ key: 'key', value: 'value' }] };
      const res = { ...mockResponse };

      saveSettings.mockRejectedValue(error);
      await updateSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe the user', async () => {
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      await unsubscribe(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      unsubscribeAll.mockRejectedValue(error);
      await unsubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('subscribe', () => {
    it('should subscribe the user', async () => {
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      await subscribe(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      subscribeAll.mockRejectedValue(error);
      await subscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });
});
