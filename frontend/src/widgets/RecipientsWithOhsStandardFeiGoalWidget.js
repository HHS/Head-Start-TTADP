import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE } from '../Constants';
import HorizontalTableWidget from './HorizontalTableWidget';
import WidgetContainer from '../components/WidgetContainer';
import useWidgetPaging from '../hooks/useWidgetPaging';
import './RecipientsWithOhsStandardFeiGoalWidget.scss';

function RecipientsWithOhsStandardFeiGoalWidget({
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
        title="Recipients with"
        subtitle="Root causes were identified through self-reported data."
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
        titleDrawerText="OHS standard FEI goal"
        titleDrawerTitle="OHS standard FEI goal"
        titleDrawerTag="ttahub-ohs-standard-fei-goal"
        titleDrawerCss="smart-hub--recipients-with-ohs-standard-fei-goal--title-drawer"
        subtitleDrawerLinkText="Learn about root causes"
        subtitleDrawerTitle="FEI root cause"
        subtitleDrawerTag="ttahub-fei-root-causes"
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
  loading: PropTypes.bool.isRequired,
};

RecipientsWithOhsStandardFeiGoalWidget.defaultProps = {
  data: { headers: [], RecipientsWithOhsStandardFeiGoal: [] },
  resetPagination: false,
  setResetPagination: () => {},
};

export default RecipientsWithOhsStandardFeiGoalWidget;
