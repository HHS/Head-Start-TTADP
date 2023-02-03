import {
  hasHookMetadata,
  hasHookMetadataKey,
  getSingularOrPluralData,
} from '../hookMetadata';

describe('hookMetadata', () => {
  it('hasHookMetadata pass', () => {
    expect(hasHookMetadata({ hookMetadata: {} }))
      .toStrictEqual(true);
  });
  it('hasHookMetadata fail', () => {
    expect(hasHookMetadata({ }))
      .toStrictEqual(false);
  });
  it('hasHookMetadataKey pass', () => {
    expect(hasHookMetadataKey({ hookMetadata: { objectiveId: 1 } }, 'objectiveId'))
      .toStrictEqual(true);
  });
  it('hasHookMetadataKey fail', () => {
    expect(hasHookMetadataKey({ hookMetadata: {} }, 'objectiveId'))
      .toStrictEqual(false);
  });
  it('getSingularOrPluralData singular', () => {
    expect(getSingularOrPluralData({ hookMetadata: { objectiveId: 1 } }, 'objectiveId', 'objectiveIds'))
      .toStrictEqual([1]);
  });
  it('getSingularOrPluralData plural', () => {
    expect(getSingularOrPluralData({ hookMetadata: { objectiveIds: [1] } }, 'objectiveId', 'objectiveIds'))
      .toStrictEqual([1]);
  });
  it('getSingularOrPluralData none', () => {
    expect(getSingularOrPluralData({ hookMetadata: {} }, 'objectiveId', 'objectiveIds'))
      .toStrictEqual(undefined);
  });
  it('getSingularOrPluralData unexpected', () => {
    expect(getSingularOrPluralData({ hookMetadata: { objectiveId: {} } }, 'objectiveId', 'objectiveIds'))
      .toStrictEqual(undefined);
  });
});
