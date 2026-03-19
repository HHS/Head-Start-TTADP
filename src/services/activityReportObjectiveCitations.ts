import {
  CitationReferenceEntry,
  CitationReferenceLabel,
  CitationReferencePayload,
  CitationReferenceSerializable,
  CitationReferenceTypeField,
} from './types/activityReportObjectiveCitations';

function isCitationReferenceEntry(
  reference: CitationReferenceEntry | null | undefined,
): reference is CitationReferenceEntry {
  return !!reference
    && (reference.acro === undefined || typeof reference.acro === 'string')
    && (reference.findingType === undefined || typeof reference.findingType === 'string')
    && (reference.findingSource === undefined || typeof reference.findingSource === 'string')
    && (reference.standardId === null || typeof reference.standardId === 'number');
}

function getFlattenedReference(
  citation: CitationReferencePayload,
): CitationReferenceEntry | null {
  const acro = typeof citation.acro === 'string' ? citation.acro : '';
  const findingType = typeof citation.findingType === 'string' ? citation.findingType : '';
  const findingSource = typeof citation.findingSource === 'string' ? citation.findingSource : '';
  const standardId = citation.standardId === null || typeof citation.standardId === 'number'
    ? citation.standardId ?? null
    : null;

  if (!acro && !findingType && !findingSource) {
    return null;
  }

  return {
    acro,
    findingType,
    findingSource,
    standardId,
  };
}

export function toPlainCitation(citation: CitationReferenceSerializable): CitationReferencePayload {
  if (typeof citation.toJSON === 'function') {
    return citation.toJSON();
  }

  return citation;
}

export function getCitationText(citation: CitationReferenceSerializable): string {
  const plainCitation = toPlainCitation(citation);
  return typeof plainCitation.citation === 'string' ? plainCitation.citation : '';
}

export function getMonitoringReferences(
  citation: CitationReferenceSerializable,
): CitationReferenceEntry[] {
  const plainCitation = toPlainCitation(citation);
  const flattenedReference = getFlattenedReference(plainCitation);
  return flattenedReference && isCitationReferenceEntry(flattenedReference)
    ? [flattenedReference]
    : [];
}

export function getCitationReferenceLabel(
  citation: CitationReferenceSerializable,
  typeField: CitationReferenceTypeField,
): CitationReferenceLabel | null {
  const [reference] = getMonitoringReferences(citation);
  const citationText = getCitationText(citation);

  if (!reference || !citationText) {
    return null;
  }

  const findingLabel = reference[typeField] || '';
  const findingSource = reference.findingSource || '';
  const standardId = reference.standardId ?? null;

  if (!findingLabel && !findingSource) {
    return null;
  }

  return {
    id: standardId,
    label: `${findingLabel} - ${citationText} - ${findingSource}`,
  };
}
