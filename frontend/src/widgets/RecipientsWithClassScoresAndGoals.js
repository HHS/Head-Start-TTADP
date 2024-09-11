import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE } from '../Constants';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useWidgetPaging from '../hooks/useWidgetPaging';

function RecipientsWithClassScoresAndGoalsWidget({
  data,
  loading,
  resetPagination,
  setResetPagination,
}) {
  const defaultSortConfig = {
    sortBy: '1',
    direction: 'desc',
    activePage: 1,
  };

  const [numberOfRecipientsPerPage, setNumberOfRecipientsPerPage] = useState([]);
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
    RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE,
    numberOfRecipientsPerPage,
    setNumberOfRecipientsPerPage,
    resetPagination,
    setResetPagination,
    loading,
    checkBoxes,
    'RecipientsWithOhsStandardFeiGoal',
    setRecipientsPerPage,
    ['Recipient', 'Goal_number', 'Goal_status', 'Root_cause'],
    ['Goal_created_on'],
    'recipientsWithOhsStandardFeiGoal.csv',
  );

  useEffect(() => {
    try {
      // Set local data.
      setLocalLoading(true);
      const recipientToUse = data.RecipientsWithOhsStandardFeiGoal || [];
      setNumberOfRecipientsPerPage(recipientToUse);
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
    <>
      <WidgetContainer
        title="Recipients CLASS&#174;"
        subtitle2={getSubtitleWithPct()}
        loading={loading || localLoading}
        loadingLabel="Recipients with OHS standard FEI goal loading"
        showPagingBottom
        currentPage={activePage}
        totalCount={recipientCount}
        offset={offset}
        perPage={RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE}
        handlePageChange={handlePageChange}
        enableCheckboxes
        exportRows={exportRows}
        titleDrawerText="OHS standard CLASS&#174; goals"
        titleDrawerTitle="OHS standard FEI goal"
        titleDrawerCssClass="ttahub-fei-root-causes"
        subtitleDrawerLinkText="How are thresholds met?"
        subtitleDrawerTitle="CLASS&#174; review thresholds"
        subtitleDrawerCssClass="ttahub-fei-root-causes"
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
          hideFirstColumnBorder
        />
      </WidgetContainer>
    </>
  );
}

RecipientsWithClassScoresAndGoalsWidget.propTypes = {
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
  loading: PropTypes.bool.isRequired,
};

RecipientsWithClassScoresAndGoalsWidget.defaultProps = {
  data: { headers: [], RecipientsWithOhsStandardFeiGoal: [] },
  resetPagination: false,
  setResetPagination: () => {},
};

export default RecipientsWithClassScoresAndGoalsWidget;
