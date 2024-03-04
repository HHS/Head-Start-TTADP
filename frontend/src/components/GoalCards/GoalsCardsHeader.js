import React, { useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  Checkbox, Button, Dropdown, Alert,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Link, useHistory } from 'react-router-dom';
import UserContext from '../../UserContext';
import { canEditOrCreateGoals } from '../../permissions';
import colors from '../../colors';
import SelectPagination from '../SelectPagination';
import { similarity } from '../../fetchers/goals';

export default function GoalCardsHeader({
  title,
  count,
  activePage,
  offset,
  perPage,
  handlePageChange,
  hidePagination,
  recipientId,
  regionId,
  hasActiveGrants,
  sortConfig,
  requestSort,
  numberOfSelectedGoals,
  allGoalsChecked,
  selectAllGoalCheckboxSelect,
  selectAllGoals,
  selectedGoalIds,
  perPageChange,
  pageGoalIds,
  showRttapaValidation,
  draftSelectedRttapa,
  canMergeGoals,
  shouldDisplayMergeSuccess,
  dismissMergeSuccess,
}) {
  const [goalMergeGroups, setGoalMergeGroups] = useState([]);
  const history = useHistory();
  const { user } = useContext(UserContext);
  const hasButtonPermissions = canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE));

  useEffect(() => {
    async function getSimilarGoals() {
      const data = await similarity(regionId, recipientId);
      /*
      * expecting a response in the below format
      * @returns {
      *  goals: [{
      *    name: string,
      *    source: string,
      *    status: string,
      *    responsesForComparison: string,
      *    ids: number[],
      *  }],
      *  ids: number[]
      * }[]
      */

      setGoalMergeGroups(data.filter((g) => g.goals.length > 1));
    }

    if (canMergeGoals) {
      getSimilarGoals();
    }
  }, [canMergeGoals, recipientId, regionId]);

  const showAddNewButton = hasActiveGrants && hasButtonPermissions;
  const onPrint = () => {
    history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/rttapa/print${window.location.search}`, {
      sortConfig, selectedGoalIds: !selectedGoalIds.length ? pageGoalIds : selectedGoalIds,
    });
  };

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    requestSort(sortBy, direction);
  };

  const mergedGoals = (() => {
    if (history.location && history.location.state) {
      return history.location.state.mergedGoals;
    }

    return null;
  })();

  return (
    <div className="padding-x-3 position-relative">
      <div className="desktop:display-flex flex-1 desktop:padding-top-0 padding-top-2 bg-white">
        <h2 className="font-body-lg margin-left-2 margin-right-1 margin-y-3">{title}</h2>
        { showAddNewButton ? (
          <span className="smart-hub--table-controls desktop:margin-x-2 desktop:margin-y-0 margin-2 display-flex flex-row flex-align-center">
            <Link
              to={`/recipient-tta-records/${recipientId}/region/${regionId}/goals/new`}
              className="display-flex flex-justify usa-button"
            >
              <FontAwesomeIcon
                color="white"
                icon={faPlus}
              />
              <span className="margin-x-1">Add new goals</span>
            </Link>
          </span>
        ) : null }
      </div>
      <div className="desktop:display-flex flex-justify bg-white">
        <div className="desktop:display-flex flex-align-center">
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
            <option value="createdOn-desc">creation date (newest to oldest) </option>
            <option value="createdOn-asc">creation date (oldest to newest) </option>
            <option value="goalStatus-asc">goal status (drafts first)</option>
            <option value="goalStatus-desc">goal status (closed first) </option>
          </Dropdown>
        </div>
        {!hidePagination && (
        <div className="smart-hub--table-nav">
          <SelectPagination
            title="Goals"
            offset={offset}
            perPage={perPage}
            activePage={activePage}
            count={count}
            handlePageChange={handlePageChange}
            perPageChange={perPageChange}
          />
        </div>
        )}
      </div>
      {(canMergeGoals && goalMergeGroups.length > 0) && (
      <div className="usa-alert usa-alert--info" data-testid="alert">
        <div className="usa-alert__body">
          <div className="usa-alert__text">
            <p className="usa-prose margin-top-0">We found groups of similar goals that might be duplicates. To view and manage these goals, select a goal group:</p>
            <ul className="usa-list">
              {goalMergeGroups.map((group) => (
                <li key={`mergeGroup${group.id}`}>
                  <Link
                    to={`/recipient-tta-records/${recipientId}/region/${regionId}/goals/merge/${group.id}`}
                  >
                    Review
                    {' '}
                    {group.goals.length}
                    {' '}
                    similar goals
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      )}
      <hr className="border-1px border-base-lighter  bg-base-lighter margin-y-3" />
      <div className="margin-left-3 display-flex flex-row flex-align-center position-sticky top-0 bg-white" style={{ zIndex: 2 }}>
        <Checkbox
          label="Select all"
          id="select-all-goal-checkboxes"
          aria-label="deselect all goals"
          checked={allGoalsChecked}
          onChange={selectAllGoalCheckboxSelect}
        />
        {numberOfSelectedGoals > 0
            && (
              <span className="filter-pill-container smart-hub-border-blue-primary border-2px margin-left-2 margin-right-1 radius-pill padding-right-1 padding-left-2 padding-y-05">
                <span>
                  {numberOfSelectedGoals}
                  {' '}
                  selected
                  {' '}
                </span>
                <Button
                  className="smart-hub--select-tag__button"
                  unstyled
                  aria-label="deselect all goals"
                  onClick={() => {
                    selectAllGoalCheckboxSelect({ target: { checked: false } });
                  }}
                >
                  <FontAwesomeIcon className="margin-left-1 margin-top-2px filter-pills-cursor" color={colors.ttahubMediumBlue} icon={faTimesCircle} />
                </Button>
              </span>
            )}
        <Button
          unstyled
          className="display-flex flex-align-center margin-left-3 margin-y-0"
          onClick={onPrint}
        >
          {`Preview and print ${selectedGoalIds.length > 0 ? 'selected' : ''}`}
        </Button>
      </div>
      <div>
        {showRttapaValidation && (
          <Alert type="error" className="margin-top-3">
            <div>
              { draftSelectedRttapa.length ? (
                <p className="usa-prose margin-top-0">
                  <strong>{draftSelectedRttapa.map((g) => (`G-${g}`)).join(', ')}</strong>
                  {' '}
                  {draftSelectedRttapa.length === 1 ? 'is a' : 'are'}
                  {' '}
                  draft
                  {' '}
                  {draftSelectedRttapa.length === 1 ? 'goal' : 'goals'}
                  , and draft goals can&apos;t be added to an RTTAPA. Deselect any draft goals.
                </p>
              ) : null}
            </div>
          </Alert>
        )}
        {
          !showRttapaValidation && allGoalsChecked && (numberOfSelectedGoals !== count)
            ? (
              <Alert className="margin-top-3" type="info" slim>
                {`All ${numberOfSelectedGoals} goals on this page are selected.`}
                <button
                  type="button"
                  className="usa-button usa-button--unstyled margin-left-1"
                  onClick={selectAllGoals}
                >
                  {`Select all ${count} goals`}
                </button>
              </Alert>
            )
            : null
            }
        {
          (shouldDisplayMergeSuccess && mergedGoals)
            ? (
              <Alert className="margin-top-3" type="success">
                Goal
                {mergedGoals.length === 1 ? ' ' : 's '}
                {' '}
                {mergedGoals.map((g) => (`G-${g}`)).join(', ')}
                {' '}
                {mergedGoals.length === 1 ? 'has' : 'have'}
                {' '}
                been merged.
                <button
                  type="button"
                  className="usa-button usa-button--unstyled margin-left-1"
                  onClick={() => dismissMergeSuccess()}
                >
                  Reset goal sort order
                </button>
              </Alert>
            )
            : null
            }
      </div>
    </div>
  );
}

GoalCardsHeader.propTypes = {
  title: PropTypes.string.isRequired,
  hidePagination: PropTypes.bool,
  count: PropTypes.number,
  activePage: PropTypes.number,
  offset: PropTypes.number,
  perPage: PropTypes.number,
  handlePageChange: PropTypes.func,
  regionId: PropTypes.string.isRequired,
  recipientId: PropTypes.string.isRequired,
  hasActiveGrants: PropTypes.bool.isRequired,
  requestSort: PropTypes.func.isRequired,
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string,
    direction: PropTypes.string,
    activePage: PropTypes.number,
    offset: PropTypes.number,
  }).isRequired,
  selectAllGoalCheckboxSelect: PropTypes.func,
  allGoalsChecked: PropTypes.bool,
  numberOfSelectedGoals: PropTypes.number,
  selectAllGoals: PropTypes.func,
  selectedGoalIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  perPageChange: PropTypes.func.isRequired,
  pageGoalIds: PropTypes.oneOfType(
    [PropTypes.arrayOf(PropTypes.number), PropTypes.number],
  ).isRequired,
  showRttapaValidation: PropTypes.bool.isRequired,
  draftSelectedRttapa: PropTypes.arrayOf(PropTypes.number).isRequired,
  canMergeGoals: PropTypes.bool.isRequired,
  shouldDisplayMergeSuccess: PropTypes.bool,
  dismissMergeSuccess: PropTypes.func.isRequired,
};

GoalCardsHeader.defaultProps = {
  hidePagination: false,
  allGoalsChecked: false,
  count: 0,
  activePage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: () => { },
  selectAllGoalCheckboxSelect: () => { },
  selectAllGoals: () => { },
  numberOfSelectedGoals: 0,
  shouldDisplayMergeSuccess: false,
};
