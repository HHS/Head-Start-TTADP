import fakerUnique, { resetFakerUnique, uniqueTestId } from './fakerUnique';

describe('fakerUnique', () => {
  afterEach(() => {
    resetFakerUnique();
  });

  it('can reset seen values', () => {
    const generator = jest.fn(() => 'same-value');

    expect(fakerUnique(generator)).toBe('same-value');
    expect(() => fakerUnique(generator, 2)).toThrow(
      'fakerUnique: exceeded maximum retries (2) generating a unique value'
    );

    resetFakerUnique();

    expect(fakerUnique(generator, 1)).toBe('same-value');
  });
});

describe('uniqueTestId', () => {
  it('hands out increasing ids that leave room for derived offsets', () => {
    const first = uniqueTestId();
    const second = uniqueTestId();

    expect(second - first).toBeGreaterThanOrEqual(1000);
  });

  it('stays above sequence-assigned ids and inside a Postgres INTEGER', () => {
    const id = uniqueTestId();

    expect(id).toBeGreaterThanOrEqual(1_000_000_000);
    expect(id).toBeLessThan(2_147_483_647);
  });
});
