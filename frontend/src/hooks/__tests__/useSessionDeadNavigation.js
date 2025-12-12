import { renderHook } from '@testing-library/react-hooks';
import useSessionDeadNavigation from '../useSessionDeadNavigation';

describe('useSessionDeadNavigation', () => {
  it('returns dead navigation when non-admin approver has submitted form', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: false,
      isApprover: true,
      isSubmitted: true,
    }));

    expect(result.current.isSessionNavigationDead).toBe(true);
  });

  it('returns live navigation when approver has not submitted form', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: false,
      isApprover: true,
      isSubmitted: false,
    }));

    expect(result.current.isSessionNavigationDead).toBe(false);
  });

  it('returns live navigation for admin who is approver with submitted form', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: true,
      isApprover: true,
      isSubmitted: true,
    }));

    expect(result.current.isSessionNavigationDead).toBe(false);
  });

  it('returns live navigation for admin who is approver without submitted form', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: true,
      isApprover: true,
      isSubmitted: false,
    }));

    expect(result.current.isSessionNavigationDead).toBe(false);
  });

  it('returns live navigation for admin who is not approver', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: true,
      isApprover: false,
      isSubmitted: true,
    }));

    expect(result.current.isSessionNavigationDead).toBe(false);
  });

  it('returns live navigation for non-approver with submitted form', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: false,
      isApprover: false,
      isSubmitted: true,
    }));

    expect(result.current.isSessionNavigationDead).toBe(false);
  });

  it('returns live navigation when all flags are false', () => {
    const { result } = renderHook(() => useSessionDeadNavigation({
      isAdminUser: false,
      isApprover: false,
      isSubmitted: false,
    }));

    expect(result.current.isSessionNavigationDead).toBe(false);
  });
});
