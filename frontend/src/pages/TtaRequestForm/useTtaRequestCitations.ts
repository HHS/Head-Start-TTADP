import moment from 'moment';
import { useCallback, useMemo } from 'react';
import { fetchCitationsByGrant } from '../../fetchers/citations';
import useFetch from '../../hooks/useFetch';
import { buildUniqueCitationOptions } from '../ActivityReport/Pages/components/GoalPicker';
import type { CitationOptionGroup } from './types';

interface RawCitation {
  citation: string;
}

interface CitationsResult {
  /** the request these citations answer, so a stale result is not read as the current one */
  key: string | null;
  citations: RawCitation[] | null;
}

// a stable reference, so useFetch's deep comparison does not refetch on every render
const NO_CITATIONS: RawCitation[] = [];
const NO_RESULT: CitationsResult = { key: null, citations: NO_CITATIONS };

interface UseTtaRequestCitations {
  /** citations grouped by finding type, ready for react-select */
  citationOptions: CitationOptionGroup[];
  /** the citation names behind those options, for the help drawer */
  citationNames: string[];
  /**
   * true until the citations for the current grants and goal have been read; it stays true
   * when they could not be read, since an error says nothing about whether any exist
   */
  loading: boolean;
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
  const requestKey = JSON.stringify([regionId, grantIds, isMonitoringGoal]);

  // only the monitoring goal takes citations, and they belong to a grant in a region
  const fetcher = useCallback(async (): Promise<CitationsResult> => {
    if (!isMonitoringGoal || !regionId || grantIds.length === 0) {
      return { key: requestKey, citations: NO_CITATIONS };
    }
    const citations = await fetchCitationsByGrant(
      regionId,
      grantIds,
      moment().format('YYYY-MM-DD')
    );
    return { key: requestKey, citations };
  }, [isMonitoringGoal, regionId, grantIds, requestKey]);

  const { data, loading: fetching } = useFetch(
    NO_RESULT,
    fetcher,
    [regionId, grantIds, isMonitoringGoal],
    'Unable to load citations.'
  );
  const citations = data?.citations;

  // useFetch only starts its request after the render that changed the inputs, so its own
  // flag is briefly false while the citations still belong to the previous goal or grants
  const loading = fetching || data?.key !== requestKey;

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

  return { citationOptions, citationNames, loading };
}
