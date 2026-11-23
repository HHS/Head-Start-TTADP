import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY as LOCAL_STORAGE_ADDITIONAL_DATA_KEY,
  LOCAL_STORAGE_AR_DATA_KEY as LOCAL_STORAGE_DATA_KEY,
  LOCAL_STORAGE_AR_EDITABLE_KEY as LOCAL_STORAGE_EDITABLE_KEY,
} from '../Constants';
import { getReport } from '../fetchers/activityReports';

// The backend signs attachment URLs for 6 minutes (getSignedDownloadUrl in src/lib/s3.js).
// Refresh well inside that window, checking often enough to catch it.
export const SIGNED_URL_REFRESH_AFTER_MS = 4 * 60 * 1000;
export const SIGNED_URL_REFRESH_CHECK_MS = 60 * 1000;

export default function useReadOnlyReportFetch(match, user) {
  const history = useHistory();

  const [report, setReport] = useState({
    version: 'loading',
    reportId: 0,
    displayId: '',
    recipientType: 'Recipient',
    activityRecipients: [],
    targetPopulations: [],
    approvers: [],
    activityReportCollaborators: [],
    participants: [],
    numberOfParticipants: 0,
    reason: [],
    author: { fullName: '' },
    createdAt: '',
    approvedAt: '',
    recipientNextSteps: [],
    specialistNextSteps: [],
    goalsAndObjectives: [],
    objectivesWithoutGoals: [],
    context: '',
    additionalNotes: '',
    files: [],
    ECLKCResourcesUsed: [],
    nonECLKCResourcesUsed: [],
    topics: [],
    requester: '',
    virtualDeliveryType: '',
    duration: 0,
    endDate: '',
    startDate: '',
    creatorNotes: '',
    ttaType: ['Training'],
    language: [],
  });

  // cleanup local storage if the report has been submitted or approved
  useEffect(() => {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_DATA_KEY(report.id));
      window.localStorage.removeItem(LOCAL_STORAGE_ADDITIONAL_DATA_KEY(report.id));
      window.localStorage.removeItem(LOCAL_STORAGE_EDITABLE_KEY(report.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Local storage may not be available: ', e);
    }
  }, [report.id]);

  useEffect(() => {
    if (!parseInt(match.params.activityReportId, 10)) {
      history.push('/something-went-wrong/404');
      return undefined;
    }

    let cancelled = false;
    let lastFetchedAt = 0;

    async function fetchReport(isRefresh) {
      try {
        const data = await getReport(match.params.activityReportId);
        if (cancelled) return;
        lastFetchedAt = Date.now();
        // review and submit table
        setReport(data);
      } catch (err) {
        // A failed background refresh keeps the report the user is already reading.
        if (cancelled || isRefresh) return;
        history.push(`/something-went-wrong/${err.status}`);
      }
    }

    // Attachment links in the report are signed URLs that expire, so reload the report
    // (which signs fresh URLs) before they do. Only refresh while the page is visible.
    const refreshIfStale = () => {
      const isVisible = document.visibilityState === 'visible';
      if (isVisible && Date.now() - lastFetchedAt >= SIGNED_URL_REFRESH_AFTER_MS) {
        fetchReport(true);
      }
    };

    fetchReport(false);
    const interval = setInterval(refreshIfStale, SIGNED_URL_REFRESH_CHECK_MS);
    // Timers are throttled or paused in background tabs and during sleep, so also
    // check as soon as the user comes back to the page.
    document.addEventListener('visibilitychange', refreshIfStale);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [match.params.activityReportId, user, history]);

  return report;
}
