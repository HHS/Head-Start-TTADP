import { allRoles, allSpecialistRoles } from './handlers';
import { getAllRoles } from '../../services/roles';

jest.mock('../../services/roles', () => ({
  getAllRoles: jest.fn(),
}));

describe('Roles handlers', () => {
  describe('allRoles', () => {
    it('should return all roles', async () => {
      const roles = [{ id: 1, name: 'Role 1' }, { id: 2, name: 'Role 2' }];

      getAllRoles.mockResolvedValue(roles);

      const req = {};
      const res = { json: jest.fn() };

      await allRoles(req, res);

      expect(res.json).toHaveBeenCalledWith(roles);
    });
  });

  describe('allSpecialistRoles', () => {
    it('should return all specialist roles', async () => {
      const roles = [{ id: 1, name: 'Role 1' }, { id: 2, name: 'Role 2' }];
      getAllRoles.mockResolvedValue(roles);

      const req = {};
      const res = { json: jest.fn() };

      await allSpecialistRoles(req, res);

      expect(res.json).toHaveBeenCalledWith(roles);
    });
  });
});
