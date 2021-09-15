import { Button } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import Container from '../../components/Container';
import Example from '../../widgets/Example';
import Filter, { filtersToQueryString } from '../Landing/Filter';

function Widgets() {
  const [appliedFilters, updateAppliedFilters] = useState('');
  const [errorOverride, updateErrorOverride] = useState(false);

  const applyFilters = (filters) => {
    const filterQuery = filtersToQueryString(filters);
    updateAppliedFilters(filterQuery);
  };

  return (
    <>
      <Container>
        <Helmet>
          <title>Widgets</title>
        </Helmet>
        Hello Widgets
        <span className="margin-left-2">
          <Filter applyFilters={applyFilters} forMyAlerts />
        </span>
        <Button onClick={() => updateErrorOverride((old) => !old)}>Toggle error</Button>
      </Container>
      <Example
        filters={appliedFilters}
        region={1}
        errorOverride={errorOverride}
      />
    </>
  );
}

export default Widgets;
