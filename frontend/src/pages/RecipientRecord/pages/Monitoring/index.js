import React, {
  useEffect, useState, useMemo, useContext,
} from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { useHistory } from 'react-router';
import Container from '../../../../components/Container';
import Tabs from '../../../../components/Tabs';
import { getTtaByCitation, getTtaByReview } from '../../../../fetchers/monitoring';
import ReviewCards from './components/ReviewCards';
import CitationCards from './components/CitationCards';
import { ROUTES } from '../../../../Constants';
import AppLoadingContext from '../../../../AppLoadingContext';

const MONITORING_PAGES = {
  REVIEW: 'review',
  CITATION: 'citation',
};

const ALLOWED_PAGE_SLUGS = [MONITORING_PAGES.REVIEW, MONITORING_PAGES.CITATION];
const LINKS = [
  {
    key: 'View by review name',
    value: MONITORING_PAGES.REVIEW,
  },
  {
    key: 'View by citation number',
    value: MONITORING_PAGES.CITATION,
  },
];

export default function Monitoring({
  match,
}) {
  const { params: { currentPage, recipientId, regionId } } = match;
  const { setAppLoadingText, setIsAppLoading } = useContext(AppLoadingContext);
  const history = useHistory();
  const [byReview, setByReview] = useState([]);
  const [byCitation, setByCitation] = useState([]);
  const [announcement, setAnnouncement] = useState('');

  const lookup = useMemo(() => ({
    [MONITORING_PAGES.REVIEW]: {
      fetcher: getTtaByReview,
      setter: setByReview,
    },
    [MONITORING_PAGES.CITATION]: {
      fetcher: getTtaByCitation,
      setter: setByCitation,
    },
  }), []);

  const linkPrefix = `recipient-tta-records/${recipientId}/region/${regionId}/monitoring`;

  useEffect(() => {
    if (!currentPage || !ALLOWED_PAGE_SLUGS.includes(currentPage)) {
      history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/monitoring/${MONITORING_PAGES.REVIEW}`);
    }
  }, [currentPage, history, recipientId, regionId]);

  useEffect(() => {
    setAppLoadingText('Loading monitoring data');
  }, [setAppLoadingText]);

  useDeepCompareEffect(() => {
    async function fetchMonitoringData(slug) {
      setIsAppLoading(true);
      setAnnouncement('Loading monitoring data');
      try {
        const data = await lookup[slug].fetcher(recipientId, regionId);
        lookup[slug].setter(data);
        setAnnouncement(`Monitoring data by ${currentPage} loaded.`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching monitoring data:', error);
        history.push(`${ROUTES.SOMETHING_WENT_WRONG}/${error.status}`);
      } finally {
        setIsAppLoading(false);
      }
    }

    if (currentPage && ALLOWED_PAGE_SLUGS.includes(currentPage)) {
      fetchMonitoringData(currentPage);
    }
  }, [currentPage, history, lookup, recipientId, regionId, setIsAppLoading]);

  return (
    <Container className="maxw-full position-relative" paddingX={0} paddingY={0} positionRelative>
      <div className="usa-sr-only" role="status">{announcement}</div>
      <div className="padding-x-3 position-relative">
        <div className="desktop:display-flex flex-1 desktop:padding-top-0 padding-top-2 bg-white">
          <h2>TTA provided against monitoring citations</h2>
        </div>
      </div>
      <Tabs tabs={LINKS} ariaLabel="Monitoring navigation" prefix={linkPrefix} />
      <div className="padding-x-3 padding-y-2">
        {currentPage === MONITORING_PAGES.REVIEW && (
          <ReviewCards data={byReview} regionId={Number(regionId)} />
        )}
        {currentPage === MONITORING_PAGES.CITATION && (
          <CitationCards data={byCitation} regionId={Number(regionId)} />
        )}
      </div>
    </Container>
  );
}

Monitoring.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};
