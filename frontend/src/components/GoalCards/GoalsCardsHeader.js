import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Button, Dropdown } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import Pagination from 'react-js-pagination';
import { Link, useHistory } from 'react-router-dom';
import UserContext from '../../UserContext';
import { canEditOrCreateGoals } from '../../permissions';
import { DECIMAL_BASE } from '../../Constants';
import colors from '../../colors';

export function renderTotal(offset, perPage, activePage, count) {
  const from = offset >= count ? 0 : offset + 1;
  const offsetTo = perPage * activePage;
  let to;
  if (offsetTo > count) {
    to = count;
  } else {
    to = offsetTo;
  }
  return `${from}-${to} of ${count}`;
}

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
}) {
  const history = useHistory();
  const { user } = useContext(UserContext);
  const hasButtonPermissions = canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE));

  const showAddNewButton = hasActiveGrants && hasButtonPermissions;

  const onPrint = () => {
    history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/goals-objectives/print${window.location.search}`, {
      sortConfig,
    });
  };

  const setSortBy = (e) => requestSort(e.target.value);

  return (
    <div className="padding-x-3">
      <div className="desktop:display-flex flex-1 desktop:padding-top-0 padding-top-2">
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
        <Button
          className="display-flex flex-align-center usa-button usa-button--unstyled margin-x-3 margin-y-3"
          onClick={onPrint}
        >
          Preview and print selected
        </Button>
      </div>
      <div className="desktop:display-flex flex-justify ">
        <div className="desktop:display-flex flex-align-center">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">Sort by</label>
          <Dropdown onChange={setSortBy} value={sortConfig.sortBy} className="margin-top-0" id="sortBy" name="sortBy">
            <option value="goalStatus">Goal status</option>
            <option value="createdOn">Created on</option>
          </Dropdown>
        </div>
        {!hidePagination && (
        <div className="smart-hub--table-nav">
          <span aria-label="Pagination for goals">
            <span
              className="smart-hub--total-count display-flex flex-align-center height-full margin-2 desktop:margin-0 padding-right-1"
              aria-label={`Page ${activePage}, displaying goals ${renderTotal(
                offset,
                perPage,
                activePage,
                count,
              )}`}
            >
              <span>{renderTotal(offset, perPage, activePage, count)}</span>
              <Pagination
                innerClass="pagination desktop:margin-x-0 margin-top-0 margin-x-2"
                hideFirstLastPages
                prevPageText="<Prev"
                nextPageText="Next>"
                activePage={activePage}
                itemsCountPerPage={perPage}
                totalItemsCount={count}
                pageRangeDisplayed={4}
                onChange={handlePageChange}
                linkClassPrev="smart-hub--link-prev"
                linkClassNext="smart-hub--link-next"
                tabIndex={0}
              />
            </span>
          </span>
        </div>
        )}

      </div>
      <hr className="border-1px border-base-lighter  bg-base-lighter margin-y-3" />
      <div className="margin-left-3 display-flex flex-row flex-align-center">
        <Checkbox
          label="Select all"
          id="select-all-goal-checkboxes"
          aria-label="deselect all goals"
          isChecked={allGoalsChecked}
          onClick={selectAllGoalCheckboxSelect}
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
  numberOfSelectedGoals: 0,
};
