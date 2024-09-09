import { renderHook } from '@testing-library/react-hooks';
import useDashboardFilterKey from '../useDashboardFilterKey';

describe('useDashboardFilterKey', () => {
  it('should return a filter key', () => {
    const { result } = renderHook(() => useDashboardFilterKey('dashboardName', 'reportType'));
    expect(result.current).toBe('dashboardName-filters-reportType');
  });
});
