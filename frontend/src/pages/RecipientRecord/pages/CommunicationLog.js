import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import WidgetContainer from '../../../components/WidgetContainer';
import HorizontalTableWidget from '../../../widgets/HorizontalTableWidget';

export default function CommunicationLog({ recipientName, regionId, recipientId }) {
  const activePage = 1;
  const topicCount = 0;
  const offset = 0;
  const perPageNumber = 10;
  const handlePageChange = () => {};
  const sortConfig = {};
  const requestSort = () => {};

  const TitleSlot = () => (
    <Link
      to={`/recipient-tta-records/${recipientId}/region/${regionId}/communication/new`}
      className="usa-button smart-hub--new-report-btn"
    >
      <span className="smart-hub--plus">+</span>
      <span className="smart-hub--new-report">Add communication</span>
    </Link>
  );

  return (
    <>
      <Helmet>
        <title>
          Communication Log
          {recipientName}
          {' '}
          Region
          {' '}
          {String(regionId)}
        </title>
      </Helmet>
      <WidgetContainer
        title="Communication log"
        loading={false}
        loadingLabel="Resource associated with topics loading"
        showPagingBottom
        showPagingTop
        currentPage={activePage}
        totalCount={topicCount}
        offset={offset}
        perPage={perPageNumber}
        handlePageChange={handlePageChange}
        titleSlot={<TitleSlot />}
      >
        <HorizontalTableWidget
          headers={[]}
          data={[]}
          firstHeading="Topic"
          enableSorting
          sortConfig={sortConfig}
          requestSort={requestSort}
        />
      </WidgetContainer>
    </>
  );
}

CommunicationLog.propTypes = {
  recipientName: PropTypes.string.isRequired,
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  regionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
