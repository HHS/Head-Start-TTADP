import React from 'react';

const FilterContext = React.createContext({
  filterKey: '',
  filters: [],
});

export default FilterContext;
