import {
  getCitationReferenceLabel,
  getCitationText,
  getMonitoringReferences,
} from './activityReportObjectiveCitations';
import type { CitationReferenceSerializable } from './types/activityReportObjectiveCitations';

describe('activityReportObjectiveCitations helpers', () => {
  it('trims citation text', () => {
    const citation: CitationReferenceSerializable = { citation: ' 1302.12(k) ' };
    expect(getCitationText(citation)).toBe('1302.12(k)');
  });

  it('drops whitespace-only monitoring references', () => {
    const citation: CitationReferenceSerializable = {
      citation: '1302.12(k)',
      acro: ' ',
      findingType: ' ',
      findingSource: ' ',
      standardId: 1,
    };

    expect(getMonitoringReferences(citation)).toEqual([]);
  });

  it('returns null when monitoring label would collapse to citation-only text', () => {
    const citation: CitationReferenceSerializable = {
      citation: ' 1302.12(k) ',
      acro: ' ',
      findingSource: ' ',
      standardId: 1,
    };

    expect(getCitationReferenceLabel(citation, 'acro')).toBeNull();
  });
});
