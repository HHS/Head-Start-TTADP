import { INTERNAL_SERVER_ERROR } from 'http-codes';
import db from '../../models';
import { currentUserId } from '../../services/currentUser';
import {
  saveSettings,
  subscribeAll,
  unsubscribeAll,
  userEmailSettingsById,
  userSettingsById,
} from '../../services/userSettings';
import {
  getUserEmailSettings,
  getUserSettings,
  subscribe,
  unsubscribe,
  updateSettings,
} from './handlers';

jest.mock('../../services/currentUser');
jest.mock('../../services/userSettings', () => ({
  saveSettings: jest.fn(),
  subscribeAll: jest.fn(),
  unsubscribeAll: jest.fn(),
  userEmailSettingsById: jest.fn(),
  userSettingsById: jest.fn(),
}));

describe('Settings handlers', () => {
  afterAll(() => db.sequelize.close());
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
    it('includes notification keys in the response', async () => {
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userSettingsById.mockResolvedValue([
        { key: 'emailWhenReportApproval', value: 'never' },
        { key: 'emailWhenCollaboratorReportSubmittedForReview', value: 'today' },
        { key: 'inAppWhenReportSubmittedForReview', value: 'true' },
        { key: 'someOtherKey', value: 'whatever' },
      ]);

      currentUserId.mockResolvedValue(userId);
      await getUserSettings(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'emailWhenReportApproval' }),
          expect.objectContaining({ key: 'emailWhenCollaboratorReportSubmittedForReview' }),
          expect.objectContaining({ key: 'inAppWhenReportSubmittedForReview' }),
        ])
      );
      const call = res.json.mock.calls[0][0];
      expect(call.find(({ key }) => key === 'someOtherKey')).toBeUndefined();
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userSettingsById.mockRejectedValue(error);
      currentUserId.mockResolvedValue(userId);
      await getUserSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('getUserEmailSettings', () => {
    it('should return the user email settings', async () => {
      const settings = [
        { id: 1, name: 'Setting 1' },
        { id: 2, name: 'Setting 2' },
      ];
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userEmailSettingsById.mockResolvedValue(settings);

      currentUserId.mockResolvedValue(userId);
      await getUserEmailSettings(req, res);

      expect(res.json).toHaveBeenCalledWith(settings);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      userEmailSettingsById.mockRejectedValue(error);
      currentUserId.mockResolvedValue(userId);
      await getUserEmailSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateSettings', () => {
    it('should update the user settings', async () => {
      const userId = 1;
      const req = { user: { id: userId }, body: [{ key: 'key', value: 'value' }] };
      const res = { ...mockResponse };

      currentUserId.mockResolvedValue(userId);
      await updateSettings(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });
    it('does not filter out boolean false values', async () => {
      const userId = 1;
      const req = {
        user: { id: userId },
        body: [{ key: 'inAppWhenReportSubmittedForReview', value: false }],
      };
      const res = { ...mockResponse };

      currentUserId.mockResolvedValue(userId);
      await updateSettings(req, res);

      expect(saveSettings).toHaveBeenLastCalledWith(expect.anything(), [
        { key: 'inAppWhenReportSubmittedForReview', value: false },
      ]);
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

      currentUserId.mockResolvedValue(userId);
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

      currentUserId.mockResolvedValue(userId);
      await updateSettings(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(400);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId }, body: [{ key: 'key', value: 'value' }] };
      const res = { ...mockResponse };

      saveSettings.mockRejectedValue(error);
      currentUserId.mockResolvedValue(userId);
      await updateSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe the user', async () => {
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      currentUserId.mockResolvedValue(userId);
      await unsubscribe(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      unsubscribeAll.mockRejectedValue(error);
      currentUserId.mockResolvedValue(userId);
      await unsubscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });

  describe('subscribe', () => {
    it('should subscribe the user', async () => {
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      currentUserId.mockResolvedValue(userId);
      await subscribe(req, res);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it('handles errors', async () => {
      const error = new Error('Something went wrong');
      const userId = 1;
      const req = { user: { id: userId } };
      const res = { ...mockResponse };

      subscribeAll.mockRejectedValue(error);
      currentUserId.mockResolvedValue(userId);
      await subscribe(req, res);

      expect(res.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });
});
