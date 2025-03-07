import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RECIPIENTS_WITH_NO_TTA_PER_PAGE } from '../Constants';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useWidgetPaging from '../hooks/useWidgetPaging';
import WidgetContainerSubtitle from '../components/WidgetContainer/WidgetContainerSubtitle';

const defaultSortConfig = {
  sortBy: 'Days_Since_Last_TTA',
  direction: 'desc',
  activePage: 1,
};

function RecipientsWithNoTtaWidget({
  data,
  loading,
  resetPagination,
  setResetPagination,
}) {
  const { pageData, widgetData } = data;
  const [allRecipientData, setAllRecipientData] = useState([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [recipientsPerPage, setRecipientsPerPage] = useState([]);
  const [checkBoxes, setCheckBoxes] = useState({});

  const {
    offset,
    activePage,
    handlePageChange,
    requestSort,
    exportRows,
    sortConfig,
  } = useWidgetPaging(
    pageData ? pageData.headers : [],
    'recipientsWithNoTta',
    defaultSortConfig,
    RECIPIENTS_WITH_NO_TTA_PER_PAGE,
    allRecipientData, // data to use.
    setAllRecipientData,
    resetPagination,
    setResetPagination,
    loading,
    checkBoxes,
    'RecipientsWithNoTta',
    setRecipientsPerPage,
    ['Recipient'],
    ['Date_of_Last_TTA'],
    'recipientsWithNoTta.csv',
  );

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      setAllRecipientData(pageData ? pageData.RecipientsWithNoTta : []); // TODO: Put this back.
      setRecipientCount(pageData ? pageData.RecipientsWithNoTta.length : 0);
    } finally {
      setLocalLoading(false);
    }
  }, [pageData, widgetData]);

  const getSubtitleWithPct = () => {
    const totalRecipients = widgetData ? widgetData.total : 0;
    const recipientsWithoutTTA = widgetData ? widgetData['recipients without tta'] : 0;
    const pct = widgetData ? widgetData['% recipients without tta'] : 0;
    return `${recipientsWithoutTTA} of ${totalRecipients} (${pct}%) recipients`;
  };

  const menuItems = [
    {
      label: 'Export selected rows',
      onClick: () => {
        exportRows('selected');
      },
    },
    {
      label: 'Export table',
      onClick: () => {
        exportRows('all');
      },
    },
  ];

  const subtitle = (
    <div className="margin-bottom-3">
      <WidgetContainerSubtitle>
        Recipients without Activity Reports or Training Reports for more than 90 days.
      </WidgetContainerSubtitle>
      <p className="usa-prose margin-x-0 margin-top-0 margin-bottom-1">
        <strong>{getSubtitleWithPct()}</strong>
      </p>
    </div>
  );

  return (
    <WidgetContainer
      title="Recipients with no TTA"
      subtitle={subtitle}
      loading={loading || localLoading}
      loadingLabel="Recipients with no TTA loading"
      showPagingBottom
      currentPage={activePage}
      totalCount={recipientCount}
      offset={offset}
      perPage={RECIPIENTS_WITH_NO_TTA_PER_PAGE}
      handlePageChange={handlePageChange}
      menuItems={menuItems}
      titleMargin={{ bottom: 1 }}
    >
      <HorizontalTableWidget
        headers={pageData ? pageData.headers : []}
        data={recipientsPerPage || []}
        firstHeading="Recipient"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
        enableCheckboxes
        checkboxes={checkBoxes}
        setCheckboxes={setCheckBoxes}
        showTotalColumn={false}
        hideFirstColumnBorder
        showDashForNullValue
      />
    </WidgetContainer>
  );
}

RecipientsWithNoTtaWidget.propTypes = {
  data: PropTypes.shape({
    pageData: PropTypes.oneOfType([
      PropTypes.shape({
        headers: PropTypes.arrayOf(PropTypes.string),
        RecipientsWithNoTta: PropTypes.arrayOf(
          PropTypes.shape({
            recipient: PropTypes.string,
            dateOfLastTta: PropTypes.date,
            daysSinceLastTta: PropTypes.number,
          }),
        ),
      }),
      PropTypes.shape({}),
    ]),
    widgetData: PropTypes.shape({
      'recipients without tta': PropTypes.number,
      total: PropTypes.number,
      '% recipients without tta': PropTypes.number,
    }),
  }),
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func,
  loading: PropTypes.bool.isRequired,
};

RecipientsWithNoTtaWidget.defaultProps = {
  data: { headers: [], RecipientsWithNoTta: [] },
  resetPagination: false,
  setResetPagination: () => {},
};

export default RecipientsWithNoTtaWidget;
