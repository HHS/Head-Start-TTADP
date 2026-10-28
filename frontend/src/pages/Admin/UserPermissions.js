import { Checkbox, ErrorMessage, Fieldset, Grid } from '@trussworks/react-uswds';
import { DECIMAL_BASE, SCOPE_IDS } from '@ttahub/common';
import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import {
  ALL_REGIONS,
  READ_ONLY_SCOPES,
  READ_WRITE_SCOPES,
  REGIONAL_SCOPES,
  REGIONS,
} from '../../Constants';
import RegionDropdown from '../../components/RegionDropdown';
import CurrentPermissions from './components/CurrentPermissions';
import PermissionCheckboxLabel from './components/PermissionCheckboxLabel';
import {
  createRegionalScopeObject,
  primaryApproverMessage,
  scopeFromId,
} from './PermissionHelpers';

const PRIMARY_APPROVER_SCOPE = SCOPE_IDS.APPROVE_TTA_REQUESTS.toString(DECIMAL_BASE);

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
  const currentPermissions = _.mapValues(REGIONAL_SCOPES, () => []);

  const allRegionPermissions = _.pickBy(_.pick(permissions, [ALL_REGIONS])[ALL_REGIONS]);
  const otherRegionPermissions = _.pickBy(_.omit(permissions, [ALL_REGIONS]));

  _.forEach(otherRegionPermissions, (scopes, region) => {
    // Grab the scopes that are true. I.E. from {"3": true, "4": true, "5": false} to
    // {"3": true, "4": true}
    // console.log(_.pickBy(scopes, individualRegionallyTrueOrAllRegionsTrue))
    const trueScopes = _.pickBy({ ...scopes, ...allRegionPermissions });
    // _.keys gives us an array of keys of the object, so ["3", "4"]
    _.keys(trueScopes).forEach((scope) => {
      currentPermissions[scope].push(region);
    });
  });

  // regions.length being zero means the user does not have the scope in any region. Remove the
  // scope to keep the UI less cluttered
  const prunedPermissions = _.pickBy(currentPermissions, (regions) => regions.length > 0);

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
  primaryApprovers,
}) {
  // State of the region select dropdown
  const [selectedRegion, updateSelectedRegion] = useState();
  // State of the regional permissions checkboxes, I.E. {"3": true, ...}
  const [permissionsForRegion, updatePermissionsForRegion] = useState(createRegionalScopeObject());
  const enablePermissions = selectedRegion !== undefined;
  // Why the primary TTA request approver box couldn't be checked, one message per region
  const [primaryApproverErrors, updatePrimaryApproverErrors] = useState([]);

  // We need to reset the selected region and the state of regional checkboxes when
  // another user is selected
  useEffect(() => {
    updateSelectedRegion();
    updatePermissionsForRegion(createRegionalScopeObject());
  }, [userId]);

  // an error only applies to the user and region it was raised for
  useEffect(() => {
    updatePrimaryApproverErrors([]);
  }, [userId, selectedRegion]);

  // A region can only have one primary TTA request approver, so checking the box where
  // someone else already is one is refused with a message naming them
  const onRegionalCheckboxChange = (e) => {
    const { name, checked } = e.target;

    if (name === PRIMARY_APPROVER_SCOPE && checked) {
      const regions = selectedRegion === ALL_REGIONS ? REGIONS : [selectedRegion];
      const errors = regions
        .filter((region) => primaryApprovers[region])
        .map((region) => primaryApproverMessage(region, primaryApprovers[region]));

      if (errors.length) {
        updatePrimaryApproverErrors(errors);
        return;
      }
    }

    updatePrimaryApproverErrors([]);
    onRegionalPermissionChange(e, selectedRegion);
  };

  // The user has selected a new region in the regional dropdown so we need to update
  // what regional permissions are shown
  useEffect(() => {
    const allRegionPermissions = _.pickBy(regionalPermissions[ALL_REGIONS]);

    updatePermissionsForRegion({
      ...createRegionalScopeObject(),
      ...regionalPermissions[selectedRegion],
      ...allRegionPermissions,
    });
  }, [regionalPermissions, selectedRegion]);

  const onSelectedRegionChange = (e) => {
    const { value } = e.target;
    updateSelectedRegion(parseInt(value, DECIMAL_BASE));
  };

  const PermissionsCheckboxes = ({ scopeGroup }) =>
    _.map(_.pick(permissionsForRegion, scopeGroup), (checked, scopeId) => {
      const { name, description } = scopeFromId(scopeId);
      return (
        <Grid key={name} col={12}>
          {scopeId === PRIMARY_APPROVER_SCOPE &&
            primaryApproverErrors.map((error) => (
              <ErrorMessage key={error} className="margin-top-1">
                {error}
              </ErrorMessage>
            ))}
          <Checkbox
            id={name}
            name={scopeId}
            checked={checked}
            onChange={onRegionalCheckboxChange}
            description={description}
            disabled={!enablePermissions}
            label={<PermissionCheckboxLabel name={name} description={description} />}
          />
        </Grid>
      );
    });

  PermissionsCheckboxes.propTypes = {
    scopeGroup: PropTypes.arrayOf(PropTypes.string).isRequired,
  };

  return (
    <>
      <Fieldset legend="Global Permissions">
        <Grid row gap className="margin-top-3">
          {_.map(globalPermissions, (checked, scopeId) => {
            const { name, description } = scopeFromId(scopeId);
            return (
              <Grid className="margin-bottom-2" key={name} col={12}>
                <Checkbox
                  checked={checked}
                  onChange={onGlobalPermissionChange}
                  id={name}
                  label={<PermissionCheckboxLabel name={name} description={description} />}
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
        <ul>{renderUserPermissions(regionalPermissions)}</ul>
        <RegionDropdown
          id="permission-region"
          name="permission-region"
          includeAll
          value={selectedRegion}
          onChange={onSelectedRegionChange}
        />
        <Grid row gap className="margin-top-3">
          <h2>Read only</h2>
          <PermissionsCheckboxes scopeGroup={READ_ONLY_SCOPES} />
          <h2>Write or approve</h2>
          <PermissionsCheckboxes scopeGroup={READ_WRITE_SCOPES} />
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
  // the name of whoever else is each region's primary TTA request approver, by region
  primaryApprovers: PropTypes.objectOf(PropTypes.string),
};

UserPermissions.defaultProps = {
  userId: null,
  primaryApprovers: {},
};

export default UserPermissions;
