import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import useUrlFilters from '../../../hooks/useUrlFilters';
import FilterPanel from '../../../components/filter/FilterPanel';
import { formatDateRange } from '../../../components/DateRangeSelect';

const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

export default function GoalsObjectives() {
  const [filters, setFilters] = useUrlFilters([{
    id: uuidv4(),
    topic: 'createDate',
    condition: 'Is within',
    query: yearToDate,
  }]);

  const onRemoveFilter = (id) => {
    const newFilters = [...filters];
    const index = newFilters.findIndex((item) => item.id === id);
    if (index !== -1) {
      newFilters.splice(index, 1);
      setFilters(newFilters);
    }
  };

  return (
    <div className="margin-x-2 maxw-widescreen">
      <div className="display-flex flex-wrap margin-bottom-2" data-testid="filter-panel">
        <FilterPanel
          onRemoveFilter={onRemoveFilter}
          onApplyFilters={setFilters}
          allowedFilters={
          [
            'status',
            'createDate',
            'topic',
            'reason',
          ]
        }
          applyButtonAria="Apply filters to goals"
          filters={filters}
        />
      </div>
    </div>
  );
}
