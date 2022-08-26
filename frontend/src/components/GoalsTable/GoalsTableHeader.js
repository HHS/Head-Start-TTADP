import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Pagination from 'react-js-pagination';
import { Link, useHistory } from 'react-router-dom';
import { Button } from '@trussworks/react-uswds';
import UserContext from '../../UserContext';
import { canEditOrCreateGoals } from '../../permissions';
import { DECIMAL_BASE } from '../../Constants';

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

export default function GoalsTableHeader({
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
  selectedGoals,
}) {
  const history = useHistory();
  const { user } = useContext(UserContext);
  const hasButtonPermissions = canEditOrCreateGoals(user, parseInt(regionId, DECIMAL_BASE));

  const showAddNewButton = hasActiveGrants && hasButtonPermissions;

  const onPrint = () => {
    history.push(`/recipient-tta-records/${recipientId}/region/${regionId}/goals-objectives/print${window.location.search}`, {
      selectedGoals,
    });
  };

  return (
    <div className="desktop:display-flex padding-x-3">
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
              <span className="margin-x-1">Add new goal</span>
            </Link>
          </span>
        ) : null }
        <Button
          className="display-flex flex-align-center usa-button usa-button--unstyled margin-x-3 margin-y-3"
          onClick={onPrint}
        >
          Preview and print
        </Button>
      </div>
      {!hidePagination && (
        <span className="smart-hub--table-nav">
          <span aria-label="Pagination for goals">
            <span
              className="smart-hub--total-count display-flex flex-align-center height-full margin-2 desktop:margin-0 padding-right-1"
              aria-label={`Page ${activePage}, displaying rows ${renderTotal(
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
        </span>
      )}
    </div>
  );
}

GoalsTableHeader.propTypes = {
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
  selectedGoals: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number })).isRequired,
};

GoalsTableHeader.defaultProps = {
  hidePagination: false,
  count: 0,
  activePage: 0,
  offset: 0,
  perPage: 10,
  handlePageChange: () => { },
};
