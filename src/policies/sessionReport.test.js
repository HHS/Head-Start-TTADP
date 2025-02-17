import SCOPES from '../middleware/scopeConstants';
import SessionReport from './sessionReport';

const createReport = ({ author, regionId = 1, eventId = 1 }) => ({
  ownerId: author.id,
  regionId,
  eventId,
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
    permissions.push({ scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS, regionId });
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

describe('Session Report policies', () => {
  describe('canCreate', () => {
    it('is true if the user has write permissions in the region', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion1, reportRegion1);
      expect(policy.canCreate()).toBe(true);
    });

    it('is false if the user does not have write permissions in the region', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion2, reportRegion1);
      expect(policy.canCreate()).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('is true if the user is an admin', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(admin, reportRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion1, reportRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion2, reportRegion1);
      expect(policy.canDelete()).toBe(false);
    });
  });

  describe('canUpdate', () => {
    it('is true if the user is an admin', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(admin, reportRegion1);
      expect(policy.canUpdate()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion1, reportRegion1);
      expect(policy.canUpdate()).toBe(true);
    });

    it('is false if the user is not an admin, author, or collaborator', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion2, reportRegion1);
      expect(policy.canUpdate()).toBe(false);
    });
  });

  describe('canReadInRegion', () => {
    it('is true if the user has read permissions in the region', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion1, reportRegion1);
      expect(policy.canRead()).toBe(true);
    });

    it('is false if the user does not have read permissions in the region', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion2, reportRegion1);
      expect(policy.canRead()).toBe(false);
    });

    it('is true if the user is an admin', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(admin, reportRegion1);
      expect(policy.canRead()).toBe(true);
    });
  });

  describe('canWriteInRegion', () => {
    it('is true if the user is an admin', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(admin, reportRegion1);
      expect(policy.canWriteInRegion()).toBe(true);
    });

    it('is true if the user has write permissions in the region', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion1, reportRegion1);
      expect(policy.canWriteInRegion()).toBe(true);
    });

    it('is false if the user does not have write permissions in the region', () => {
      const reportRegion1 = createReport({ author: authorRegion1, regionId: 1 });
      const policy = new SessionReport(authorRegion2, reportRegion1);
      expect(policy.canWriteInRegion()).toBe(false);
    });

    it('is false if the user has no permissions', () => {
      const reportRegion1 = createReport({ author: noPerms, regionId: 1 });
      const policy = new SessionReport(noPerms, reportRegion1);
      expect(policy.canWriteInRegion()).toBe(false);
    });

    it('is false if the user has read permissions but not write permissions in the region', () => {
      const readOnlyUser = createUser({ read: true, regionId: 1 });
      const reportRegion1 = createReport({ author: readOnlyUser, regionId: 1 });
      const policy = new SessionReport(readOnlyUser, reportRegion1);
      expect(policy.canWriteInRegion()).toBe(false);
    });

    it('is true if the user is not an admin, and provided regionId is not null', () => {
      const writeUser = createUser({ write: true, regionId: 1 });
      const reportRegion1 = createReport({ author: writeUser, regionId: 1 });
      const policy = new SessionReport(writeUser, reportRegion1);
      expect(policy.canWriteInRegion(1)).toBe(true);
    });
  });

  describe('permissions default', () => {
    it('defaults to an empty array if user has no permissions', () => {
      const userWithoutPermissions = { id: 999 };
      const reportRegion1 = createReport({ author: userWithoutPermissions, regionId: 1 });
      const policy = new SessionReport(userWithoutPermissions, reportRegion1);
      expect(policy.permissions).toEqual([]);
    });
  });
});
