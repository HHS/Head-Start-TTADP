import React, { useState } from 'react';
import { Dropdown } from '@trussworks/react-uswds';
import WidgetContainer from '../components/WidgetContainer';

export default function MonitoringRelatedTta() {
  const [sortConfig, setSortConfig] = useState({
    sortBy: '',
    direction: '',
  });

  const setSortBy = (e) => {
    const [sortBy, direction] = e.target.value.split('-');
    setSortConfig({
      sortBy,
      direction,
    });
  };

  const subtitle = (
    <>
      <div className="margin-bottom-2">
        <p className="smart-hub-widget--subtitle usa-prose margin-x-0 margin-y-0">
          The date filter applies to the review received date.
        </p>
      </div>
      <div className="desktop:display-flex flex-align-center margin-bottom-3" data-testid="monitoring-related-tta-sort-container" data-sortby={sortConfig.sortBy} data-direction={sortConfig.direction}>
        {/* Label is associated with Dropdown below (a thin wrapper for  <select>) */}
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label className="display-block margin-right-1" style={{ minWidth: 'max-content' }} htmlFor="sortBy">Sort by</label>
        <Dropdown
          onChange={setSortBy}
          value={`${sortConfig.sortBy}-${sortConfig.direction}`}
          className="margin-top-0"
          id="sortBy"
          name="sortBy"
        >
          <option value="recipient_finding-desc">Recipient (A to Z), then Finding type</option>
          <option value="recipient_finding-asc">Recipient (Z to A), then Finding type</option>
          <option value="recipient_citation-asc">Recipient (A to Z), then Citation number</option>
          <option value="recipient_citation-desc">Recipient (Z to A), then Citation number</option>
          <option value="citation-asc">Citation number (low  to high), then Recipient</option>
          <option value="citation-desc">Citation number (high  to low), then Recipient</option>
        </Dropdown>
      </div>
    </>
  );

  return (
    <WidgetContainer
      loading={false}
      title="Monitoring related TTA"
      subtitle={subtitle}
      showHeaderBorder
      menuItems={[]}
    />
  );
}
