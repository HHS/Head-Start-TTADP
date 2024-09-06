import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RECIPIENTS_WITH_NO_TTA_PER_PAGE } from '../Constants';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useWidgetPaging from '../hooks/useWidgetPaging';

function RecipientsWithNoTtaWidget({
  data,
  loading,
  resetPagination,
  setResetPagination,
  perPageNumber,
}) {
  const defaultSortConfig = {
    sortBy: '1',
    direction: 'desc',
    activePage: 1,
  };

  const [recipientsToUse, setRecipientsToUse] = useState([]);
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
    data.headers,
    'recipientsWithNoTta',
    defaultSortConfig,
    perPageNumber,
    recipientsToUse,
    setRecipientsToUse,
    resetPagination,
    setResetPagination,
    loading,
    checkBoxes,
    'RecipientsWithNoTta',
    setRecipientsPerPage,
    ['Recipient'],
    ['Date_of_Last_TTA'],
  );

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      const recipientToUse = data.RecipientsWithNoTta || [];
      setRecipientsToUse(recipientToUse);
      setRecipientCount(recipientToUse.length);
    } finally {
      setLocalLoading(false);
    }
  }, [data]);

  const getSubtitleWithPct = () => {
    const totalRecipients = 159;
    return `${recipientCount} of ${totalRecipients} (${((recipientCount / totalRecipients) * 100).toFixed(2)}%) recipients`;
  };

  return (
    <WidgetContainer
      title="Recipients with no TTA"
      subtitle="Recipients without Activity Reports or Training Reports for more than 90 days."
      subtitle2={getSubtitleWithPct()}
      loading={loading || localLoading}
      loadingLabel="Recipients with no TTA loading"
      showPagingBottom
      currentPage={activePage}
      totalCount={recipientCount}
      offset={offset}
      perPage={perPageNumber}
      handlePageChange={handlePageChange}
      enableCheckboxes
      exportRows={exportRows}
    >
      <HorizontalTableWidget
        headers={data.headers || []}
        data={recipientsPerPage || []}
        firstHeading="Recipient"
        enableSorting
        sortConfig={sortConfig}
        requestSort={requestSort}
        enableCheckboxes
        checkboxes={checkBoxes}
        setCheckboxes={setCheckBoxes}
        showTotalColumn={false}
      />
    </WidgetContainer>
  );
}

RecipientsWithNoTtaWidget.propTypes = {
  data: PropTypes.oneOfType([
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
  resetPagination: PropTypes.bool,
  setResetPagination: PropTypes.func,
  perPageNumber: PropTypes.number,
  loading: PropTypes.bool.isRequired,
};

RecipientsWithNoTtaWidget.defaultProps = {
  data: { headers: [], RecipientsWithNoTta: [] },
  resetPagination: false,
  setResetPagination: () => {},
  perPageNumber: RECIPIENTS_WITH_NO_TTA_PER_PAGE,
};

export default RecipientsWithNoTtaWidget;
