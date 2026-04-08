import { Op } from 'sequelize';
import {
  parseSelectedCitationIds,
  selectedCitationIdsScope,
} from './index';

describe('parseSelectedCitationIds', () => {
  it('returns empty array for undefined', () => {
    expect(parseSelectedCitationIds(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseSelectedCitationIds('')).toEqual([]);
  });

  it('parses a single valid composite key', () => {
    expect(parseSelectedCitationIds('101-1001')).toEqual([
      { citationId: 101, recipientId: 1001 },
    ]);
  });

  it('parses multiple comma-separated keys', () => {
    expect(parseSelectedCitationIds('101-1001,102-1002')).toEqual([
      { citationId: 101, recipientId: 1001 },
      { citationId: 102, recipientId: 1002 },
    ]);
  });

  it('parses an array of strings', () => {
    expect(parseSelectedCitationIds(['101-1001', '102-1002'])).toEqual([
      { citationId: 101, recipientId: 1001 },
      { citationId: 102, recipientId: 1002 },
    ]);
  });

  it('parses an array with comma-separated values inside each element', () => {
    expect(parseSelectedCitationIds(['101-1001,102-1002', '103-1003'])).toEqual([
      { citationId: 101, recipientId: 1001 },
      { citationId: 102, recipientId: 1002 },
      { citationId: 103, recipientId: 1003 },
    ]);
  });

  it('deduplicates repeated pairs', () => {
    expect(parseSelectedCitationIds('101-1001,101-1001')).toEqual([
      { citationId: 101, recipientId: 1001 },
    ]);
  });

  it('ignores entries with no dash', () => {
    expect(parseSelectedCitationIds('noDash,101-1001')).toEqual([
      { citationId: 101, recipientId: 1001 },
    ]);
  });

  it('ignores entries where citationId is 0', () => {
    expect(parseSelectedCitationIds('0-1001')).toEqual([]);
  });

  it('ignores entries where recipientId is 0', () => {
    expect(parseSelectedCitationIds('101-0')).toEqual([]);
  });

  it('ignores entries where citationId is non-numeric', () => {
    expect(parseSelectedCitationIds('abc-1001')).toEqual([]);
  });

  it('ignores entries where recipientId is non-numeric', () => {
    expect(parseSelectedCitationIds('101-abc')).toEqual([]);
  });

  it('ignores negative values', () => {
    expect(parseSelectedCitationIds('-1-1001')).toEqual([]);
    expect(parseSelectedCitationIds('101--1')).toEqual([]);
  });

  it('trims whitespace around each key', () => {
    expect(parseSelectedCitationIds(' 101-1001 , 102-1002 ')).toEqual([
      { citationId: 101, recipientId: 1001 },
      { citationId: 102, recipientId: 1002 },
    ]);
  });
});

describe('selectedCitationIdsScope', () => {
  it('returns empty object for empty pairs', () => {
    expect(selectedCitationIdsScope([])).toEqual({});
  });

  it('returns Op.in where clause for a single pair', () => {
    expect(selectedCitationIdsScope([{ citationId: 101 }])).toEqual({
      id: { [Op.in]: [101] },
    });
  });

  it('deduplicates citationIds', () => {
    expect(
      selectedCitationIdsScope([
        { citationId: 101 },
        { citationId: 101 },
        { citationId: 102 },
      ]),
    ).toEqual({
      id: { [Op.in]: [101, 102] },
    });
  });
});
