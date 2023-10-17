import {
  ReportDefinition,
  ReportType,
  ReportDefinitions,
  reportSyncers,
  reportIncludes,
  reportGets,
} from './definition';

const reportDefinitions = {
  type1: [
    {
      model: {},
      syncer: () => {},
      remapDef: 'remap1',
      type: 'type1',
    },
    {
      model: {},
      syncer: () => {},
      remapDef: 'remap2',
      type: 'type1',
    },
    {
      model: {},
      syncer: () => {},
      remapDef: 'remap3',
      type: 'type1',
    },
  ],
  type2: [
    {
      model: {},
      syncer: () => {},
      remapDef: 'remap4',
      type: 'type2',
    },
    {
      model: {},
      syncer: () => {},
      remapDef: 'remap5',
      type: 'type2',
    },
    {
      model: {},
      syncer: () => {},
      remapDef: 'remap6',
      type: 'type2',
    },
  ],
};

describe('reportSyncers', () => {
  it('should return an empty array if no report definitions exist for the given report type', () => {
    const result = reportSyncers('type3');
    expect(result).toEqual([]);
  });

  it('should return all syncers when no options are provided', () => {
    const result = reportSyncers('type1', { models: [], exclude: false });
    expect(result).toEqual([
      { syncer: expect.any(Function), remapDef: 'remap1', type: 'type1' },
      { syncer: expect.any(Function), remapDef: 'remap2', type: 'type1' },
    ]);
  });

  it('should return only syncers that match the specified models when include option is false', () => {
    const result = reportSyncers('type2', { models: ['model4'], exclude: true });
    expect(result).toEqual([
      { syncer: expect.any(Function), remapDef: 'remap6', type: 'type2' },
    ]);
  });

  it('should return only syncers that do not match the specified models when include option is true', () => {
    const result = reportSyncers('type1', { models: ['model2'], exclude: false });
    expect(result).toEqual([
      { syncer: expect.any(Function), remapDef: 'remap1', type: 'type1' },
    ]);
  });
});

describe('reportIncludes', () => {
  it('should return an empty array if no report definitions exist for the given report type', () => {
    const result = reportIncludes('type3');
    expect(result).toEqual([]);
  });

  it('should return all includes when no options are provided', () => {
    const result = reportIncludes('type1', { models: [], exclude: false });
    expect(result).toEqual([
      { model: expect.any(Object), include: undefined, type: 'type1' },
      { model: expect.any(Object), include: undefined, type: 'type1' },
      { model: expect.any(Object), include: undefined, type: 'type1' },
    ]);
  });

  it('should return only includes that match the specified models when include option is false', () => {
    const result = reportIncludes('type2', { models: ['model4'], exclude: true });
    expect(result).toEqual([
      { model: expect.any(Object), include: undefined, type: 'type2' },
    ]);
  });

  it('should return only includes that do not match the specified models when include option is true', () => {
    const result = reportIncludes('type1', { models: ['model2'], exclude: false });
    expect(result).toEqual([
      { model: expect.any(Object), include: undefined, type: 'type1' },
      { model: expect.any(Object), include: undefined, type: 'type1' },
    ]);
  });
});

describe('reportGets', () => {
  it('should return an empty array if no report definitions exist for the given report type', () => {
    const result = reportGets('type3');
    expect(result).toEqual([]);
  });

  it('should return all gets when no options are provided', () => {
    const result = reportGets('type1', { models: [], exclude: false });
    expect(result).toEqual([
      { get: expect.any(Function), remapDef: 'remap1', type: 'type1' },
      { get: expect.any(Function), remapDef: 'remap2', type: 'type1' },
    ]);
  });

  it('should return only gets that match the specified models when include option is false', () => {
    const result = reportGets('type2', { models: ['model4'], exclude: true });
    expect(result).toEqual([
      { get: expect.any(Function), remapDef: 'remap6', type: 'type2' },
    ]);
  });

  it('should return only gets that do not match the specified models when include option is true', () => {
    const result = reportGets('type1', { models: ['model2'], exclude: false });
    expect(result).toEqual([
      { get: expect.any(Function), remapDef: 'remap1', type: 'type1' },
    ]);
  });
});
