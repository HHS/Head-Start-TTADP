import {
  FACILITATION_NATIONAL_CENTER,
  isNationalCenterFacilitator,
  isNationalCenterUser,
  NATIONAL_CENTER_ROLE_NAME,
} from '../sessionFlow';

describe('sessionFlow helpers', () => {
  describe('isNationalCenterUser', () => {
    it('returns true when a role with the NC name is present', () => {
      expect(isNationalCenterUser({ roles: [{ name: NATIONAL_CENTER_ROLE_NAME }] })).toBe(true);
    });

    it('returns true when NC is mixed with other roles', () => {
      expect(
        isNationalCenterUser({
          roles: [{ name: 'Specialist' }, { name: NATIONAL_CENTER_ROLE_NAME }],
        })
      ).toBe(true);
    });

    it('returns false when roles is empty', () => {
      expect(isNationalCenterUser({ roles: [] })).toBe(false);
    });

    it('returns false when roles is missing', () => {
      expect(isNationalCenterUser({})).toBe(false);
    });

    it('returns false when roles is null', () => {
      expect(isNationalCenterUser({ roles: null })).toBe(false);
    });

    it('returns false when roles is not an array', () => {
      expect(isNationalCenterUser({ roles: 'NC' })).toBe(false);
    });

    it('returns false when user is undefined', () => {
      expect(isNationalCenterUser(undefined)).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(isNationalCenterUser(null)).toBe(false);
    });

    it('is case-sensitive on the role name', () => {
      expect(isNationalCenterUser({ roles: [{ name: 'nc' }] })).toBe(false);
    });

    it('does not crash when a role entry is null/undefined', () => {
      expect(
        isNationalCenterUser({
          roles: [null, undefined, { name: NATIONAL_CENTER_ROLE_NAME }],
        })
      ).toBe(true);
    });
  });

  describe('isNationalCenterFacilitator', () => {
    it('returns true for Regional PD w/ NC + national_center', () => {
      expect(
        isNationalCenterFacilitator({
          eventOrganizer: 'Regional PD Event (with National Centers)',
          facilitation: FACILITATION_NATIONAL_CENTER,
        })
      ).toBe(true);
    });

    it('returns false when eventOrganizer is Regional TTA (no National Centers)', () => {
      expect(
        isNationalCenterFacilitator({
          eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
          facilitation: FACILITATION_NATIONAL_CENTER,
        })
      ).toBe(false);
    });

    it('returns false when facilitation includes regional staff (regional_tta_staff)', () => {
      expect(
        isNationalCenterFacilitator({
          eventOrganizer: 'Regional PD Event (with National Centers)',
          facilitation: 'regional_tta_staff',
        })
      ).toBe(false);
    });

    it('returns false when facilitation is both', () => {
      expect(
        isNationalCenterFacilitator({
          eventOrganizer: 'Regional PD Event (with National Centers)',
          facilitation: 'both',
        })
      ).toBe(false);
    });

    it('returns false when eventOrganizer is missing', () => {
      expect(isNationalCenterFacilitator({ facilitation: FACILITATION_NATIONAL_CENTER })).toBe(
        false
      );
    });

    it('returns false when facilitation is missing', () => {
      expect(
        isNationalCenterFacilitator({ eventOrganizer: 'Regional PD Event (with National Centers)' })
      ).toBe(false);
    });

    it('returns false when called with no arguments', () => {
      expect(isNationalCenterFacilitator()).toBe(false);
    });
  });
});
