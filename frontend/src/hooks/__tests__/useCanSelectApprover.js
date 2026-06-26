import { renderHook } from '@testing-library/react-hooks';
import useCanSelectApprover from '../useCanSelectApprover';

describe('useCanSelectApprover', () => {
  it('returns true for a non-POC on national center facilitation', () => {
    const { result } = renderHook(() =>
      useCanSelectApprover({
        isPoc: false,
        watch: jest.fn(() => 'national_center'),
      })
    );

    expect(result.current).toBe(true);
  });
});
