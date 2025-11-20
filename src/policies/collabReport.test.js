import { REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';
import CollabReport from './collabReport';

describe('CollabReport Policy', () => {
  let user;
  let collabReport;

  beforeEach(() => {
    user = {
      id: 1,
      permissions: [
        { scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 1 },
        { scopeId: SCOPES.APPROVE_REPORTS, regionId: 1 },
        { scopeId: SCOPES.READ_REPORTS, regionId: 2 },
      ],
    };

    collabReport = {
      id: 1,
      regionId: 1,
      userId: 1,
      calculatedStatus: REPORT_STATUSES.DRAFT,
      submissionStatus: REPORT_STATUSES.DRAFT,
      approvers: [],
      collabReportSpecialists: [],
    };
  });

  describe('constructor', () => {
    it('should initialize with user and collabReport', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.user).toEqual(user);
      expect(policy.collabReport).toEqual(collabReport);
    });
  });

  describe('isAuthor', () => {
    it('should return true when user is the author', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.isAuthor()).toBe(true);
    });

    it('should return false when user is not the author', () => {
      collabReport.userId = 2;
      const policy = new CollabReport(user, collabReport);
      expect(policy.isAuthor()).toBe(false);
    });
  });

  describe('isCollaborator', () => {
    it('should return true when user is a collaborator', () => {
      collabReport.collabReportSpecialists = [
        { specialist: { id: 1 } },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isCollaborator()).toBe(true);
    });

    it('should return false when user is not a collaborator', () => {
      collabReport.collabReportSpecialists = [
        { specialist: { id: 2 } },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isCollaborator()).toBe(false);
    });

    it('should return false when no collaborators exist', () => {
      collabReport.collabReportSpecialists = [];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isCollaborator()).toBe(false);
    });

    it('should return false when collabReportSpecialists is null', () => {
      collabReport.collabReportSpecialists = null;
      const policy = new CollabReport(user, collabReport);
      expect(policy.isCollaborator()).toBe(false);
    });
  });

  describe('isApprovingManager', () => {
    it('should return true when user is an approver', () => {
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isApprovingManager()).toBe(true);
    });

    it('should return false when user is not an approver', () => {
      collabReport.approvers = [
        { user: { id: 2 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isApprovingManager()).toBe(false);
    });

    it('should return false when no approvers exist', () => {
      collabReport.approvers = null;
      const policy = new CollabReport(user, collabReport);
      expect(policy.isApprovingManager()).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true when user has admin scope', () => {
      user.permissions.push({ scopeId: SCOPES.ADMIN, regionId: 1 });
      const policy = new CollabReport(user, collabReport);
      expect(policy.isAdmin()).toBe(true);
    });

    it('should return false when user does not have admin scope', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.isAdmin()).toBe(false);
    });
  });

  describe('isUnlockAdmin', () => {
    it('should return true when user has unlock admin scope', () => {
      user.permissions.push({ scopeId: SCOPES.UNLOCK_APPROVED_REPORTS, regionId: 1 });
      const policy = new CollabReport(user, collabReport);
      expect(policy.isUnlockAdmin()).toBe(true);
    });

    it('should return false when user does not have unlock admin scope', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.isUnlockAdmin()).toBe(false);
    });
  });

  describe('canWriteInRegion', () => {
    it('should return true when user has write permission in report region', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canWriteInRegion()).toBe(true);
    });

    it('should return false when user does not have write permission in report region', () => {
      collabReport.regionId = 3;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canWriteInRegion()).toBe(false);
    });

    it('should work with dataValues regionId', () => {
      collabReport.regionId = null;
      collabReport.dataValues = { regionId: 1 };
      const policy = new CollabReport(user, collabReport);
      expect(policy.canWriteInRegion()).toBe(true);
    });
  });

  describe('canApproveInRegion', () => {
    it('should return true when user has approve permission in report region', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canApproveInRegion()).toBe(true);
    });

    it('should return false when user does not have approve permission in report region', () => {
      collabReport.regionId = 2;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canApproveInRegion()).toBe(false);
    });
  });

  describe('canReadInRegion', () => {
    it('should return true when user has read permission in report region', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReadInRegion()).toBe(true);
    });

    it('should return false when user has no read permission in report region', () => {
      collabReport.regionId = 3;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReadInRegion()).toBe(false);
    });

    it('should return true for region with read-only permission', () => {
      collabReport.regionId = 2;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReadInRegion()).toBe(true);
    });
  });

  describe('reportHasEditableStatus', () => {
    it('should return true for draft calculatedStatus', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.DRAFT;
      const policy = new CollabReport(user, collabReport);
      expect(policy.reportHasEditableStatus()).toBe(true);
    });

    it('should return true for draft submissionStatus', () => {
      collabReport.submissionStatus = REPORT_STATUSES.DRAFT;
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.reportHasEditableStatus()).toBe(true);
    });

    it('should return true for needs action status', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.NEEDS_ACTION;
      const policy = new CollabReport(user, collabReport);
      expect(policy.reportHasEditableStatus()).toBe(true);
    });

    it('should return false for approved status', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      collabReport.submissionStatus = REPORT_STATUSES.APPROVED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.reportHasEditableStatus()).toBe(false);
    });

    it('should return false for submitted status', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      collabReport.submissionStatus = REPORT_STATUSES.SUBMITTED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.reportHasEditableStatus()).toBe(false);
    });
  });

  describe('hasBeenMarkedByApprover', () => {
    it('should return true when report status is needs action', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.NEEDS_ACTION;
      const policy = new CollabReport(user, collabReport);
      expect(policy.hasBeenMarkedByApprover()).toBe(true);
    });

    it('should return true when an approver has approved', () => {
      collabReport.approvers = [
        { status: REPORT_STATUSES.APPROVED },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.hasBeenMarkedByApprover()).toBe(true);
    });

    it('should return false when no approver has marked', () => {
      collabReport.approvers = [
        { status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.hasBeenMarkedByApprover()).toBe(false);
    });
  });

  describe('isApproverAndCreator', () => {
    it('should return true when user is both approver and creator', () => {
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isApproverAndCreator()).toBe(true);
    });

    it('should return false when user is only creator', () => {
      collabReport.approvers = [];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isApproverAndCreator()).toBe(false);
    });

    it('should return false when user is only approver', () => {
      collabReport.userId = 2;
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.isApproverAndCreator()).toBe(false);
    });
  });

  describe('canCreate', () => {
    it('should return true when user can write in region', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canCreate()).toBe(true);
    });

    it('should return false when user cannot write in region', () => {
      collabReport.regionId = 3;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canCreate()).toBe(false);
    });
  });

  describe('canReview', () => {
    it('should return true when user is approving manager and can approve in region', () => {
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReview()).toBe(true);
    });

    it('should return false when user is not an approving manager', () => {
      collabReport.approvers = [];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReview()).toBe(false);
    });

    it('should return false when user cannot approve in region', () => {
      collabReport.regionId = 2;
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReview()).toBe(false);
    });
  });

  describe('canUpdate', () => {
    it('should return true when user is author and report is editable', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUpdate()).toBe(true);
    });

    it('should return true when user is collaborator and report is editable', () => {
      collabReport.userId = 2;
      collabReport.collabReportSpecialists = [
        { specialist: { id: 1 } },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUpdate()).toBe(true);
    });

    it('should return false when user is author but report is not editable', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      collabReport.submissionStatus = REPORT_STATUSES.APPROVED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUpdate()).toBe(false);
    });

    it('should return true when user is approver and report is submitted', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUpdate()).toBe(true);
    });

    it('should return false when user is approver but report has been marked', () => {
      collabReport.userId = 2; // User is not the author
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
        { user: { id: 2 }, status: REPORT_STATUSES.APPROVED },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUpdate()).toBe(false);
    });

    it('should return false when user has no permissions', () => {
      collabReport.userId = 2;
      collabReport.regionId = 3;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUpdate()).toBe(false);
    });
  });

  describe('canReset', () => {
    it('should return true when user is author and report is submitted', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReset()).toBe(true);
    });

    it('should return true when user is collaborator and report is submitted', () => {
      collabReport.userId = 2;
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      collabReport.collabReportSpecialists = [
        { specialist: { id: 1 } },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReset()).toBe(true);
    });

    it('should return false when report is not submitted', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.DRAFT;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReset()).toBe(false);
    });

    it('should return false when user is not author or collaborator', () => {
      collabReport.userId = 2;
      collabReport.calculatedStatus = REPORT_STATUSES.SUBMITTED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canReset()).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should return true when user is admin and report is not approved', () => {
      user.permissions.push({ scopeId: SCOPES.ADMIN, regionId: 1 });
      collabReport.calculatedStatus = REPORT_STATUSES.DRAFT;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canDelete()).toBe(true);
    });

    it('should return true when user is author and report is not approved', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.DRAFT;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canDelete()).toBe(true);
    });

    it('should return false when report is approved', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canDelete()).toBe(false);
    });

    it('should return false when user is not admin or author', () => {
      collabReport.userId = 2;
      collabReport.calculatedStatus = REPORT_STATUSES.DRAFT;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canDelete()).toBe(false);
    });
  });

  describe('canUnlock', () => {
    it('should return true when user is unlock admin and report is approved', () => {
      user.permissions.push({ scopeId: SCOPES.UNLOCK_APPROVED_REPORTS, regionId: 1 });
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUnlock()).toBe(true);
    });

    it('should return false when user is not unlock admin', () => {
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUnlock()).toBe(false);
    });

    it('should return false when report is not approved', () => {
      user.permissions.push({ scopeId: SCOPES.UNLOCK_APPROVED_REPORTS, regionId: 1 });
      collabReport.calculatedStatus = REPORT_STATUSES.DRAFT;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canUnlock()).toBe(false);
    });
  });

  describe('canViewLegacy', () => {
    it('should return true when user can read in region', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canViewLegacy()).toBe(true);
    });

    it('should return false when user cannot read in region', () => {
      collabReport.regionId = 3;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canViewLegacy()).toBe(false);
    });
  });

  describe('canGet', () => {
    it('should return true when user is author', () => {
      const policy = new CollabReport(user, collabReport);
      expect(policy.canGet()).toBe(true);
    });

    it('should return true when user is collaborator', () => {
      collabReport.userId = 2;
      collabReport.collabReportSpecialists = [
        { specialist: { id: 1 } },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canGet()).toBe(true);
    });

    it('should return true when user is approving manager', () => {
      collabReport.userId = 2;
      collabReport.approvers = [
        { user: { id: 1 }, status: 'pending' },
      ];
      const policy = new CollabReport(user, collabReport);
      expect(policy.canGet()).toBe(true);
    });

    it('should return true when report is approved and user is admin', () => {
      collabReport.userId = 2;
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      user.permissions.push({ scopeId: SCOPES.ADMIN, regionId: 1 });
      const policy = new CollabReport(user, collabReport);
      expect(policy.canGet()).toBe(true);
    });

    it('should return true when report is approved and user can read in region', () => {
      collabReport.userId = 2;
      collabReport.calculatedStatus = REPORT_STATUSES.APPROVED;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canGet()).toBe(true);
    });

    it('should return false when user has no relationship to report', () => {
      collabReport.userId = 2;
      collabReport.regionId = 3;
      const policy = new CollabReport(user, collabReport);
      expect(policy.canGet()).toBe(false);
    });
  });
});
