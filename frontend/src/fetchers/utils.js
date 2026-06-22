const SORT_PARAMS_CONFIG = {
  sortDir: 'direction',
  sortBy: 'sortBy',
  activePage: 'activePage',
  offset: 'offset',
  limit: 'perPage',
};

export const getSortConfigParams = (sortConfig) => {
  const params = new URLSearchParams();
  Object.entries(SORT_PARAMS_CONFIG).forEach(([paramName, configLocation]) => {
    if (sortConfig[configLocation]) {
      params.append(paramName, sortConfig[configLocation]);
    }
  });

  return params;
};
