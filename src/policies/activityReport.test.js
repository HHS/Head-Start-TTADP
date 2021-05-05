import ActivityReport from './activityReport';
import SCOPES from '../middleware/scopeConstants';
import { REPORT_STATUSES } from '../constants';

function activityReport(
  author,
  collaborator,
  status = REPORT_STATUSES.DRAFT,
  approvingManager = null,
) {
  const report = {
    userId: author,
    regionId: 1,
    collaborators: [],
    approvingManagerId: approvingManager,
    status,
  };

  if (collaborator) {
    report.collaborators.push(collaborator);
  }

  return report;
}

function user(write, read, admin, id = 1) {
  const u = { id, permissions: [] };
  if (write) {
    u.permissions.push({
      scopeId: SCOPES.READ_WRITE_REPORTS,
      regionId: 1,
    });
  }

  if (read) {
    u.permissions.push({
      scopeId: SCOPES.READ_REPORTS,
      regionId: 1,
    });
  }

  if (admin) {
    u.permissions.push({
      scopeId: SCOPES.ADMIN,
      regionId: null,
    });
  }

  return u;
}

const author = user(true, false, false, 1);
const collaborator = user(true, false, false, 2);
const manager = user(true, false, false, 3);
const otherUser = user(false, true, false, 4);
const canNotReadRegion = user(false, false, false, 5);
const admin = user(true, true, true, 6);

describe('Activity Report policies', () => {
  describe('canReview', () => {
    it('is true if the user is the approving manager', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.SUBMITTED, manager.id);
      const policy = new ActivityReport(manager, report);
      expect(policy.canReview()).toBeTruthy();
    });

    it('is false if the user is not the approving manager', () => {
      const report = activityReport(author.id);
      const policy = new ActivityReport(author, report);
      expect(policy.canReview()).toBeFalsy();
    });
  });

  describe('canCreate', () => {
    it('is true if the user has write permissions in the region', () => {
      const report = activityReport(author.id);
      const policy = new ActivityReport(author, report);
      expect(policy.canCreate()).toBeTruthy();
    });

    it('is false if the user does not have write permissions in the region', () => {
      const report = activityReport(otherUser.id);
      const policy = new ActivityReport(otherUser, report);
      expect(policy.canCreate()).toBeFalsy();
    });
  });

  describe('canUpdate', () => {
    describe('if the user has write permissions in the region', () => {
      it('is true if the user is the author', () => {
        const report = activityReport(author.id);
        const policy = new ActivityReport(author, report);
        expect(policy.canUpdate()).toBeTruthy();
      });

      it('is true if the user is the author and report status is NEEDS_ACTION', () => {
        const report = activityReport(author.id, null, REPORT_STATUSES.NEEDS_ACTION);
        const policy = new ActivityReport(author, report);
        expect(policy.canUpdate()).toBeTruthy();
      });

      it('is true if the user is a collaborator', () => {
        const report = activityReport(author.id, collaborator);
        const policy = new ActivityReport(collaborator, report);
        expect(policy.canUpdate()).toBeTruthy();
      });

      it('is false for non-authors/collaborators', () => {
        const report = activityReport(author.id);
        const policy = new ActivityReport(otherUser, report);
        expect(policy.canUpdate()).toBeFalsy();
      });
    });

    it('is false if the user cannot write in the region', () => {
      const report = activityReport(otherUser.id);
      const policy = new ActivityReport(otherUser, report);
      expect(policy.canUpdate()).toBeFalsy();
    });

    it('is false if the report has been submitted', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.SUBMITTED);
      const policy = new ActivityReport(author, report);
      expect(policy.canUpdate()).toBeFalsy();
    });

    it('is false if the report has been approved', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.APPROVED);
      const policy = new ActivityReport(author, report);
      expect(policy.canUpdate()).toBeFalsy();
    });
  });

  describe('canReset', () => {
    it('is false for reports that have not been submitted', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.APPROVED);
      const policy = new ActivityReport(author, report);
      expect(policy.canReset()).toBeFalsy();
    });

    it('is true for the author', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.SUBMITTED);
      const policy = new ActivityReport(author, report);
      expect(policy.canReset()).toBeTruthy();
    });

    it('is true for collaborators', () => {
      const report = activityReport(author.id, collaborator, REPORT_STATUSES.SUBMITTED);
      const policy = new ActivityReport(collaborator, report);
      expect(policy.canReset()).toBeTruthy();
    });

    it('is false for other users', () => {
      const report = activityReport(author.id, collaborator, REPORT_STATUSES.SUBMITTED);
      const policy = new ActivityReport(otherUser, report);
      expect(policy.canReset()).toBeFalsy();
    });
  });

  describe('canViewLegacy', () => {
    it('is true if the user can view the region', () => {
      const report = activityReport(author.id);
      const policy = new ActivityReport(author, report);
      expect(policy.canViewLegacy()).toBeTruthy();
    });

    it('is false if the user can not view the region', () => {
      const report = activityReport(author.id);
      const policy = new ActivityReport(canNotReadRegion, report);
      expect(policy.canViewLegacy()).toBeFalsy();
    });
  });

  describe('canGet', () => {
    describe('for unapproved reports', () => {
      it('is true for the author', () => {
        const report = activityReport(author.id);
        const policy = new ActivityReport(author, report);
        expect(policy.canGet()).toBeTruthy();
      });

      it('is true for the collaborator', () => {
        const report = activityReport(author.id, collaborator);
        const policy = new ActivityReport(collaborator, report);
        expect(policy.canGet()).toBeTruthy();
      });

      it('is true for the approving manager', () => {
        const report = activityReport(author.id, null, REPORT_STATUSES.DRAFT, manager.id);
        const policy = new ActivityReport(manager, report);
        expect(policy.canGet()).toBeTruthy();
      });

      it('is false for any user not associated with the report', () => {
        const report = activityReport(author.id);
        const policy = new ActivityReport(otherUser, report);
        expect(policy.canGet()).toBeFalsy();
      });
    });

    describe('for approved reports', () => {
      it('is true for users with read permissions in the region', () => {
        const report = activityReport(author.id, null, REPORT_STATUSES.APPROVED);
        const policy = new ActivityReport(otherUser, report);
        expect(policy.canGet()).toBeTruthy();
      });
    });
  });

  describe('canDelete', () => {
    it('is true for author of draft report', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.DRAFT);
      const policy = new ActivityReport(author, report);
      expect(policy.canDelete()).toBeTruthy();
    });

    it('is true for admin user of draft report', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.DRAFT);
      const policy = new ActivityReport(admin, report);
      expect(policy.canDelete()).toBeTruthy();
    });

    it('is false for any non-admin/non-author user of draft report', () => {
      const report = activityReport(author.id, collaborator, REPORT_STATUSES.DRAFT);
      const policy = new ActivityReport(collaborator, report);
      expect(policy.canDelete()).toBeFalsy();
    });

    it('is false for author of non-draft report', () => {
      const report = activityReport(author.id, null, REPORT_STATUSES.SUBMITTED);
      const policy = new ActivityReport(author, report);
      expect(policy.canDelete()).toBeFalsy();
    });
  });
});
