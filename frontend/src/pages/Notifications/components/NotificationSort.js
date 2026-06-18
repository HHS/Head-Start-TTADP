import { Dropdown } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const DEFAULT_SORT_KEY = 'action_needed-asc';

const SORT_KEY_TO_CONFIG = {
  'action_needed-asc': { sortBy: 'triggeredAt', direction: 'ASC' },
  'action_needed-desc': { sortBy: 'triggeredAt', direction: 'DESC' },
  'informational-asc': { sortBy: 'createdAt', direction: 'ASC' },
  'informational-desc': { sortBy: 'createdAt', direction: 'DESC' },
  'type-asc': { sortBy: 'updatedAt', direction: 'ASC' },
  'type-desc': { sortBy: 'updatedAt', direction: 'DESC' },
  'all-asc': { sortBy: 'triggeredAt', direction: 'ASC' },
  'all-desc': { sortBy: 'triggeredAt', direction: 'DESC' },
};

export default function NotificationSort({ onChange, options, value }) {
  const history = useHistory();
  const location = useLocation();

  const handleChange = (event) => {
    const nextSortKey = event.target.value || DEFAULT_SORT_KEY;
    const nextSortConfig = SORT_KEY_TO_CONFIG[nextSortKey] || SORT_KEY_TO_CONFIG[DEFAULT_SORT_KEY];
    const params = new URLSearchParams(location.search);

    params.set('sortBy', nextSortConfig.sortBy);
    params.set('direction', nextSortConfig.direction);

    history.push({
      pathname: location.pathname,
      search: `?${params.toString()}`,
    });

    onChange(nextSortKey, nextSortConfig);
  };

  return (
    <div className="display-flex flex-align-center margin-bottom-3">
      <label className="margin-right-1 text-no-wrap" htmlFor="notifications-sort">
        Sort by
      </label>
      <Dropdown
        className="margin-top-0 width-card-lg"
        id="notifications-sort"
        name="notifications-sort"
        onChange={handleChange}
        value={value || DEFAULT_SORT_KEY}
      >
        {options.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Dropdown>
    </div>
  );
}

NotificationSort.propTypes = {
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string,
};

NotificationSort.defaultProps = {
  onChange: () => {},
  value: DEFAULT_SORT_KEY,
};
