import { parseCheckboxEvent } from '../Constants';

describe('Constants', () => {
  describe('parseCheckboxEvent', () => {
    it('returns checked and value from event', () => {
      const event = {
        target: {
          checked: true,
          value: 'shoes',
        },
      };
      expect(parseCheckboxEvent(event)).toEqual({
        checked: true,
        value: 'shoes',
      });
    });

    it('returns null checked and value from event', () => {
      const event = {
        target: {},
      };
      expect(parseCheckboxEvent(event)).toEqual({
        checked: null,
        value: null,
      });
    });
  });
});
