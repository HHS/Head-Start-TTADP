import pickClosestLinkByTargetCenter from '../goalStatusReasonSankeyUtils';

describe('GoalStatusReasonSankey', () => {
  describe('pickClosestLinkByTargetCenter', () => {
    it('returns null when links are empty', () => {
      expect(pickClosestLinkByTargetCenter([], 100)).toBeNull();
    });

    it('returns null when target center is not numeric', () => {
      const links = [{ pts: { ty1: 100, ty2: 120 } }];
      expect(pickClosestLinkByTargetCenter(links, Number.NaN)).toBeNull();
    });

    it('picks the link whose target center is nearest to the status center', () => {
      const linkA = { shape: { id: 'a' }, pts: { ty1: 100, ty2: 120 } }; // center 110
      const linkB = { shape: { id: 'b' }, pts: { ty1: 220, ty2: 240 } }; // center 230
      const linkC = { shape: { id: 'c' }, pts: { ty1: 310, ty2: 350 } }; // center 330

      expect(pickClosestLinkByTargetCenter([linkA, linkB, linkC], 240)).toBe(linkB);
      expect(pickClosestLinkByTargetCenter([linkA, linkB, linkC], 320)).toBe(linkC);
    });
  });
});
