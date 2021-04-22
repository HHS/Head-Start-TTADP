import Grant from './grant';

describe('Grant policies', () => {
  describe('canAssignRegionAndGrantee', () => {
    it('is true if the grant is cdi', () => {
      const grant = {
        cdi: true,
      };
      const policy = new Grant(grant);
      expect(policy.canAssignRegionAndGrantee()).toBeTruthy();
    });

    it('is false if the grant is not cdi', () => {
      const grant = {
        cdi: false,
      };
      const policy = new Grant(grant);
      expect(policy.canAssignRegionAndGrantee()).toBeFalsy();
    });
  });
});
