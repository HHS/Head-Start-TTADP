import { isOnlineMode } from '../NetworkContext';
import { mockNavigatorProperty } from '../testHelpers';

describe('isonlinemodetest', () => {
  describe('IE', () => {
    mockNavigatorProperty('online', 'YES');
    mockNavigatorProperty('userAgent', 'Trident');
    it('returns expected results', async () => {
      const results = isOnlineMode();
      expect(results).toBe(true);
    });
  });

  describe('other browsers', () => {
    mockNavigatorProperty('online', 'YES');
    mockNavigatorProperty('userAgent', 'Other browsers');
    it('returns expected results', async () => {
      const results = isOnlineMode();
      expect(results).toBe('YES');
    });
  });
});
