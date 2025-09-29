import { REPORT_STATUSES, APPROVER_STATUSES } from '@ttahub/common';
import { getCollabReportStatusDisplayAndClassnames } from '../utils';

describe('getCollabReportStatusDisplayAndClassnames', () => {
  const mockUserId = 1;
  const mockReportCreatorId = 2;
  const mockCollaboratorId = 3;
  const mockApproverId = 4;

  const createMockReport = ({
    calculatedStatus = REPORT_STATUSES.DRAFT,
    userId = mockReportCreatorId,
    collaboratingSpecialists = [],
    approvers = [],
  } = {}) => ({
    calculatedStatus,
    userId,
    collaboratingSpecialists,
    approvers,
  });

  const createMockApprover = (userId, status = null) => ({
    user: { id: userId },
    status,
  });

  describe('when user is report creator', () => {
    it('should show "Needs action" when report status is needs action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        userId: mockUserId,
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`);
    });

    it('should show "Reviewed" when submitted and some but not all approvers have approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockUserId,
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.APPROVED),
          createMockApprover(5, APPROVER_STATUSES.NEEDS_ACTION),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });

    it('should show "Submitted" when report is submitted with no approvals', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockUserId,
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.NEEDS_ACTION),
          createMockApprover(5, APPROVER_STATUSES.NEEDS_ACTION),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });

    it('should show "Submitted" when report is submitted with all approvers approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockUserId,
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.APPROVED),
          createMockApprover(5, APPROVER_STATUSES.APPROVED),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });

    it('should show default status for draft reports', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        userId: mockUserId,
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`);
    });

    it('should show default status for approved reports', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.APPROVED,
        userId: mockUserId,
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.APPROVED);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.APPROVED}`);
    });
  });

  describe('when user is collaborating specialist', () => {
    it('should show "Needs action" when report status is needs action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        collaboratingSpecialists: [{ id: mockUserId }],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`);
    });

    it('should show "Reviewed" when submitted and partially approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        collaboratingSpecialists: [{ id: mockUserId }],
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.APPROVED),
          createMockApprover(5, APPROVER_STATUSES.NEEDS_ACTION),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });

    it('should show "Submitted" when submitted', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        collaboratingSpecialists: [{ id: mockUserId }],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });
  });

  describe('when user is an approver', () => {
    it('should show "Needs action" when submitted and approver has not reviewed', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [createMockApprover(mockUserId, null)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`);
    });

    it('should show "Needs action" when submitted and approver status is needs_action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.NEEDS_ACTION)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`);
    });

    it('should show "Needs action" when report status is needs_action regardless of approver status', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`);
    });

    it('should show "Reviewed" when approver has approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });

    it('should show default status for draft reports even if user is approver', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        approvers: [createMockApprover(mockUserId, null)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`);
    });
  });

  describe('when user is both creator and approver', () => {
    it('should prioritize approver logic when submitted and needs action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockUserId,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.NEEDS_ACTION)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`);
    });

    it('should show "Reviewed" when user has approved their own report', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockUserId,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });
  });

  describe('when user is neither creator, collaborator, nor approver', () => {
    it('should show default status and classname', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockReportCreatorId,
        collaboratingSpecialists: [{ id: mockCollaboratorId }],
        approvers: [createMockApprover(mockApproverId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.SUBMITTED);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });
  });

  describe('edge cases', () => {
    it('should handle missing collaboratingSpecialists array', () => {
      const report = {
        calculatedStatus: REPORT_STATUSES.DRAFT,
        userId: mockUserId,
        approvers: [],
      };

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`);
    });

    it('should handle missing approvers array', () => {
      const report = {
        calculatedStatus: REPORT_STATUSES.DRAFT,
        userId: mockUserId,
        collaboratingSpecialists: [],
      };

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`);
    });

    it('should handle approver without user object', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [{ status: APPROVER_STATUSES.APPROVED }],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.SUBMITTED);
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });

    it('should handle empty approvers array when checking for partial approval', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        userId: mockUserId,
        approvers: [],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(`smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`);
    });
  });
});
