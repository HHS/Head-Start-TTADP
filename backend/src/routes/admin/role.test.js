import { getRoles, saveRoles } from './role';
import {
  Role,
} from '../../models';

jest.mock('../../models', () => ({
  Role: {
    findAll: jest.fn(),
  },
  sequelize: {
    col: jest.fn(),
  },
}));

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
  query: {},
};

describe('admin/roles', () => {
  describe('getRoles', () => {
    it('returns roles', async () => {
      const roles = [{ id: 1 }];
      Role.findAll.mockResolvedValue(roles);
      await getRoles(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(roles);
    });

    it('handles errors', async () => {
      Role.findAll.mockRejectedValue(new Error('error'));
      await getRoles(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('saveRoles', () => {
    it('saves roles', async () => {
      const roles = [{ id: 1 }];
      Role.bulkCreate = jest.fn();
      Role.bulkCreate.mockResolvedValue(roles);
      Role.findAll.mockResolvedValue(roles);
      await saveRoles({ body: { roles } }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(roles);
    });

    it('handles errors', async () => {
      const roles = [{ id: 1 }];
      Role.bulkCreate = jest.fn();
      Role.bulkCreate.mockRejectedValue(new Error('error'));
      await saveRoles({ body: { roles } }, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
