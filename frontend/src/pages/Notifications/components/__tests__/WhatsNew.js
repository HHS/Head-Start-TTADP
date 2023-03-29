import { formatWhatsNew } from '../WhatsNew';
import { mockRSSData, mockWindowProperty } from '../../../../testHelpers';

describe('formatWhatsNew', () => {
  describe('with localStorage', () => {
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => JSON.stringify(['1', '2'])),
    });

    it('returns the formatted articles', () => {
      const articles = formatWhatsNew(mockRSSData());
      expect(articles).toMatchSnapshot();
    });
  });

  describe('without localStorage', () => {
    mockWindowProperty('localStorage', {
      getItem: jest.fn(() => null),
    });

    it('returns the formatted articles', () => {
      const articles = formatWhatsNew(mockRSSData());
      expect(articles).toMatchSnapshot();
    });
  });
});
