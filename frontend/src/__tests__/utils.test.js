import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import {
  getCollabReportStatusDisplayAndClassnames,
  getRichTextAsText,
  isEmptyRichText,
  sanitizeRichText,
} from '../utils';

describe('sanitizeRichText', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['non-string', 42],
  ])('returns %s unchanged', (_label, value) => {
    expect(sanitizeRichText(value)).toBe(value);
  });

  it('preserves allowed formatting markup', () => {
    const html = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('strips unsupported atomic markup (iframe)', () => {
    const result = sanitizeRichText('<p>Before</p><iframe src="https://evil.example"></iframe>');
    expect(result).not.toContain('iframe');
    expect(result).toContain('Before');
  });

  it('strips unsupported atomic markup (img)', () => {
    const result = sanitizeRichText('<p>Legacy</p><img src="x" onerror="alert(1)" />');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
    expect(result).toContain('Legacy');
  });

  it('strips script tags', () => {
    const result = sanitizeRichText('<p>Safe</p><script>alert(1)</script>');
    expect(result).not.toContain('script');
    expect(result).toContain('Safe');
  });
});

describe('isEmptyRichText', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['non-string', 123],
    ['empty string', ''],
    ['single empty paragraph', '<p></p>'],
    ['empty paragraph with newline', '<p></p>\n'],
    ['non-breaking space paragraph', '<p>&nbsp;</p>\n'],
    ['numeric nbsp entity', '<p>&#160;</p>'],
    ['spaces only', '<p>   </p>'],
    ['multiple empty paragraphs', '<p></p><p></p><p>&nbsp;</p>'],
  ])('returns true for %s', (_label, value) => {
    expect(isEmptyRichText(value)).toBe(true);
  });

  it.each([
    ['plain text wrapped in a paragraph', '<p>Hello</p>'],
    ['text alongside empty paragraphs', '<p></p><p>Some content</p>'],
    ['formatted text', '<p><strong>Bold</strong> content</p>'],
  ])('returns false for %s', (_label, value) => {
    expect(isEmptyRichText(value)).toBe(false);
  });
});

describe('getRichTextAsText', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['non-string', 123],
    ['empty string', ''],
    ['single empty paragraph', '<p></p>'],
    ['non-breaking space paragraph', '<p>&nbsp;</p>'],
  ])('returns an empty string for %s', (_label, value) => {
    expect(getRichTextAsText(value)).toBe('');
  });

  it('strips a paragraph wrapper', () => {
    expect(getRichTextAsText('<p>Hello world</p>')).toBe('Hello world');
  });

  it('strips inline formatting markup', () => {
    expect(getRichTextAsText('<p>Improve <strong>ERSEA</strong> enrollment</p>')).toBe(
      'Improve ERSEA enrollment'
    );
  });

  it('joins multiple blocks with a single space', () => {
    expect(getRichTextAsText('<p>First</p><p>Second</p>')).toBe('First Second');
  });

  it('collapses list items and whitespace entities', () => {
    expect(getRichTextAsText('<ul><li>One</li><li>Two</li></ul>')).toBe('One Two');
    expect(getRichTextAsText('<p>a&nbsp;&#160;b</p>')).toBe('a b');
  });
});

describe('getCollabReportStatusDisplayAndClassnames', () => {
  const mockUserId = 1;
  const mockReportCreatorId = 2;
  const mockCollaboratorId = 3;
  const mockApproverId = 4;

  const createMockReport = ({
    calculatedStatus = REPORT_STATUSES.DRAFT,
    author = { id: mockReportCreatorId },
    collaboratingSpecialists = [],
    approvers = [],
  } = {}) => ({
    calculatedStatus,
    author,
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
        author: { id: mockUserId },
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Needs action');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`
      );
    });

    it('should show "Reviewed" when submitted and some but not all approvers have approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockUserId },
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.APPROVED),
          createMockApprover(5, APPROVER_STATUSES.NEEDS_ACTION),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Submitted" when report is submitted with no approvals', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockUserId },
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.NEEDS_ACTION),
          createMockApprover(5, APPROVER_STATUSES.NEEDS_ACTION),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Submitted" when report is submitted with all approvers approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockUserId },
        approvers: [
          createMockApprover(4, APPROVER_STATUSES.APPROVED),
          createMockApprover(5, APPROVER_STATUSES.APPROVED),
        ],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show default status for draft reports', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        author: { id: mockUserId },
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`
      );
    });

    it('should show default status for approved reports', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.APPROVED,
        author: { id: mockUserId },
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.APPROVED);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.APPROVED}`
      );
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
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`
      );
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
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Submitted" when submitted', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        collaboratingSpecialists: [{ id: mockUserId }],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
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
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`
      );
    });

    it('should show "Reviewed" when submitted and approver status is needs_action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.NEEDS_ACTION)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Reviewed" when single approver has set status to needs_action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.NEEDS_ACTION)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Reviewed" when single approver has approved even if report status is needs_action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Reviewed" when approver has approved', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show default status for draft reports even if user is approver', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.DRAFT,
        approvers: [createMockApprover(mockUserId, null)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`
      );
    });
  });

  describe('when user is both creator and approver', () => {
    it('should prioritize approver logic when submitted and needs action', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockUserId },
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.NEEDS_ACTION)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should show "Reviewed" when user has approved their own report', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockUserId },
        approvers: [createMockApprover(mockUserId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Reviewed');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });
  });

  describe('when user is neither creator, collaborator, nor approver', () => {
    it('should show default status and classname', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockReportCreatorId },
        collaboratingSpecialists: [{ id: mockCollaboratorId }],
        approvers: [createMockApprover(mockApproverId, APPROVER_STATUSES.APPROVED)],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.SUBMITTED);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing collaboratingSpecialists array', () => {
      const report = {
        calculatedStatus: REPORT_STATUSES.DRAFT,
        author: { id: mockUserId },
        approvers: [],
      };

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`
      );
    });

    it('should handle missing approvers array', () => {
      const report = {
        calculatedStatus: REPORT_STATUSES.DRAFT,
        author: { id: mockUserId },
        collaboratingSpecialists: [],
      };

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`
      );
    });

    it('should handle approver without user object', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        approvers: [{ status: APPROVER_STATUSES.APPROVED }],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.SUBMITTED);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should handle empty approvers array when checking for partial approval', () => {
      const report = createMockReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED,
        author: { id: mockUserId },
        approvers: [],
      });

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe('Submitted');
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`
      );
    });

    it('should handle missing author object', () => {
      const report = {
        calculatedStatus: REPORT_STATUSES.DRAFT,
        collaboratingSpecialists: [],
        approvers: [],
      };

      const result = getCollabReportStatusDisplayAndClassnames(mockUserId, report);

      expect(result.displayStatus).toBe(REPORT_STATUSES.DRAFT);
      expect(result.statusClassName).toBe(
        `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.DRAFT}`
      );
    });
  });
});
