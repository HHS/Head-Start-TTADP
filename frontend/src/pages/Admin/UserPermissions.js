import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {
  Checkbox, Grid, Fieldset,
} from '@trussworks/react-uswds';

import { GLOBAL_SCOPES, REGIONAL_SCOPES } from '../../Constants';
import PermissionCheckboxLabel from './components/PermissionCheckboxLabel';
import CurrentPermissions from './components/CurrentPermissions';
import RegionDropdown from '../../components/RegionDropdown';
import { createScopeObject } from './PermissionHelpers';

/**
 * Display the current permissions for the selected user
 *
 * The permission object coming into this method is keyed off the region. We want to key
 * the user's current permissions off the scope when displaying. This method creates a
 * new permission object map with the schema <Scope, ArrayOf(regions)>. So a user with
 * "READ_REPORTS" on region 1, 2 and 3 this object will be {"READ_REPORTS": ["1","2","3"]}
 * @param {Object<string, {Object<string, bool>>}} permissions
 */
function renderUserPermissions(permissions) {
  const currentPermissions = REGIONAL_SCOPES.reduce((acc, cur) => {
    acc[cur.name] = [];
    return acc;
  }, {});

  _.forEach(permissions, (scopes, region) => {
    // Grab the scopes that are true. I.E. from {"READ_REPORTS": true, "READ_WRITE_REPORTS": true,
    // "SCOPE": false} to {"READ_REPORTS": true, "READ_WRITE_REPORTS": true}
    const trueScopes = _.pickBy(scopes);
    // _.keys gives us an array of keys of the object, so ["READ_REPORTS", "READ_WRITE_REPORTS"]
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
  // State of the regional permissions checkboxes, I.E. {"READ_REPORTS": true, ...}
  const [permissionsForRegion, updatePermissionsForRegion] = useState(createScopeObject());
  const enablePermissions = selectedRegion !== undefined;

  useEffect(() => {
    updateSelectedRegion();
    updatePermissionsForRegion(createScopeObject());
  }, [userId]);

  useEffect(() => {
    updatePermissionsForRegion({
      ...createScopeObject(),
      ...regionalPermissions[selectedRegion],
    });
  }, [regionalPermissions, selectedRegion]);

  const onSelectedRegionChange = (e) => {
    const { value } = e.target;
    updatePermissionsForRegion({ ...permissionsForRegion, ...regionalPermissions[value] });
    updateSelectedRegion(value);
  };

  const onPermissionsForRegionChange = (e) => {
    const newRegionPermissions = { ...permissionsForRegion, [e.target.name]: e.target.checked };
    onRegionalPermissionChange({
      ...regionalPermissions,
      [selectedRegion]: { ...newRegionPermissions },
    });
  };

  return (
    <>
      <Fieldset legend="Global Permissions">
        <Grid row gap className="margin-top-3">
          {GLOBAL_SCOPES.map(({ name, description }) => (
            <Grid key={name} col={12}>
              <Checkbox
                checked={globalPermissions[name]}
                onChange={onGlobalPermissionChange}
                id={name}
                label={(<PermissionCheckboxLabel name={name} description={description} />)}
                name={name}
                disabled={false}
              />
            </Grid>
          ))}
        </Grid>
      </Fieldset>
      <Fieldset legend="Regional Permissions">
        <h2>Current Permissions</h2>
        <ul>
          {renderUserPermissions(regionalPermissions)}
        </ul>
        <RegionDropdown id="permission-region" name="permission-region" value={selectedRegion} onChange={onSelectedRegionChange} />
        <Grid row gap className="margin-top-3">
          {REGIONAL_SCOPES.map(({ name, description }) => (
            <Grid key={name} col={12}>
              <Checkbox
                id={name}
                name={name}
                checked={permissionsForRegion[name]}
                onChange={onPermissionsForRegionChange}
                description={description}
                disabled={!enablePermissions}
                label={(<PermissionCheckboxLabel name={name} description={description} />)}
              />
            </Grid>
          ))}
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
