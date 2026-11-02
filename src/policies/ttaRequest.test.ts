import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';
import TtaRequest from './ttaRequest';

jest.mock('../logger', () => ({
  auditLogger: {
    warn: jest.fn(),
  },
}));

const CREATOR_ID = 1;

const createUser = ({
  id = CREATOR_ID,
  write = false,
  read = false,
  admin = false,
  scopeIds = [] as number[],
}) => {
  const permissions = [];
  if (write) {
    permissions.push({ scopeId: SCOPES.READ_WRITE_TTA_REQUESTS, regionId: 1 });
  }
  scopeIds.forEach((scopeId) => permissions.push({ scopeId, regionId: 1 }));
  if (read) {
    permissions.push({ scopeId: SCOPES.READ_REPORTS, regionId: 1 });
  }
  if (admin) {
    permissions.push({ scopeId: SCOPES.ADMIN, regionId: 14 });
  }
  return { id, permissions };
};

const draft = { id: 10, userId: CREATOR_ID, status: TTA_REQUEST_STATUSES.DRAFT };

describe('TtaRequest policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canCreate', () => {
    it('is true with write permission in the region', () => {
      const policy = new TtaRequest(createUser({ write: true }), 1);
      expect(policy.canCreate()).toBe(true);
    });

    it('is false with only read permission, and logs the attempt', () => {
      const policy = new TtaRequest(createUser({ read: true }), 1);
      expect(policy.canCreate()).toBe(false);
      expect(auditLogger.warn).toHaveBeenCalled();
    });

    it('is false with write permission in another region', () => {
      const policy = new TtaRequest(createUser({ write: true }), 2);
      expect(policy.canCreate()).toBe(false);
    });

    it('is false with only activity report write permission', () => {
      const policy = new TtaRequest(createUser({ scopeIds: [SCOPES.READ_WRITE_REPORTS] }), 1);
      expect(policy.canCreate()).toBe(false);
    });

    it('is false with only a reviewing permission', () => {
      const policy = new TtaRequest(createUser({ scopeIds: [SCOPES.REVIEW_TTA_REQUESTS] }), 1);
      expect(policy.canCreate()).toBe(false);
    });
  });

  describe('canGet', () => {
    it('is true for the creator of a draft', () => {
      const policy = new TtaRequest(createUser({}), 1, draft);
      expect(policy.canGet()).toBe(true);
    });

    it("keeps someone else's draft private, even with read permission in the region", () => {
      const policy = new TtaRequest(createUser({ id: 2, read: true }), 1, draft);
      expect(policy.canGet()).toBe(false);
    });

    it("keeps someone else's draft private from an admin", () => {
      const policy = new TtaRequest(createUser({ id: 2, admin: true }), 1, draft);
      expect(policy.canGet()).toBe(false);
    });

    it('is true with read permission in the region when there is no request', () => {
      const policy = new TtaRequest(createUser({ id: 2, read: true }), 1);
      expect(policy.canGet()).toBe(true);
    });

    it.each([
      SCOPES.READ_WRITE_TTA_REQUESTS,
      SCOPES.REVIEW_TTA_REQUESTS,
      SCOPES.APPROVE_TTA_REQUESTS,
      SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
    ])('is true with TTA request scope %i in the region when there is no request', (scopeId) => {
      const policy = new TtaRequest(createUser({ id: 2, scopeIds: [scopeId] }), 1);
      expect(policy.canGet()).toBe(true);
    });

    it('is true for an admin when there is no request', () => {
      const policy = new TtaRequest(createUser({ id: 2, admin: true }), 1);
      expect(policy.canGet()).toBe(true);
    });

    it('is false without read permission in the region when there is no request', () => {
      const policy = new TtaRequest(createUser({ id: 2 }), 1);
      expect(policy.canGet()).toBe(false);
    });
  });

  describe('canUpdate', () => {
    it('is true for the creator of a draft with write permission', () => {
      const policy = new TtaRequest(createUser({ write: true }), 1, draft);
      expect(policy.canUpdate()).toBe(true);
    });

    it('is false for someone other than the creator', () => {
      const policy = new TtaRequest(createUser({ id: 2, write: true }), 1, draft);
      expect(policy.canUpdate()).toBe(false);
      expect(auditLogger.warn).toHaveBeenCalled();
    });

    it('is false for an admin who is not the creator', () => {
      const policy = new TtaRequest(createUser({ id: 2, admin: true, write: true }), 1, draft);
      expect(policy.canUpdate()).toBe(false);
    });

    it('is false once the request is no longer a draft', () => {
      const policy = new TtaRequest(createUser({ write: true }), 1, {
        ...draft,
        status: 'submitted',
      });
      expect(policy.canUpdate()).toBe(false);
    });

    it('is false when the creator has lost write permission', () => {
      const policy = new TtaRequest(createUser({ read: true }), 1, draft);
      expect(policy.canUpdate()).toBe(false);
    });

    it('is false without a request', () => {
      const policy = new TtaRequest(createUser({ write: true }), 1);
      expect(policy.canUpdate()).toBe(false);
    });
  });
});
