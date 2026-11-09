import db from '../models';
import { recipientsInRegion, regionIdFromRecipients } from './communicationLog';

const { Grant } = db;

describe('communication log region helpers', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('regionIdFromRecipients', () => {
    it('returns the region when every recipient has grants and all are in one region', async () => {
      const findAll = jest.spyOn(Grant, 'findAll').mockResolvedValue([
        { recipientId: 5, regionId: 3 },
        { recipientId: 5, regionId: 3 },
        { recipientId: 6, regionId: 3 },
      ]);
      expect(await regionIdFromRecipients([5, 5, 6])).toBe(3);
      expect(findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { recipientId: [5, 6] } })
      );
    });

    it('returns null when the grants span regions', async () => {
      jest.spyOn(Grant, 'findAll').mockResolvedValue([
        { recipientId: 5, regionId: 3 },
        { recipientId: 6, regionId: 4 },
      ]);
      expect(await regionIdFromRecipients([5, 6])).toBeNull();
    });

    it('returns null when any recipient has no grants', async () => {
      jest.spyOn(Grant, 'findAll').mockResolvedValue([{ recipientId: 5, regionId: 3 }]);
      expect(await regionIdFromRecipients([5, 6])).toBeNull();
    });

    it('returns null when no recipient has grants', async () => {
      jest.spyOn(Grant, 'findAll').mockResolvedValue([]);
      expect(await regionIdFromRecipients([5])).toBeNull();
    });

    it('returns null without querying when any recipient id is invalid', async () => {
      const findAll = jest.spyOn(Grant, 'findAll');
      expect(await regionIdFromRecipients([])).toBeNull();
      expect(await regionIdFromRecipients([0, -1, 1.5])).toBeNull();
      expect(await regionIdFromRecipients([5, 0])).toBeNull();
      expect(findAll).not.toHaveBeenCalled();
    });
  });

  describe('recipientsInRegion', () => {
    it('accepts recipients that all have a grant in the region', async () => {
      const findAll = jest
        .spyOn(Grant, 'findAll')
        .mockResolvedValue([{ recipientId: 5 }, { recipientId: 6 }]);
      expect(await recipientsInRegion([5, 6, 6], 2)).toBe(true);
      expect(findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { recipientId: [5, 6], regionId: 2 } })
      );
    });

    it('rejects a mixed list where one recipient has no grant in the region', async () => {
      jest.spyOn(Grant, 'findAll').mockResolvedValue([{ recipientId: 5 }]);
      expect(await recipientsInRegion([5, 6], 2)).toBe(false);
    });

    it('rejects invalid ids and empty region lists without querying', async () => {
      const findAll = jest.spyOn(Grant, 'findAll');
      expect(await recipientsInRegion([5, 0], 2)).toBe(false);
      expect(await recipientsInRegion([5], [])).toBe(false);
      expect(findAll).not.toHaveBeenCalled();
    });

    it('accepts an empty recipient list', async () => {
      const findAll = jest.spyOn(Grant, 'findAll');
      expect(await recipientsInRegion([], 2)).toBe(true);
      expect(findAll).not.toHaveBeenCalled();
    });
  });
});
