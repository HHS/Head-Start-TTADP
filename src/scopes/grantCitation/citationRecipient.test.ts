import { Op } from 'sequelize';
import { withCitationRecipient } from './citationRecipient';

describe('grantCitation/citationRecipient', () => {
  describe('withCitationRecipient', () => {
    it('converts a valid "citationId:recipientId" pair', () => {
      expect(withCitationRecipient(['123:456'])).toEqual({ [Op.or]: [{ citationId: 123, recipient_id: 456 }] });
    });

    it('converts multiple valid pairs', () => {
      expect(withCitationRecipient(['1:2', '3:4'])).toEqual({
        [Op.or]: [
          { citationId: 1, recipient_id: 2 },
          { citationId: 3, recipient_id: 4 },
        ],
      });
    });

    it('returns an empty object for non-numeric segments', () => {
      expect(withCitationRecipient(['abc:def'])).toEqual({ [Op.or]: [{}] });
    });

    it('returns an empty object for a malformed entry missing the colon', () => {
      expect(withCitationRecipient(['123'])).toEqual({ [Op.or]: [{}] });
    });

    it('returns an empty array for an empty input array', () => {
      expect(withCitationRecipient([])).toEqual({ [Op.or]: [] });
    });

    it('returns empty objects for invalid entries while preserving valid ones', () => {
      expect(withCitationRecipient(['1:2', 'bad:3', '5:6'])).toEqual({
        [Op.or]: [
          { citationId: 1, recipient_id: 2 },
          {},
          { citationId: 5, recipient_id: 6 },
        ],
      });
    });

    it('returns an empty object for float strings (non-integer)', () => {
      expect(withCitationRecipient(['1.5:2'])).toEqual({ [Op.or]: [{}] });
    });
  });
});
