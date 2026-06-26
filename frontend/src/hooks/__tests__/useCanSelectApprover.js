import { renderHook } from '@testing-library/react-hooks';
import useCanSelectApprover from '../useCanSelectApprover';

const makeWatch = (facilitation) => jest.fn(() => facilitation);

const render = ({ isOwner = false, isPoc = false, facilitation, user = { roles: [] } } = {}) =>
  renderHook(() =>
    useCanSelectApprover({
      isOwner,
      isPoc,
      watch: makeWatch(facilitation),
      user,
    })
  );

describe('useCanSelectApprover', () => {
  describe('regional owner with national-center-only facilitation', () => {
    it('returns false when the owner is not a National Center user', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: { roles: [{ name: 'Specialist' }] },
      });
      expect(result.current).toBe(false);
    });

    it('returns false when the owner has no roles array', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: {},
      });
      expect(result.current).toBe(false);
    });

    it('returns false when the user is undefined', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: undefined,
      });
      expect(result.current).toBe(false);
    });

    it('returns true (NC bypass) when the owner has the NC role', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: { roles: [{ name: 'NC' }] },
      });
      expect(result.current).toBe(true);
    });

    it('returns true (NC bypass) when NC role is present alongside other roles', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: { roles: [{ name: 'Specialist' }, { name: 'NC' }] },
      });
      expect(result.current).toBe(true);
    });
  });

  describe('owner with non-national-center-only facilitation', () => {
    it('returns true when facilitation is regional_tta_staff', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'regional_tta_staff',
      });
      expect(result.current).toBe(true);
    });

    it('returns true when facilitation is both', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'both',
      });
      expect(result.current).toBe(true);
    });

    it('returns true when facilitation is undefined', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: undefined,
      });
      expect(result.current).toBe(true);
    });
  });

  describe('POC behavior', () => {
    it('returns true when POC and facilitation includes regional_tta_staff', () => {
      const { result } = render({
        isOwner: false,
        isPoc: true,
        facilitation: 'regional_tta_staff',
      });
      expect(result.current).toBe(true);
    });

    it('returns true when POC and facilitation is both', () => {
      const { result } = render({
        isOwner: false,
        isPoc: true,
        facilitation: 'both',
      });
      expect(result.current).toBe(true);
    });

    it('returns false when POC and facilitation is national_center only', () => {
      const { result } = render({
        isOwner: false,
        isPoc: true,
        facilitation: 'national_center',
      });
      expect(result.current).toBe(false);
    });

    it('returns false when POC and facilitation is undefined', () => {
      const { result } = render({
        isOwner: false,
        isPoc: true,
        facilitation: undefined,
      });
      expect(result.current).toBe(false);
    });

    it('returns false when POC and facilitation is an unrecognised value', () => {
      const { result } = render({
        isOwner: false,
        isPoc: true,
        facilitation: 'something_else',
      });
      expect(result.current).toBe(false);
    });
  });

  describe('non-POC, non-owner-NC-only-restricted defaults', () => {
    it('returns true when neither owner nor POC, regardless of facilitation', () => {
      const { result } = render({
        isOwner: false,
        isPoc: false,
        facilitation: 'national_center',
      });
      expect(result.current).toBe(true);
    });

    it('returns true when neither owner nor POC, with regional facilitation', () => {
      const { result } = render({
        isOwner: false,
        isPoc: false,
        facilitation: 'regional_tta_staff',
      });
      expect(result.current).toBe(true);
    });

    it('returns true when neither owner nor POC, with undefined facilitation', () => {
      const { result } = render({
        isOwner: false,
        isPoc: false,
        facilitation: undefined,
      });
      expect(result.current).toBe(true);
    });
  });

  describe('isNC detection via user.roles', () => {
    it('treats an empty roles array as non-NC', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: { roles: [] },
      });
      expect(result.current).toBe(false);
    });

    it('does not match roles with a different name', () => {
      const { result } = render({
        isOwner: true,
        isPoc: false,
        facilitation: 'national_center',
        user: { roles: [{ name: 'nc' }] },
      });
      expect(result.current).toBe(false);
    });
  });

  describe('watch integration', () => {
    it('reads the facilitation field via watch', () => {
      const watch = jest.fn(() => 'regional_tta_staff');
      renderHook(() =>
        useCanSelectApprover({
          isOwner: false,
          isPoc: true,
          watch,
          user: { roles: [] },
        })
      );
      expect(watch).toHaveBeenCalledWith('facilitation');
    });

    it('recomputes the result when watch returns a new facilitation value', () => {
      let facilitation = 'national_center';
      const watch = jest.fn(() => facilitation);
      const { result, rerender } = renderHook(() =>
        useCanSelectApprover({
          isOwner: false,
          isPoc: true,
          watch,
          user: { roles: [] },
        })
      );
      expect(result.current).toBe(false);

      facilitation = 'both';
      rerender();
      expect(result.current).toBe(true);
    });
  });
});
