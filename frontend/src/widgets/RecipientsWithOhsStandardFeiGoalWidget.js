import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RECIPIENTS_WITH_NO_TTA_PER_PAGE } from '../Constants';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useWidgetPaging from '../hooks/useWidgetPaging';

function RecipientsWithOhsStandardFeiGoalWidget({
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
    'recipientsWithOhsStandardFeiGoal',
    defaultSortConfig,
    perPageNumber,
    recipientsToUse,
    setRecipientsToUse,
    resetPagination,
    setResetPagination,
    loading,
    checkBoxes,
    'RecipientsWithOhsStandardFeiGoal',
    setRecipientsPerPage,
    ['Recipient', 'Goal_number', 'Goal_status', 'Root_cause'],
    ['Goal_created_on'],
  );

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      const recipientToUse = data.RecipientsWithOhsStandardFeiGoal || [];
      setRecipientsToUse(recipientToUse);
      setRecipientCount(recipientToUse.length);
    } finally {
      setLocalLoading(false);
    }
  }, [data]);

  const numberOfGrants = 70;
  const getSubtitleWithPct = () => {
    const totalRecipients = 159;
    return `${recipientCount} of ${totalRecipients} (${((recipientCount / totalRecipients) * 100).toFixed(2)}%) recipients (${numberOfGrants} grants)`;
  };

  return (
    <WidgetContainer
      title="Recipients with OHS standard FEI goal"
      subtitle="Root cause were identified through self-reported data."
      subtitle2={getSubtitleWithPct()}
      loading={loading || localLoading}
      loadingLabel="Recipients with OHS standard FEI goal loading"
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

RecipientsWithOhsStandardFeiGoalWidget.propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.shape({
      headers: PropTypes.arrayOf(PropTypes.string),
      RecipientsWithOhsStandardFeiGoal: PropTypes.arrayOf(
        PropTypes.shape({
          recipient: PropTypes.string,
          goalCreatedOn: PropTypes.date,
          goalNumber: PropTypes.string,
          goalStatus: PropTypes.string,
          rootCause: PropTypes.string,
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

RecipientsWithOhsStandardFeiGoalWidget.defaultProps = {
  data: { headers: [], RecipientsWithOhsStandardFeiGoal: [] },
  resetPagination: false,
  setResetPagination: () => {},
  perPageNumber: RECIPIENTS_WITH_NO_TTA_PER_PAGE,
};

export default RecipientsWithOhsStandardFeiGoalWidget;
