import React, { useEffect, useState } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import {
  Grid, SideNav, Alert, Checkbox,
} from '@trussworks/react-uswds';

import NavLink from '../../components/NavLink';
import Container from '../../components/Container';
import { DECIMAL_BASE } from '../../Constants';

import { getCDIGrants, getGrantees, assignCDIGrant } from '../../fetchers/Admin';

import Grant from './components/Grant';

function Cdi({ match: { params: { grantId } } }) {
  const [selectedGrant, updateSelectedGrant] = useState();
  const [grantees, updateGrantees] = useState([]);
  const [grants, updateGrants] = useState([]);
  const [loaded, updateLoaded] = useState(false);
  const [error, updateError] = useState(false);
  const [unassigned, updateUnassigned] = useState(false);

  useEffect(() => {
    async function fetchGrants() {
      updateLoaded(false);
      try {
        const [fetchedGrants, fetchedGrantees] = await Promise.all([
          getCDIGrants(unassigned),
          getGrantees(),
        ]);

        updateGrants(fetchedGrants);
        updateGrantees(fetchedGrantees);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch grants or grantees');
      }
      updateLoaded(true);
    }
    fetchGrants();
  }, [unassigned]);

  useEffect(() => {
    if (grantId) {
      updateSelectedGrant(grants.find((g) => (
        g.id === parseInt(grantId, DECIMAL_BASE)
      )));
    }
  }, [grantId, grants]);

  const renderGrants = () => grants.map(({ id, number }) => (
    <NavLink to={`/admin/cdi/${id}`}>{number}</NavLink>
  ));

  const onAssignCDIGrant = async (selectedGrantId, regionId, granteeId) => {
    const grant = await assignCDIGrant(selectedGrantId, regionId, granteeId);
    const newGrants = [...grants];
    const newGrantIndex = newGrants.findIndex((g) => g.id === grant.id);
    newGrants[newGrantIndex] = grant;
    updateGrants(newGrants);
  };

  if (!loaded) {
    return (
      <div>
        loading...
      </div>
    );
  }

  return (
    <>
      <Container>
        <Grid row gap>
          <Grid col={4}>
            <h2>CDI Grants</h2>
            <Checkbox
              className="margin-bottom-3"
              id="unassigned"
              label="Show only unassigned"
              checked={unassigned}
              onChange={(e) => updateUnassigned(e.target.checked)}
            />
            <SideNav items={renderGrants()} />
          </Grid>
          <Grid col={8}>
            {error
            && (
            <Alert type="error" role="alert">
              {error}
            </Alert>
            )}
            {!selectedGrant && (
              <div>
                Please select a grant
              </div>
            )}
            {selectedGrant && (
              <Grant
                key={selectedGrant.id}
                grant={selectedGrant}
                grantees={grantees}
                onAssignCDIGrant={onAssignCDIGrant}
              />
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

Cdi.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default Cdi;
