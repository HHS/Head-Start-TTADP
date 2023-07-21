import SCOPES from '../middleware/scopeConstants';
import EventReport from './event';

const createEvent = ({
  ownerId = 1,
  pocIds = [1],
  collaboratorIds = [],
  regionId = 1,
}) => ({
  ownerId,
  pocIds,
  collaboratorIds,
  regionId,
  data: {},
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
    permissions.push({ scopeId: SCOPES.READ_TRAINING_REPORTS, regionId });
  }

  if (admin) {
    permissions.push({ scopeId: SCOPES.ADMIN, regionId });
  }

  return { id: nextUserId, permissions };
};

const authorRegion1 = createUser({ write: true, regionId: 1 });
const authorRegion2 = createUser({ write: true, regionId: 2 });
const authorRegion1Collaborator = createUser({ write: true, regionId: 1 });
const admin = createUser({ admin: true });
const noPerms = createUser({});

describe('Event Report policies', () => {
  describe('canCreate', () => {
    it('is true if the user has write permissions in the region', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canCreate()).toBe(true);
    });

    it('is false if the user does not have write permissions in the region', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canCreate()).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canDelete()).toBe(false);
    });
  });

  describe('canUpdate', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canUpdate()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canUpdate()).toBe(true);
    });

    it('is true if the user is a collaborator', () => {
      // eslint-disable-next-line max-len
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1, pocIds: [authorRegion1Collaborator.id] });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canUpdate()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canUpdate()).toBe(false);
    });
  });

  describe('canReadInRegion', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canReadInRegion()).toBe(true);
    });

    it('is true if the user has read permissions in the region', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canReadInRegion()).toBe(true);
    });

    it('is false if the user does not have read permissions in the region', () => {
      const eventRegion1 = createEvent({ author: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canReadInRegion()).toBe(false);
    });
  });
});
