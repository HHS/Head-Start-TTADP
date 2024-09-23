import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { DECIMAL_BASE } from '@ttahub/common';
import {
  Dropdown, Checkbox, Button,
} from '@trussworks/react-uswds';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import colors from '../colors';
import { RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE } from '../Constants';
import WidgetContainer from '../components/WidgetContainer';
import useWidgetPaging from '../hooks/useWidgetPaging';
import RecipientCard from '../pages/QADashboard/Components/RecipientCard';

function RecipientsWithClassScoresAndGoalsWidget({
  data,
}) {
  const [loading, setLoading] = useState(false);
  const [allRecipientsData, setAllRecipientsData] = useState([]);
  const [recipientsDataToDisplay, setRecipientsDataToDisplay] = useState([]);
  const [selectedRecipientCheckBoxes, setSelectedRecipientCheckBoxes] = useState({});
  const [allRecipientsChecked, setAllRecipientsChecked] = useState(false);
  const [resetPagination, setResetPagination] = useState(false);
  const [perPage, setPerPage] = useState(RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE);

  const defaultSort = {
    sortBy: 'Recipient',
    direction: 'asc',
    activePage: 1,
  };

  // Probably we WONT use the useWidgetPaging hook here.
  const {
    handlePageChange,
    exportRows,
    sortConfig,
    setSortConfig,
  } = useWidgetPaging(
    ['lastArStartDate', 'emotionalSupport', 'classroomOrganization', 'instructionalSupport', 'reportReceivedDate'],
    'recipientsWithClassScoresAndGoals',
    defaultSort,
    RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE,
    allRecipientsData,
    setAllRecipientsData,
    resetPagination,
    setResetPagination,
    loading,
    selectedRecipientCheckBoxes,
    'recipientsWithClassScoresAndGoals',
    setRecipientsDataToDisplay,
    [],
    [],
    'recipientsWithClassScoresAndGoals.csv',
  );

  const perPageChange = (e) => {
    const perPageValue = parseInt(e.target.value, DECIMAL_BASE);
    setSortConfig({
      ...sortConfig,
      activePage: 1,
      offset: 0,
    });

    // Use splice to get the new data to display.
    setRecipientsDataToDisplay(allRecipientsData.slice(0, perPageValue));
    setPerPage(perPageValue);
  };

  const setSortBy = () => {
    // Handle sort by, not sure how we will handle this yet.
  };

  const numberOfGrants = 70;
  const getSubtitleWithPct = () => {
    const totalRecipients = 159;
    return `${allRecipientsData.length} of ${totalRecipients} (${((allRecipientsData.length / totalRecipients) * 100).toFixed(2)}%) recipients (${numberOfGrants} grants)`;
  };

  const makeRecipientCheckboxes = (goalsArr, checked) => (
    goalsArr.reduce((obj, g) => ({ ...obj, [g.id]: checked }), {})
  );

  const selectAllRecipientsCheckboxSelect = (event) => {
    const { target: { checked = null } = {} } = event;
    // Preserve checked recipients on other pages.
    const thisPagesRecipientIds = allRecipientsData.map((g) => g.id);
    const preservedCheckboxes = Object.keys(selectedRecipientCheckBoxes).reduce((obj, key) => {
      if (!thisPagesRecipientIds.includes(parseInt(key, DECIMAL_BASE))) {
        return { ...obj, [key]: selectedRecipientCheckBoxes[key] };
      }
      return { ...obj };
    }, {});

    if (checked === true) {
      setSelectedRecipientCheckBoxes(
        {
          ...makeRecipientCheckboxes(allRecipientsData, true), ...preservedCheckboxes,
        },
      );
    } else {
      setSelectedRecipientCheckBoxes({
        ...makeRecipientCheckboxes(allRecipientsData, false), ...preservedCheckboxes,
      });
    }
  };

  useEffect(() => {
    try {
      // Set local data.
      setLoading(true);
      const recipientToUse = data.RecipientsWithOhsStandardFeiGoal || [];
      setAllRecipientsData(recipientToUse);
    } finally {
      setLoading(false);
    }
  }, [data.RecipientsWithOhsStandardFeiGoal]);

  useEffect(() => {
    const recipientIds = allRecipientsData.map((g) => g.id);
    const countOfCheckedOnThisPage = recipientIds.filter(
      (id) => selectedRecipientCheckBoxes[id],
    ).length;
    if (allRecipientsData.length === countOfCheckedOnThisPage) {
      setAllRecipientsChecked(true);
    } else {
      setAllRecipientsChecked(false);
    }
  }, [selectedRecipientCheckBoxes, allRecipientsData]);

  const handleRecipientCheckboxSelect = (event) => {
    const { target: { checked = null, value = null } = {} } = event;
    if (checked === true) {
      setSelectedRecipientCheckBoxes({ ...selectedRecipientCheckBoxes, [value]: true });
    } else {
      setSelectedRecipientCheckBoxes({ ...selectedRecipientCheckBoxes, [value]: false });
    }
  };

  const handleExportRows = () => {
    const selectedRecipientIds = Object.keys(
      selectedRecipientCheckBoxes,
    ).filter((key) => selectedRecipientCheckBoxes[key]);
    if (selectedRecipientIds.length > 0) {
      exportRows('selected');
    } else {
      exportRows('all');
    }
  };

  const selectedRecipientCheckBoxesCount = Object.keys(selectedRecipientCheckBoxes).filter(
    (key) => selectedRecipientCheckBoxes[key],
  ).length;
  return (
    <WidgetContainer
      title="Recipients with CLASS&reg; scores"
      subtitleDrawerTitle="CLASS&reg; review thresholds"
      subtitleDrawerLinkText="How are thresholds met?"
      subtitleDrawerTag="ttahub-fei-root-causes"
      subtitle2={getSubtitleWithPct()}
      loading={loading}
      loadingLabel="Recipients with CLASS&reg; scores and goals loading"
      showPagingBottom
      currentPage={sortConfig.activePage}
      totalCount={allRecipientsData.length}
      offset={sortConfig.offset}
      perPage={perPage}
      handlePageChange={handlePageChange}
      enableCheckboxes
      exportRows={exportRows}
      titleDrawerText="OHS standard CLASS&reg; goals"
      titleDrawerTitle="OHS standard FEI goal"
      titleDrawerTag="ttahub-fei-root-causes"
      className="padding-3"
      displayPaginationBoxOutline
      showHeaderBorder={false}
    >
      <div className="bg-white padding-">
        <div className="desktop:display-flex flex-justify smart-hub-border-base-lighter border-bottom">
          <div className="flex-align-center margin-bottom-3 display-flex">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">Sort by</label>
            <Dropdown
              onChange={setSortBy}
              value={`${sortConfig.sortBy}-${sortConfig.direction}`}
              className="margin-top-0"
              id="sortBy"
              name="sortBy"
              data-testid="sortGoalsBy"
            >
              <option value="name-asc">Recipient name (A-Z) </option>
              <option value="name-desc">Recipient name (Z-A) </option>
              <option value="reportReceived-asc">Report received (newest to oldest) </option>
              <option value="reportReceived-desc">Report received (oldest to newest) </option>
              <option value="LastArStartDate-asc">Last AR start date (newest to oldest) </option>
              <option value="LastArStartDate-desc">Last AR start date (oldest to newest) </option>
            </Dropdown>
          </div>
          <div className="flex-align-center margin-bottom-3 display-flex">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="perPage">Show</label>
            <Dropdown
              className="margin-top-0 margin-right-1 width-auto"
              id="perPage"
              name="perPage"
              data-testid="perPage"
              onChange={perPageChange}
              aria-label="Select recipients per page"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value={allRecipientsData.length}>all</option>
            </Dropdown>
          </div>
        </div>
        <div className="ttahub-recipients-with-ohs-standard-fei-goal---recipient-cards padding-top-3">
          <div className="display-flex flex-align-center margin-bottom-3 margin-left-3">
            <Checkbox
              label="Select all"
              id="select-all-recipients-checkboxes"
              aria-label="select all recipients"
              checked={allRecipientsChecked}
              onChange={selectAllRecipientsCheckboxSelect}
            />
            {selectedRecipientCheckBoxesCount > 0
            && (
              <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-left-2 margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
                <span>
                  {selectedRecipientCheckBoxesCount}
                  {' '}
                  selected
                  {' '}
                </span>
                <Button
                  className="smart-hub--select-tag__button"
                  unstyled
                  aria-label="deselect all goals"
                  onClick={() => {
                    selectAllRecipientsCheckboxSelect({ target: { checked: false } });
                  }}
                >
                  <FontAwesomeIcon className="margin-left-1 margin-top-2px filter-pills-cursor" color={colors.ttahubMediumBlue} icon={faTimesCircle} />
                </Button>
              </span>
            )}
            {
                selectedRecipientCheckBoxesCount > 0 && (
                  <Button
                    unstyled
                    onClick={handleExportRows}
                    className="margin-left-3"
                  >
                    Export selected
                  </Button>
                )
              }
          </div>
          {recipientsDataToDisplay.map((r, index) => (
            <RecipientCard
              key={uuidv4()}
              recipient={r}
              zIndex={allRecipientsData.length - index}
              handleGoalCheckboxSelect={handleRecipientCheckboxSelect}
              isChecked={selectedRecipientCheckBoxes[r.id] || false}
            />
          ))}
        </div>
      </div>
    </WidgetContainer>
  );
}

RecipientsWithClassScoresAndGoalsWidget.propTypes = {
  data: PropTypes.shape({
    headers: PropTypes.arrayOf(PropTypes.string),
    RecipientsWithOhsStandardFeiGoal: PropTypes.oneOfType([
      PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        lastArStartDate: PropTypes.string,
        lastArEndDate: PropTypes.string,
        emotionalSupport: PropTypes.number,
        classroomOrganization: PropTypes.number,
        instructionalSupport: PropTypes.number,
        reportReceivedDate: PropTypes.string,
        goals: PropTypes.arrayOf(PropTypes.shape({
          goalNumber: PropTypes.string,
          status: PropTypes.string,
          creator: PropTypes.string,
          collaborator: PropTypes.string,
        })),
      }),
      PropTypes.shape({}),
    ]),
  }),
};

RecipientsWithClassScoresAndGoalsWidget.defaultProps = {
  data: { headers: [], RecipientsWithOhsStandardFeiGoal: [] },
};

export default RecipientsWithClassScoresAndGoalsWidget;
