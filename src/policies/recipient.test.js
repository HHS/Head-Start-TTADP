import SCOPES from '../middleware/scopeConstants';
import Recipient from './recipient';

describe('Recipient', () => {
  describe('canView', () => {
    it('returns false if there are no read permissions', async () => {
      const user = {
        permissions: [

        ],
      };
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      };
      const recipientPolicy = new Recipient(user, recipient);
      expect(recipientPolicy.canView()).toBe(false);
    });

    it('returns true if there are read permissions', async () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      };
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      };
      const recipientPolicy = new Recipient(user, recipient);
      expect(recipientPolicy.canView()).toBe(true);
    });
  });

  describe('canReadInRegion', () => {
    it('returns false if there are no read permissions', async () => {
      const user = {
        permissions: [

        ],
      };
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      };
      const recipientPolicy = new Recipient(user, recipient);
      expect(recipientPolicy.canReadInRegion(1)).toBe(false);
    });

    describe('returns true', () => {
      it('if the user has read reports permissions', async () => {
        const user = {
          permissions: [
            {
              scopeId: SCOPES.READ_REPORTS,
              regionId: 1,
            },
          ],
        };
        const recipient = {
          grants: [
            {
              regionId: 1,
            },
          ],
        };
        const recipientPolicy = new Recipient(user, recipient);
        expect(recipientPolicy.canReadInRegion(1)).toBe(true);
      });
      it('if the user has read write reports permissions', async () => {
        const user = {
          permissions: [
            {
              scopeId: SCOPES.READ_WRITE_REPORTS,
              regionId: 1,
            },
          ],
        };
        const recipient = {
          grants: [
            {
              regionId: 1,
            },
          ],
        };
        const recipientPolicy = new Recipient(user, recipient);
        expect(recipientPolicy.canReadInRegion(1)).toBe(true);
      });

      it('if the user has approve reports permissions', async () => {
        const user = {
          permissions: [
            {
              scopeId: SCOPES.APPROVE_REPORTS,
              regionId: 1,
            },
          ],
        };
        const recipient = {
          grants: [
            {
              regionId: 1,
            },
          ],
        };
        const recipientPolicy = new Recipient(user, recipient);
        expect(recipientPolicy.canReadInRegion(1)).toBe(true);
      });
    });
  });
});
