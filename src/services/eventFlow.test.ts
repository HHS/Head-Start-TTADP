import {
  FACILITATION_NATIONAL_CENTER,
  isNationalCenterFacilitator,
  isNationalCenterUser,
  isSessionSubmitted,
  NATIONAL_CENTER_ROLE_NAME,
  REGIONAL_PD_WITH_NATIONAL_CENTERS,
} from './eventFlow';
import type { EventShape, SessionShape } from './types/event';

const buildEvent = (overrides: Partial<EventShape['data']> = {}): EventShape => ({
  id: 1,
  ownerId: 1,
  pocIds: [],
  collaboratorIds: [],
  regionId: 1,
  data: {
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    status: 'In progress',
    eventId: 'R01-TR-1',
    eventName: 'Event',
    eventSubmitted: false,
    additionalStates: [],
    ...overrides,
  },
  updatedAt: '2024-01-01',
  sessionReports: [],
  owner: undefined,
  version: 2,
});

const buildSession = (
  overrides: Partial<SessionShape> = {},
  dataOverrides: Partial<SessionShape['data']> = {}
): SessionShape => ({
  id: 1,
  approverId: undefined,
  submitterId: null,
  data: {
    sessionName: 'session',
    status: 'In progress',
    endDate: '2024-01-02',
    startDate: '2024-01-01',
    useIpdCourses: false,
    isIstVisit: 'no',
    nextSteps: [],
    pocComplete: false,
    collabComplete: false,
    objectiveTrainers: [],
    ...dataOverrides,
  },
  ...overrides,
});

describe('eventFlow', () => {
  describe('constants', () => {
    it('exposes the expected string values', () => {
      expect(REGIONAL_PD_WITH_NATIONAL_CENTERS).toBe('Regional PD Event (with National Centers)');
      expect(FACILITATION_NATIONAL_CENTER).toBe('national_center');
      expect(NATIONAL_CENTER_ROLE_NAME).toBe('NC');
    });
  });

  describe('isNationalCenterUser', () => {
    it('returns false for null/undefined user', () => {
      expect(isNationalCenterUser(null)).toBe(false);
      expect(isNationalCenterUser(undefined)).toBe(false);
    });

    it('returns false when roles is missing or not an array', () => {
      expect(isNationalCenterUser({})).toBe(false);
      expect(isNationalCenterUser({ roles: null })).toBe(false);
      // @ts-expect-error - intentionally bad shape
      expect(isNationalCenterUser({ roles: 'NC' })).toBe(false);
    });

    it('returns false when no role matches NC', () => {
      expect(isNationalCenterUser({ roles: [] })).toBe(false);
      expect(isNationalCenterUser({ roles: [{ name: 'TTAC' }, { name: 'COR' }] })).toBe(false);
    });

    it('tolerates null/undefined role entries', () => {
      expect(isNationalCenterUser({ roles: [null, undefined, { name: 'COR' }] })).toBe(false);
      expect(isNationalCenterUser({ roles: [null, { name: 'NC' }] })).toBe(true);
    });

    it('returns true when a role has name "NC"', () => {
      expect(isNationalCenterUser({ roles: [{ name: 'NC' }] })).toBe(true);
      expect(isNationalCenterUser({ roles: [{ name: 'COR' }, { name: 'NC' }] })).toBe(true);
    });
  });

  describe('isNationalCenterFacilitator', () => {
    it('returns true when organizer is Regional PD w/ NC and facilitation is national_center', () => {
      const event = buildEvent({ eventOrganizer: REGIONAL_PD_WITH_NATIONAL_CENTERS });
      const session = buildSession({}, { facilitation: FACILITATION_NATIONAL_CENTER });
      expect(isNationalCenterFacilitator(event, session)).toBe(true);
    });

    it('returns false when organizer is different', () => {
      const event = buildEvent({
        eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
      });
      const session = buildSession({}, { facilitation: FACILITATION_NATIONAL_CENTER });
      expect(isNationalCenterFacilitator(event, session)).toBe(false);
    });

    it('returns false when facilitation is different', () => {
      const event = buildEvent({ eventOrganizer: REGIONAL_PD_WITH_NATIONAL_CENTERS });
      const session = buildSession({}, { facilitation: 'other' });
      expect(isNationalCenterFacilitator(event, session)).toBe(false);
    });
  });

  describe('isSessionSubmitted', () => {
    const event = buildEvent({ eventOrganizer: REGIONAL_PD_WITH_NATIONAL_CENTERS });
    const nonNcEvent = buildEvent({
      eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
    });

    it('returns false when session.data is missing', () => {
      // @ts-expect-error - intentionally bad shape
      expect(isSessionSubmitted(event, { id: 1, submitterId: null })).toBe(false);
      expect(isSessionSubmitted(event, null as unknown as SessionShape)).toBe(false);
    });

    it('returns false when there is no approverId', () => {
      const session = buildSession({}, { collabComplete: true, pocComplete: true });
      expect(isSessionSubmitted(nonNcEvent, session)).toBe(false);
    });

    it('returns false when collabComplete is false', () => {
      const session = buildSession({ approverId: 7 }, { collabComplete: false, pocComplete: true });
      expect(isSessionSubmitted(nonNcEvent, session)).toBe(false);
    });

    describe('non-NC flow', () => {
      it('requires pocComplete to be true', () => {
        const session = buildSession(
          { approverId: 7 },
          { collabComplete: true, pocComplete: false, ownerComplete: true }
        );
        expect(isSessionSubmitted(nonNcEvent, session)).toBe(false);
      });

      it('returns true when approverId + collabComplete + pocComplete', () => {
        const session = buildSession(
          { approverId: 7 },
          { collabComplete: true, pocComplete: true }
        );
        expect(isSessionSubmitted(nonNcEvent, session)).toBe(true);
      });
    });

    describe('NC facilitation flow', () => {
      it('returns true when ownerComplete is set (even without pocComplete)', () => {
        const session = buildSession(
          { approverId: 7 },
          {
            facilitation: FACILITATION_NATIONAL_CENTER,
            collabComplete: true,
            pocComplete: false,
            ownerComplete: true,
          }
        );
        expect(isSessionSubmitted(event, session)).toBe(true);
      });

      it('returns true when pocComplete is set (even without ownerComplete)', () => {
        const session = buildSession(
          { approverId: 7 },
          {
            facilitation: FACILITATION_NATIONAL_CENTER,
            collabComplete: true,
            pocComplete: true,
            ownerComplete: false,
          }
        );
        expect(isSessionSubmitted(event, session)).toBe(true);
      });

      it('returns false when neither ownerComplete nor pocComplete is set', () => {
        const session = buildSession(
          { approverId: 7 },
          {
            facilitation: FACILITATION_NATIONAL_CENTER,
            collabComplete: true,
            pocComplete: false,
            ownerComplete: false,
          }
        );
        expect(isSessionSubmitted(event, session)).toBe(false);
      });
    });
  });
});
