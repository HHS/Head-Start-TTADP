import React, { useEffect, useState, useMemo } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import { useHistory } from 'react-router';
import Container from '../../../../components/Container';
import Tabs from '../../../../components/Tabs';
import { getTtaByCitation, getTtaByReview } from '../../../../fetchers/monitoring';
import ReviewCards from './components/ReviewCards';
import CitationCards from './components/CitationCards';

const ALLOWED_PAGE_SLUGS = ['review', 'citation'];
const LINKS = [
  {
    key: 'View by review name',
    value: 'review',
  },
  {
    key: 'View by citation number',
    value: 'citation',
  },
];

export default function Monitoring({
  match,
}) {
  const { params: { currentPage, recipientId, regionId } } = match;

  const history = useHistory();
  const [byReview, setByReview] = useState([]);
  const [byCitation, setByCitation] = useState([]);

  const lookup = useMemo(() => ({
    review: {
      fetcher: getTtaByReview,
      setter: setByReview,
    },
    citation: {
      fetcher: getTtaByCitation,
      setter: setByCitation,
    },
  }), []);

  const linkPrefix = `recipient-tta-records/${recipientId}/region/${regionId}/monitoring`;

  useEffect(() => {
    if (!currentPage || !ALLOWED_PAGE_SLUGS.includes(currentPage)) {
      history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/monitoring/review`);
    }
  }, [currentPage, history, recipientId, regionId]);

  useEffect(() => {
    async function fetchMonitoringData(slug) {
      const data = await lookup[slug].fetcher(recipientId, regionId);
      lookup[slug].setter(data);
    }
    if (currentPage && ALLOWED_PAGE_SLUGS.includes(currentPage)) {
      fetchMonitoringData(currentPage);
    }
  }, [currentPage, lookup, recipientId, regionId]);

  return (
    <Container className="maxw-full position-relative" paddingX={0} paddingY={0} positionRelative>
      <div className="padding-x-3 position-relative">
        <div className="desktop:display-flex flex-1 desktop:padding-top-0 padding-top-2 bg-white">
          <h2>TTA provided against monitoring citations</h2>
        </div>
      </div>
      <Tabs tabs={LINKS} ariaLabel="Monitoring navigation" prefix={linkPrefix} />
      <div className="padding-x-3 padding-y-2">
        {currentPage === 'review' && <ReviewCards data={byReview} regionId={Number(regionId)} />}
        {currentPage === 'citation' && <CitationCards data={byCitation} regionId={Number(regionId)} />}
      </div>
    </Container>
  );
}

Monitoring.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};