import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import GoalsTable from '../../../components/GoalsTable/GoalsTable';

export default function GoalsObjectives() {
  const [filters, setFilters] = useState([
    {
      topic: 'region',
      condition: 'Contains',
      query: '1',
    },
  ]);

  const handleApplyFilters = (newFilters) => {
    // setFilters([...newFilters, regionFilter(appliedRegion)]);
    // ariaLiveContext.announce(`${newFilters.length} filter${newFilters.length !== 1 ? 's' : ''} applied to reports`);
  };

  return (
    <>
      <Helmet>
        <title>
          Goals and Objectives
        </title>
      </Helmet>
      <div className="margin-x-2 maxw-widescreen">
        <GoalsTable
          filters={filters}
          onUpdateFilters={handleApplyFilters}
        />
      </div>
    </>
  );
}
