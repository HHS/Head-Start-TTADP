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
  poc = false,
  regionId = 1,
  roles = [],
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

  if (poc) {
    permissions.push({ scopeId: SCOPES.POC_TRAINING_REPORTS, regionId });
  }

  return { id: nextUserId, permissions, roles };
};

const authorRegion1 = createUser({ write: true, regionId: 1 });
const authorRegion2 = createUser({ write: true, regionId: 2 });
const authorRegion1Collaborator = createUser({ write: true, regionId: 1 });
const pocRegion1 = createUser({ poc: true, regionId: 1 });
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

  describe('canGetGroupsForEditingSession', () => {
    it('is true if the user has write permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canGetGroupsForEditingSession()).toBe(true);
    });

    it('is true if the user has poc permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(pocRegion1, eventRegion1);
      expect(policy.canGetGroupsForEditingSession()).toBe(true);
    });

    it('is false if the user does not have write permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canGetGroupsForEditingSession()).toBe(false);
    });

    it('is true if the user is admin', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canGetGroupsForEditingSession()).toBe(true);
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
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });

      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canEditEvent()).toBe(true);
    });

    it('is false if the user is a collaborator', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        collaboratorIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canEditEvent()).toBe(false);
    });

    it('is false if the user is a poc', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canEditEvent()).toBe(false);
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

    it('is true if the user is a POC', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
        pocIds: [authorRegion1Collaborator.id],
      });
      const policy = new EventReport(authorRegion1Collaborator, eventRegion1);
      expect(policy.canCreateSession()).toBe(true);
    });

    it('is false otherwise', () => {
      const eventRegion1 = createEvent({
        ownerId: authorRegion1,
        regionId: 1,
      });
      const policy = new EventReport(authorRegion2, eventRegion1);
      expect(policy.canCreateSession()).toBe(false);
    });

    it('is true if the user has the NC role', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const ncUser = createUser({ roles: [{ name: 'NC' }] });
      const policy = new EventReport(ncUser, eventRegion1);
      expect(policy.isNationalCenterUser()).toBe(true);
    });

    it('is false if the user does not have the NC role', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const nonNcUser = createUser({ roles: [{ name: 'COR' }] });
      const policy = new EventReport(nonNcUser, eventRegion1);
      expect(policy.isNationalCenterUser()).toBe(false);
    });

    it('isNationalCenterUser is false when user.roles is undefined', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
      const userWithoutRoles = { ...createUser({}), roles: undefined };
      const policy = new EventReport(userWithoutRoles, eventRegion1);
      expect(policy.isNationalCenterUser()).toBe(false);
    });

    it('is false when user has POC scope but is not in eventReport.pocIds', () => {
      // Guards that canCreateSession is event-scoped: having the POC permission
      // scope does not grant access unless the user is explicitly listed in pocIds.
      const pocUserNotInEvent = createUser({ poc: true, regionId: 1 });
      const eventRegion1 = createEvent({
        ownerId: authorRegion1.id,
        regionId: 1,
        pocIds: [], // user NOT listed
      });
      const policy = new EventReport(pocUserNotInEvent, eventRegion1);
      expect(policy.canCreateSession()).toBe(false);
    });
  });

  describe('isSubmitted', () => {
    const eventRegion1 = createEvent({ ownerId: authorRegion1.id, regionId: 1 });
    const newFlowEvent = createEvent({
      ownerId: authorRegion1.id,
      regionId: 1,
      data: { eventOrganizer: 'Regional PD Event (with National Centers)' },
    });
    const approverId = 999;

    it('returns false when there is no session', () => {
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.isSubmitted()).toBe(false);
    });

    it('returns false when approverId is not set', () => {
      const session = { data: { pocComplete: true, collabComplete: true } };
      const policy = new EventReport(authorRegion1, eventRegion1, session);
      expect(policy.isSubmitted()).toBe(false);
    });

    it('returns true in the standard flow when approverId && pocComplete && collabComplete', () => {
      const session = { approverId, data: { pocComplete: true, collabComplete: true } };
      const policy = new EventReport(authorRegion1, eventRegion1, session);
      expect(policy.isSubmitted()).toBe(true);
    });

    it('returns false in the standard flow when only one side is complete', () => {
      const sessionA = { approverId, data: { pocComplete: true, collabComplete: false } };
      const sessionB = { approverId, data: { pocComplete: false, collabComplete: true } };
      expect(new EventReport(authorRegion1, eventRegion1, sessionA).isSubmitted()).toBe(false);
      expect(new EventReport(authorRegion1, eventRegion1, sessionB).isSubmitted()).toBe(false);
    });

    it('returns true in the national center facilitation flow when ownerComplete && collabComplete', () => {
      const session = {
        approverId,
        data: {
          ownerComplete: true,
          collabComplete: true,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(authorRegion1, newFlowEvent, session);
      expect(policy.isSubmitted()).toBe(true);
    });

    it('returns true in the national center facilitation flow for a POC-created session (pocComplete && collabComplete)', () => {
      // POCs can create NC-flow sessions; they record completion via pocComplete
      // rather than ownerComplete. The model treats these as submitted, so the
      // policy must too — otherwise approvers cannot edit and the UI shows
      // the submit form instead of approve/needs-action controls.
      const session = {
        approverId,
        data: {
          pocComplete: true,
          collabComplete: true,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(authorRegion1, newFlowEvent, session);
      expect(policy.isSubmitted()).toBe(true);
    });

    it('returns false in the national center facilitation flow when only ownerComplete is set', () => {
      const session = {
        approverId,
        data: {
          ownerComplete: true,
          collabComplete: false,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(authorRegion1, newFlowEvent, session);
      expect(policy.isSubmitted()).toBe(false);
    });

    it('returns false in the national center facilitation flow when only collabComplete is set', () => {
      const session = {
        approverId,
        data: {
          ownerComplete: false,
          collabComplete: true,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(authorRegion1, newFlowEvent, session);
      expect(policy.isSubmitted()).toBe(false);
    });

    it('ownerComplete alone does not count as submitted in the standard flow', () => {
      // Ensures the new-flow predicate only applies when eventOrganizer is set
      const session = { approverId, data: { ownerComplete: true, collabComplete: true } };
      const policy = new EventReport(authorRegion1, eventRegion1, session);
      // standard flow checks pocComplete, which is falsy → not submitted
      expect(policy.isSubmitted()).toBe(false);
    });
  });

  describe('canEditAsSessionApprover', () => {
    const newFlowEvent = createEvent({
      ownerId: authorRegion1.id,
      regionId: 1,
      data: { eventOrganizer: 'Regional PD Event (with National Centers)' },
    });

    it('allows the approver to edit a POC-created NC-flow session that has been submitted', () => {
      const approver = createUser({ read: true });
      const session = {
        approverId: approver.id,
        data: {
          pocComplete: true,
          collabComplete: true,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(approver, newFlowEvent, session);
      expect(policy.isSubmitted()).toBe(true);
      expect(policy.canEditAsSessionApprover()).toBe(true);
    });

    it('allows the approver to edit an owner-created NC-flow session that has been submitted', () => {
      const approver = createUser({ read: true });
      const session = {
        approverId: approver.id,
        data: {
          ownerComplete: true,
          collabComplete: true,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(approver, newFlowEvent, session);
      expect(policy.canEditAsSessionApprover()).toBe(true);
    });

    it('does not allow a non-approver to edit as approver even when submitted', () => {
      const approver = createUser({ read: true });
      const other = createUser({ read: true });
      const session = {
        approverId: approver.id,
        data: {
          pocComplete: true,
          collabComplete: true,
          facilitation: 'national_center',
        },
      };
      const policy = new EventReport(other, newFlowEvent, session);
      expect(policy.canEditAsSessionApprover()).toBe(false);
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

  describe('canSeeAlerts', () => {
    it('is true if the user is an admin', () => {
      const policy = new EventReport(admin, {});
      expect(policy.canSeeAlerts()).toBe(true);
    });

    it('is true if the user has read_write_training reports in any region', () => {
      const policy = new EventReport(authorRegion1, {});
      expect(policy.canSeeAlerts()).toBe(true);
    });

    it('is true if the user has poc_training reports in any region', () => {
      const policy = new EventReport(pocRegion1, {});
      expect(policy.canSeeAlerts()).toBe(true);
    });

    it('is false otherwise', () => {
      const user = createUser({ read: true, regionId: 1 });
      const policy = new EventReport(user, {});
      expect(policy.canSeeAlerts()).toBe(false);
    });
  });

  describe('canRead', () => {
    it('is true if the user has read permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canRead()).toBe(true);
    });
  });

  describe('hasPocInRegion', () => {
    it('is true if the user has poc permissions in the region', () => {
      const eventRegion1 = createEvent({ ownerId: pocRegion1, regionId: 1 });
      const policy = new EventReport(pocRegion1, eventRegion1);
      expect(policy.hasPocInRegion()).toBe(true);
    });
  });

  describe('canWriteInRegion', () => {
    it('is true if the user is an admin', () => {
      const eventRegion1 = createEvent({ ownerId: admin, regionId: 1 });
      const policy = new EventReport(admin, eventRegion1);
      expect(policy.canWriteInRegion()).toBe(true);
    });

    it('is true if the user has write permissions in the specified region', () => {
      const eventRegion1 = createEvent({ ownerId: authorRegion1, regionId: 1 });
      const policy = new EventReport(authorRegion1, eventRegion1);
      expect(policy.canWriteInRegion(1)).toBe(true);
    });
  });

  describe('readableRegions', () => {
    it('returns an array of region IDs for which the user has read permissions', () => {
      const policy = new EventReport(authorRegion1, {});
      expect(policy.readableRegions).toContain(1);
    });
  });

  describe('writableRegions', () => {
    it('returns an array of region IDs for which the user has write permissions', () => {
      const policy = new EventReport(authorRegion1, {});
      expect(policy.writableRegions).toContain(1);
    });
  });

  describe('canGetTrainingReportUsersInRegion', () => {
    it('is true if the user has write or poc permissions in the region', () => {
      const policy = new EventReport(pocRegion1, {});
      expect(policy.canGetTrainingReportUsersInRegion(1)).toBe(true);
    });
  });
});
