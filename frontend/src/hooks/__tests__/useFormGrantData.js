import { renderHook } from '@testing-library/react-hooks';
import useFormGrantData, { calculateFormGrantData } from '../useFormGrantData';

describe('calculateFormGrantData', () => {
  it('uses grant.id when recipient has a grant object', () => {
    const recipients = [{ grant: { id: 42 } }];
    const result = calculateFormGrantData(recipients);
    expect(result.grantIds).toEqual([42]);
    expect(result.hasGrant).toBe(true);
  });

  it('falls back to activityRecipientId when no grant object', () => {
    const recipients = [{ activityRecipientId: 99 }];
    const result = calculateFormGrantData(recipients);
    expect(result.grantIds).toEqual([99]);
    expect(result.hasGrant).toBe(true);
  });

  it('reports hasMultipleGrants correctly', () => {
    const recipients = [{ grant: { id: 1 } }, { grant: { id: 2 } }];
    const result = calculateFormGrantData(recipients);
    expect(result.hasMultipleGrants).toBe(true);
  });

  it('returns empty result for empty recipients array', () => {
    const result = calculateFormGrantData([]);
    expect(result.grantIds).toEqual([]);
    expect(result.hasGrant).toBe(false);
    expect(result.hasMultipleGrants).toBe(false);
  });
});

describe('useFormGrantData', () => {
  it('returns the same result as calculateFormGrantData via useMemo', () => {
    const recipients = [{ grant: { id: 10 } }, { grant: { id: 20 } }];
    const { result } = renderHook(() => useFormGrantData(recipients));
    expect(result.current.grantIds).toEqual([10, 20]);
    expect(result.current.hasGrant).toBe(true);
    expect(result.current.hasMultipleGrants).toBe(true);
  });
});
