import { renderHook } from '@testing-library/react-hooks';
import useUrlParamState from '../useUrlParamState';

describe('useUrlParamState', () => {
  let originalLocation;

  beforeAll(() => {
    originalLocation = window.location;
    delete window.location;
    window.location = { search: '' };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  it('should return empty array if URL parameter is not present', () => {
    const { result } = renderHook(() => useUrlParamState('test'));
    const [values] = result.current;
    expect(values).toEqual([]);
  });

  it('should handle invalid URL parameter gracefully', () => {
    window.location.search = '?test=invalid';
    const { result } = renderHook(() => useUrlParamState('test'));
    const [values] = result.current;
    expect(values).toEqual([]);
  });
});
