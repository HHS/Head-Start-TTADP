export default function formatMonitoringCitationName({ acro, citation, findingSource }) {
  const acroText = typeof acro === 'string' ? acro.trim() : '';
  const citationText = typeof citation === 'string' ? citation.trim() : '';
  const findingSourceText = typeof findingSource === 'string' ? findingSource.trim() : '';

  if (!citationText || (!acroText && !findingSourceText)) {
    return '';
  }

  return [acroText, citationText, findingSourceText].filter(Boolean).join(' - ');
}
