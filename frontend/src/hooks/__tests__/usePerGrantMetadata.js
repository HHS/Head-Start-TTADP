import { renderHook } from '@testing-library/react-hooks';
import usePerGrantMetadata from '../usePerGrantMetadata';

describe('usePerGrantMetadata', () => {
  it('handles null currentValue gracefully', () => {
    // Covers the `currentValue || {}` false branch
    const onChange = jest.fn();
    const { result } = renderHook(() => usePerGrantMetadata(null, onChange));
    expect(result.current.data).toEqual([]);
    expect(result.current.divergence).toBe(false);
  });

  it('detects divergence when multiple distinct values exist', () => {
    const onChange = jest.fn();
    const currentValue = { grant1: 'value1', grant2: 'value2' };
    const { result } = renderHook(() => usePerGrantMetadata(currentValue, onChange));
    expect(result.current.divergence).toBe(true);
  });

  it('updateSingle calls onChange with updated value', () => {
    const onChange = jest.fn();
    const currentValue = { grant1: 'value1' };
    const { result } = renderHook(() => usePerGrantMetadata(currentValue, onChange));
    result.current.updateSingle('grant1', 'newValue');
    expect(onChange).toHaveBeenCalledWith({ grant1: 'newValue' });
  });

  it('updateAll sets all grant values to the same source', () => {
    const onChange = jest.fn();
    const currentValue = { grant1: 'value1', grant2: 'value2' };
    const { result } = renderHook(() => usePerGrantMetadata(currentValue, onChange));
    result.current.updateAll('unified');
    expect(onChange).toHaveBeenCalledWith({ grant1: 'unified', grant2: 'unified' });
  });
});
