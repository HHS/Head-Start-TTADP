import validateOtherEntityObjectives from './validateOtherEntityObjectives';

describe('validateOtherEntityObjectives', () => {
  it('accepts objectives that only target other entities', () => {
    expect(validateOtherEntityObjectives([])).toBe(true);
    expect(
      validateOtherEntityObjectives([
        { title: 'a', recipientIds: [1, 2] },
        { title: 'b', recipientIds: [3], goalId: null },
      ])
    ).toBe(true);
  });

  it.each([
    ['a non array payload', undefined],
    ['a string payload', 'objectives'],
    ['a null objective', [null]],
    ['a missing recipientIds list', [{ title: 'a' }]],
    ['a null entity id', [{ recipientIds: [null] }]],
    ['a zero entity id', [{ recipientIds: [0] }]],
    ['a negative entity id', [{ recipientIds: [-1] }]],
    ['a string entity id', [{ recipientIds: ['1'] }]],
    ['a fractional entity id', [{ recipientIds: [1.5] }]],
    ['a supplied goalId', [{ recipientIds: [1], goalId: 10 }]],
    ['a supplied goalIds list', [{ recipientIds: [1], goalIds: [10] }]],
    ['one bad objective among good ones', [{ recipientIds: [1] }, { recipientIds: [null] }]],
  ])('rejects %s', (_label, payload) => {
    expect(validateOtherEntityObjectives(payload)).toBe(false);
  });
});
