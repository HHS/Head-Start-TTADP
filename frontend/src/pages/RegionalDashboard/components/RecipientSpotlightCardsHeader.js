import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Label } from '@trussworks/react-uswds';
import WidgetH2 from '../../../components/WidgetH2';
import './RecipientSpotlightDashboardCards.scss';

const SORT_OPTIONS = [
  { value: 'indicatorCount-desc', label: 'priority indicators (high to low)' },
  { value: 'indicatorCount-asc', label: 'priority indicators (low to high)' },
  { value: 'recipientName-asc', label: 'recipient name (A-Z)' },
  { value: 'recipientName-desc', label: 'recipient name (Z-A)' },
  { value: 'lastTTA-asc', label: 'last TTA (oldest to newest)' },
  { value: 'lastTTA-desc', label: 'last TTA (newest to oldest)' },
  { value: 'regionId-asc', label: 'region ID (ascending)' },
  { value: 'regionId-desc', label: 'region ID (descending)' },
];

export default function RecipientSpotlightCardsHeader({
  sortConfig,
  requestSort,
  perPage,
  perPageChange,
  count,
}) {
  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    requestSort(sortBy, direction);
  };

  return (
    <div className="padding-3">
      {/* Title Section */}
      <div className="padding-bottom-2">
        <WidgetH2 classNames="padding-0 margin-bottom-1">
          Priority indicators
        </WidgetH2>
        <p className="usa-prose padding-0 margin-0">
          These are the recipients that currently have at least one priority indicator.
        </p>
      </div>

      {/* Sort and Per-Page Controls */}
      <div className="display-flex flex-justify flex-wrap margin-bottom-2">
        {/* Left: Sort Dropdown */}
        <div className="display-flex flex-align-center flex-no-wrap margin-bottom-1 ttahub-recipient-spotlight-sort">
          <Label htmlFor="recipientSpotlightSortBy" className="margin-right-1 margin-y-0 text-no-wrap">
            Sort by
          </Label>
          <Dropdown
            onChange={setSortBy}
            value={`${sortConfig.sortBy}-${sortConfig.direction}`}
            id="recipientSpotlightSortBy"
            name="recipientSpotlightSortBy"
            className="maxw-full margin-0 ttahub-recipient-spotlight-sort-dropdown"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Dropdown>
        </div>

        {/* Right: Per-Page Selector */}
        <div className="display-flex flex-align-center flex-no-wrap margin-bottom-1 ttahub-recipient-spotlight-per-page">
          <Label htmlFor="recipientSpotlightPerPage" className="margin-right-1 margin-y-0 text-no-wrap">
            Show
          </Label>
          <Dropdown
            onChange={perPageChange}
            value={perPage}
            id="recipientSpotlightPerPage"
            name="recipientSpotlightPerPage"
            className="width-auto margin-0"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={count}>All</option>
          </Dropdown>
        </div>
      </div>

      <hr className="ttahub-recipient-spotlight-header-divider border-bottom smart-hub-border-base-lighter border-0 margin-0" />
    </div>
  );
}

RecipientSpotlightCardsHeader.propTypes = {
  sortConfig: PropTypes.shape({
    sortBy: PropTypes.string.isRequired,
    direction: PropTypes.string.isRequired,
  }).isRequired,
  requestSort: PropTypes.func.isRequired,
  perPage: PropTypes.number.isRequired,
  perPageChange: PropTypes.func.isRequired,
  count: PropTypes.number.isRequired,
};
