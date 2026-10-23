// Guard the shared source release against losing exports from parallel feature releases.
const common = require('../../packages/common/src');

describe('shared package compatibility across parallel releases', () => {
  it('preserves submitted TTA requests alongside collaboration-report constants', () => {
    expect(common.TTA_REQUEST_STATUSES.SUBMITTED).toBe('submitted');
    expect(common.TTA_REQUEST_MONITORING_STANDARD).toBe('Monitoring');
    expect(common.COLLAB_REPORT_CONDUCT_METHODS).toEqual([
      { label: 'Email', value: 'email' },
      { label: 'Phone', value: 'phone' },
      { label: 'In person', value: 'in_person' },
      { label: 'Virtual', value: 'virtual' },
    ]);
    expect(common.COLLAB_REPORT_REASONS.participate_work_groups).toBeTruthy();
    expect(common.COLLAB_REPORT_DATA.ohs_monitoring).toBe('OHS Monitoring');
  });

  it('preserves collaborator session notifications and both preference channels', () => {
    expect(common.NOTIFICATION_TYPES.TRAINING_REPORT_SESSION_SUBMITTED_COLLABORATOR).toBe(
      'trainingReportSessionSubmittedCollaborator'
    );
    expect(common.EMAIL_NOTIFICATION_SETTING_KEYS).toContain(
      'emailWhenSessionSubmittedCollaboratorTrainingReport'
    );
    expect(common.IN_APP_NOTIFICATION_SETTING_KEYS).toContain(
      'inAppWhenSessionSubmittedCollaboratorTrainingReport'
    );
  });
});
