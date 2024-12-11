import SCOPES from '../middleware/scopeConstants';
import CommunicationLog from './communicationLog';

const createLog = ({ userId, recipientId = 1 }) => ({
  userId,
  recipientId,
});

let nextUserId = 0;

const createUser = ({
  write = false,
  read = false,
  admin = false,
  regionId = 1,
}) => {
  const permissions = [];

  nextUserId += 1;

  if (write) {
    permissions.push({ scopeId: SCOPES.READ_WRITE_REPORTS, regionId });
  }

  if (read) {
    permissions.push({ scopeId: SCOPES.READ_REPORTS, regionId });
  }

  if (admin) {
    permissions.push({ scopeId: SCOPES.ADMIN, regionId });
  }

  return { id: nextUserId, permissions };
};

const authorRegion1 = createUser({ write: true, regionId: 1 });
const authorRegion2 = createUser({ write: true, regionId: 2 });
const admin = createUser({ admin: true });
const noPerms = createUser({});

describe('Communication Log policies', () => {
  describe('canCreateLog', () => {
    it('is true if the user has write permissions in the region', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion1, 1, log);
      expect(policy.canCreateLog()).toBe(true);
    });

    it('is false if the user does not have write permissions in the region', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion2, 1, log);
      expect(policy.canCreateLog()).toBe(false);
    });
  });

  describe('canReadLog', () => {
    it('is true if the user has read permissions in the region', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion1, 1, log);
      expect(policy.canReadLog()).toBe(true);
    });

    it('is false if the user does not have read permissions in the region', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion2, 1, log);
      expect(policy.canReadLog()).toBe(false);
    });

    it('is true if the user is an admin', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(admin, 1, log);
      expect(policy.canReadLog()).toBe(true);
    });
  });

  describe('canUpdateLog', () => {
    it('is true if the user is an admin', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(admin, 1, log);
      expect(policy.canUpdateLog()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion1, 1, log);
      expect(policy.canUpdateLog()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion2, 1, log);
      expect(policy.canUpdateLog()).toBe(false);
    });
  });

  describe('canDeleteLog', () => {
    it('is true if the user is an admin', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(admin, 1, log);
      expect(policy.canDeleteLog()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion1, 1, log);
      expect(policy.canDeleteLog()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion2, 1, log);
      expect(policy.canDeleteLog()).toBe(false);
    });
  });

  describe('canUploadFileToLog', () => {
    it('is true if the user is an admin', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(admin, 1, log);
      expect(policy.canUploadFileToLog()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion1, 1, log);
      expect(policy.canUploadFileToLog()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const log = createLog({ userId: authorRegion1.id });
      const policy = new CommunicationLog(authorRegion2, 1, log);
      expect(policy.canUploadFileToLog()).toBe(false);
    });
  });
});
