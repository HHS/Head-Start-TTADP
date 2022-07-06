import { renderTotal } from '../index';

describe('renderTotal', () => {
  it('renders with offset > reports count', async () => {
    const result = renderTotal(10, 10, 1, 8);
    expect(result).toBe('0-8 of 8');
  });

  it('handles other cases', async () => {
    const result = renderTotal(1, 10, 1, 12);
    expect(result).toBe('2-10 of 12');
  });
});
