import { NOTIFICATION_CONFIGURATION, NOTIFICATION_TYPES } from './constants';

describe('NOTIFICATION_CONFIGURATION', () => {
  describe(NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED, () => {
    const config = NOTIFICATION_CONFIGURATION[NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED];

    it('textFn recipientName', () => {
      expect(config.textFn({ userName: 'Alice', recipientName: 'Head Start Program' })).toBe(
        'An Activity Report for Head Start Program has been submitted for approval.'
      );
    });

    it('actionable is true', () => {
      expect(config.actionable).toBe(true);
    });

    it('linkFn returns the activity report path with the given id', () => {
      expect(config.linkFn({ id: 42 })).toBe('/activity-reports/42');
    });

    it('linkText returns "Take action"', () => {
      expect(config.linkText()).toBe('Take action');
    });

    it('displayId returns the displayId param', () => {
      expect(config.displayId({ displayId: 'AR-123' })).toBe('AR-123');
    });
  });
  describe(NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED, () => {
    const config =
      NOTIFICATION_CONFIGURATION[NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED];

    it('textFn interpolates author and recipientName', () => {
      expect(config.textFn({ author: 'Alice', recipientName: 'Head Start Program' })).toBe(
        'Alice added you as a Collaborator on their Activity Report for Head Start Program.'
      );
    });

    it('actionable is false', () => {
      expect(config.actionable).toBe(false);
    });

    it('linkFn returns the activity report path with the given id', () => {
      expect(config.linkFn({ id: 42 })).toBe('/activity-reports/42');
    });

    it('linkText returns "View AR"', () => {
      expect(config.linkText()).toBe('View AR');
    });

    it('displayId returns the displayId param', () => {
      expect(config.displayId({ displayId: 'AR-123' })).toBe('AR-123');
    });
  });
  describe(NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION, () => {
    const config = NOTIFICATION_CONFIGURATION[NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION];

    it('textFn interpolates approver and recipientName', () => {
      expect(config.textFn({ approver: 'Alice', recipientName: 'Head Start Program' })).toBe(
        'Alice has requested changes to your Activity Report for Head Start Program.'
      );
    });

    it('actionable is true', () => {
      expect(config.actionable).toBe(true);
    });

    it('linkFn returns the activity report path with the given id', () => {
      expect(config.linkFn({ id: 42 })).toBe('/activity-reports/42');
    });

    it('linkText returns "Take Action"', () => {
      expect(config.linkText()).toBe('Take Action');
    });

    it('displayId returns the displayId param', () => {
      expect(config.displayId({ displayId: 'AR-123' })).toBe('AR-123');
    });
  });
  describe(NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR, () => {
    const config =
      NOTIFICATION_CONFIGURATION[NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION_COLLABORATOR];

    it('textFn interpolates approver and recipientName', () => {
      expect(config.textFn({ approver: 'Alice', recipientName: 'Head Start Program' })).toBe(
        'Alice has requested changes to your Activity Report for Head Start Program.'
      );
    });

    it('actionable is false', () => {
      expect(config.actionable).toBe(false);
    });

    it('linkFn returns the activity report path with the given id', () => {
      expect(config.linkFn({ id: 42 })).toBe('/activity-reports/42');
    });

    it('linkText returns "View AR"', () => {
      expect(config.linkText()).toBe('View AR');
    });

    it('displayId returns the displayId param', () => {
      expect(config.displayId({ displayId: 'AR-123' })).toBe('AR-123');
    });
  });

  describe(NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE, () => {
    const config = NOTIFICATION_CONFIGURATION[NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE];

    it('textFn interpolates date', () => {
      expect(config.textFn({ date: '6/15/2026 8:00 PM – 10:00 PM ET' })).toBe(
        'Planned outage: the TTA Hub will be closed for maintenance from 6/15/2026 8:00 PM – 10:00 PM ET'
      );
    });

    it('actionable is false', () => {
      expect(config.actionable).toBe(false);
    });

    it('linkFn returns null', () => {
      expect(config.linkFn()).toBeNull();
    });

    it('linkText returns null', () => {
      expect(config.linkText()).toBeNull();
    });

    it('displayId returns null', () => {
      expect(config.displayId()).toBeNull();
    });
  });
});
