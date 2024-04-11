import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import EventReport from './event';

const createEvent = ({
  ownerId = 1,
  pocIds = [1],
  collaboratorIds = [],
  regionId = 1,
  data = {},
}) => ({
  ownerId,
  pocIds,
  collaboratorIds,
  regionId,
  data,
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
const authorRegion1Collaborator = createUser({ write: true, regionId: 1 });
const admin = createUser({ admin: true });

describe('Event Report policies', () => {
  describe('canCreate', () => {
    it('is true if the user has write permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canCreate()).toBe(true);
    });

    it('is false if the user does not have write permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canCreate()).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        data: { status: TRAINING_REPORT_STATUSES.NOT_STARTED },
      });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1.id,
        regionId: 1,
        data: { status: TRAINING_REPORT_STATUSES.NOT_STARTED },
      });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is false if the event is in progress', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1.id,
        regionId: 1,
        data: { status: TRAINING_REPORT_STATUSES.IN_PROGRESS },
      });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canDelete()).toBe(false);
    });

    it('is false if the event is complete', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1.id,
        regionId: 1,
        data: { status: TRAINING_REPORT_STATUSES.COMPLETE },
      });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canDelete()).toBe(false);
    });

    it('is true if the event is suspended', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1.id,
        regionId: 1,
        data: { status: TRAINING_REPORT_STATUSES.SUSPENDED },
      });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canDelete()).toBe(true);
    });

    it('is false if the user is not an admin or the author', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        data: { status: TRAINING_REPORT_STATUSES.NOT_STARTED },
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canDelete()).toBe(false);
    });
  });

  describe('canEditEvent', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canEditEvent()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canEditEvent()).toBe(true);
    });

    it('is true if the user is a poc', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canEditEvent()).toBe(true);
    });

    it('is false if the user is only a collab', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        collaboratorIds: [authorRegion2],
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canEditEvent()).toBe(false);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canEditEvent()).toBe(false);
    });
  });

  describe('canCreateSession', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canCreateSession()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canCreateSession()).toBe(true);
    });

    it('is true if the user is a collaborator', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        collaboratorIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canCreateSession()).toBe(true);
    });

    it('is false if the user is a POC', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canCreateSession()).toBe(false);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canCreateSession()).toBe(false);
    });
  });

  describe('canUploadFile', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canUploadFile()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canUploadFile()).toBe(true);
    });

    it('is true if the user is a collaborator', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        collaboratorIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canUploadFile()).toBe(true);
    });

    it('is true if the user is a POC', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canUploadFile()).toBe(true);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canUploadFile()).toBe(false);
    });
  });

  describe('canEditSession', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canEditSession()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canEditSession()).toBe(true);
    });

    it('is true if the user is a collaborator', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        collaboratorIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canEditSession()).toBe(true);
    });

    it('is true if the user is a POC', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canEditSession()).toBe(true);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canEditSession()).toBe(false);
    });
  });

  describe('canDeleteSession', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canDeleteSession()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canDeleteSession()).toBe(true);
    });

    it('is true if the user is a collaborator', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        collaboratorIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canDeleteSession()).toBe(true);
    });

    it('is true if the user is a POC', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canDeleteSession()).toBe(true);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canDeleteSession()).toBe(false);
    });
  });

  describe('canSuspendOrCompleteEvent', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canSuspendOrCompleteEvent()).toBe(true);
    });

    it('is true if the user is the author', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canSuspendOrCompleteEvent()).toBe(true);
    });

    it('is false if the user is a collaborator', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        collaboratorIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canSuspendOrCompleteEvent()).toBe(false);
    });

    it('is false if the user is a POC', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canSuspendOrCompleteEvent()).toBe(false);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canDeleteSession()).toBe(false);
    });
  });

  describe('canReadInRegion', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canReadInRegion()).toBe(true);
    });

    it('is true if the user has read permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canReadInRegion()).toBe(true);
    });

    it('is false if the user does not have read permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canReadInRegion()).toBe(false);
    });
  });
});
