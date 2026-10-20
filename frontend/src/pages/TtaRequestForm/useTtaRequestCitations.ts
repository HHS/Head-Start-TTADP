import moment from 'moment';
import { useCallback, useMemo } from 'react';
import { fetchCitationsByGrant } from '../../fetchers/citations';
import useFetch from '../../hooks/useFetch';
import { buildUniqueCitationOptions } from '../ActivityReport/Pages/components/GoalPicker';
import type { CitationOptionGroup } from './types';

interface RawCitation {
  citation: string;
}

// a stable reference, so useFetch's deep comparison does not refetch on every render
const NO_CITATIONS: RawCitation[] = [];

interface UseTtaRequestCitations {
  /** citations grouped by finding type, ready for react-select */
  citationOptions: CitationOptionGroup[];
  /** the citation names behind those options, for the help drawer */
  citationNames: string[];
}

/**
 * The active citations for the selected grants, grouped by finding type.
 *
 * The citations endpoint takes a date and returns the citations whose review window covers
 * it, so today's date is what "active right now" means. It is formatted here rather than
 * handed over as a Date so an evening save cannot roll the query onto tomorrow.
 */
export default function useTtaRequestCitations(
  regionId: number | null,
  grantIds: number[],
  isMonitoringGoal: boolean
): UseTtaRequestCitations {
  // only the monitoring goal takes citations, and they belong to a grant in a region
  const fetcher = useCallback(async () => {
    if (!isMonitoringGoal || !regionId || grantIds.length === 0) {
      return NO_CITATIONS;
    }
    return fetchCitationsByGrant(regionId, grantIds, moment().format('YYYY-MM-DD'));
  }, [isMonitoringGoal, regionId, grantIds]);

  const { data: citations } = useFetch(
    NO_CITATIONS,
    fetcher,
    [regionId, grantIds, isMonitoringGoal],
    'Unable to load citations.'
  );

  const citationOptions: CitationOptionGroup[] = useMemo(
    () =>
      buildUniqueCitationOptions(citations || []).map((group) => ({
        ...group,
        options: group.options.map((option) => ({
          ...option,
          label: option.name,
          value: option.selectKey,
        })),
      })),
    [citations]
  );

  const citationNames = useMemo(
    () => (citations || []).map((citation) => citation.citation),
    [citations]
  );

  return { citationOptions, citationNames };
}
