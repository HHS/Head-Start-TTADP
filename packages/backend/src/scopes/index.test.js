import { mergeIncludes } from '.';

describe('mergeIncludes', () => {
  it('returns requiredIncludes when includes is not provided', () => {
    const out = mergeIncludes([], [1]);
    expect(out).toMatchObject([1]);
  });

  it('merges includes with requiredIncludes and removes duplicates based on "as"', () => {
    const includes = [{ as: 'existing' }, { as: 'duplicate' }];
    const requiredIncludes = [{ as: 'required' }, { as: 'duplicate' }];
    const expectedOutput = [
      { as: 'existing' },
      { as: 'duplicate' },
      { as: 'required' },
    ];
    const out = mergeIncludes(includes, requiredIncludes);
    expect(out).toMatchObject(expectedOutput);
  });

  it('returns only unique includes when includes has no matching "as"', () => {
    const includes = [{ as: 'unique1' }];
    const requiredIncludes = [{ as: 'unique2' }];
    const expectedOutput = [
      { as: 'unique1' },
      { as: 'unique2' },
    ];
    const out = mergeIncludes(includes, requiredIncludes);
    expect(out).toMatchObject(expectedOutput);
  });
});
