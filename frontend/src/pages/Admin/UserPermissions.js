import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {
  Checkbox, Grid, Fieldset,
} from '@trussworks/react-uswds';

import { REGIONAL_SCOPES, DECIMAL_BASE } from '../../Constants';
import PermissionCheckboxLabel from './components/PermissionCheckboxLabel';
import CurrentPermissions from './components/CurrentPermissions';
import RegionDropdown from '../../components/RegionDropdown';
import { createRegionalScopeObject, scopeFromId } from './PermissionHelpers';

/**
 * Display the current permissions for the selected user
 *
 * The permission object coming into this method is keyed off the region. We want to key
 * the user's current permissions off the scope when displaying. This method creates a
 * new permission object map with the schema <ScopeId, ArrayOf(regions)>. So a user with
 * "READ_ACTIVITY_REPORTS" on region 1, 2 and 3 this object will be {"4": ["1","2","3"]}
 * @param {Object<string, {Object<string, bool>>}} permissions
 */
function renderUserPermissions(permissions) {
  const currentPermissions = _.mapValues(REGIONAL_SCOPES, () => (
    []
  ));

  _.forEach(permissions, (scopes, region) => {
    // Grab the scopes that are true. I.E. from {"3": true, "4": true, "5": false} to
    // {"3": true, "4": true}
    const trueScopes = _.pickBy(scopes);
    // _.keys gives us an array of keys of the object, so ["3", "4"]
    _.keys(trueScopes).forEach((scope) => {
      currentPermissions[scope].push(region);
    });
  });

  // regions.length being zero means the user does not have the scope in any region. Remove the
  // scope to keep the UI less cluttered
  const prunedPermissions = _.pickBy(currentPermissions, (regions) => (
    regions.length > 0
  ));

  return _.map(prunedPermissions, (regions, scope) => (
    <CurrentPermissions key={scope} regions={regions} scope={scope} />
  ));
}

/**
 * This component is the lower half of the UserSection. It is responsible for displaying permissions
 * and passing any updates up to the UserSection component. The Admin can set permissions for a
 * single region at a time.
 */
function UserPermissions({
  userId,
  globalPermissions,
  onGlobalPermissionChange,
  regionalPermissions,
  onRegionalPermissionChange,
}) {
  // State of the region select dropdown
  const [selectedRegion, updateSelectedRegion] = useState();
  // State of the regional permissions checkboxes, I.E. {"3": true, ...}
  const [permissionsForRegion, updatePermissionsForRegion] = useState(createRegionalScopeObject());
  const enablePermissions = selectedRegion !== undefined;

  // We need to reset the selected region and the state of regional checkboxes when
  // another user is selected
  useEffect(() => {
    updateSelectedRegion();
    updatePermissionsForRegion(createRegionalScopeObject());
  }, [userId]);

  // The user has selected a new region in the regional dropdown so we need to update
  // what regional permissions are shown
  useEffect(() => {
    updatePermissionsForRegion({
      ...createRegionalScopeObject(),
      ...regionalPermissions[selectedRegion],
    });
  }, [regionalPermissions, selectedRegion]);

  const onSelectedRegionChange = (e) => {
    const { value } = e.target;
    updateSelectedRegion(parseInt(value, DECIMAL_BASE));
  };

  return (
    <>
      <Fieldset legend="Global Permissions">
        <Grid row gap className="margin-top-3">
          {_.map(globalPermissions, (checked, scopeId) => {
            const { name, description } = scopeFromId(scopeId);
            return (
              <Grid key={name} col={12}>
                <Checkbox
                  checked={checked}
                  onChange={onGlobalPermissionChange}
                  id={name}
                  label={(<PermissionCheckboxLabel name={name} description={description} />)}
                  name={scopeId}
                  disabled={false}
                />
              </Grid>
            );
          })}
        </Grid>
      </Fieldset>
      <Fieldset legend="Regional Permissions">
        <h2>Current Permissions</h2>
        <ul>
          {renderUserPermissions(regionalPermissions)}
        </ul>
        <RegionDropdown id="permission-region" name="permission-region" value={selectedRegion} onChange={onSelectedRegionChange} />
        <Grid row gap className="margin-top-3">
          {_.map(permissionsForRegion, (checked, scopeId) => {
            const { name, description } = scopeFromId(scopeId);
            return (
              <Grid key={name} col={12}>
                <Checkbox
                  id={name}
                  name={scopeId}
                  checked={checked}
                  onChange={(e) => { onRegionalPermissionChange(e, selectedRegion); }}
                  description={description}
                  disabled={!enablePermissions}
                  label={(<PermissionCheckboxLabel name={name} description={description} />)}
                />
              </Grid>
            );
          })}
        </Grid>
      </Fieldset>
    </>
  );
}

UserPermissions.propTypes = {
  userId: PropTypes.number,
  globalPermissions: PropTypes.objectOf(PropTypes.bool).isRequired,
  onGlobalPermissionChange: PropTypes.func.isRequired,
  regionalPermissions: PropTypes.objectOf(PropTypes.objectOf(PropTypes.bool)).isRequired,
  onRegionalPermissionChange: PropTypes.func.isRequired,
};

UserPermissions.defaultProps = {
  userId: null,
};

export default UserPermissions;
