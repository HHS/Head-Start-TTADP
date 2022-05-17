import {
  getBrowserProps,
} from '../usePageVisibility';
import { mockDocumentProperty } from '../../testHelpers';

describe('usePageVisibility', () => {
  // jsdom handles testing our other case in this if statement
  // document.hidden => visibilitychange
  describe('getBrowserProps for IE', () => {
    mockDocumentProperty('msHidden', false);
    mockDocumentProperty('hidden', undefined);
    it('handles ie', async () => {
      const props = getBrowserProps();
      expect(props.visiblity).toBe('msvisibilitychange');
    });
  });

  describe('getBrowserProps for webkit', () => {
    mockDocumentProperty('webkitHidden', false);
    mockDocumentProperty('hidden', undefined);
    it('handles webkit', async () => {
      const props = getBrowserProps();
      expect(props.visiblity).toBe('webkitvisibilitychange');
    });
  });
});
