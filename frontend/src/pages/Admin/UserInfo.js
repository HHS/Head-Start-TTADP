/* eslint-disable react/jsx-props-no-spreading */
import React, {
  useEffect, useState, useMemo, memo,
} from 'react';
import PropTypes from 'prop-types';
import {
  Label, TextInput, Grid, Fieldset,
} from '@trussworks/react-uswds';
import { format, parseISO } from 'date-fns';
import RegionDropdown from '../../components/RegionDropdown';
import AdminMultiSelect from '../../components/AdminMultiSelect';
import { getRoles } from '../../fetchers/Admin';

const AuthoritiesList = memo(({ authorities }) => {
  const [expanded, setExpanded] = useState(false);

  const { alwaysVisible, hidden } = useMemo(() => {
    if (!Array.isArray(authorities) || authorities.length === 0) {
      return { alwaysVisible: [], hidden: [] };
    }

    // First ROLE_* authority (if any)
    const roleAuth = authorities.find((a) => a && a.startsWith('ROLE_'));

    // First two authorities in original order, excluding the ROLE_* if it’s one of them
    const firstTwo = authorities.slice(0, 2).filter((a) => a !== roleAuth);

    const visibleBase = [];
    const seen = new Set();

    const pushUnique = (val) => {
      if (val == null) return;
      if (!seen.has(val)) {
        visibleBase.push(val);
        seen.add(val);
      }
    };

    if (roleAuth) pushUnique(roleAuth);
    firstTwo.forEach(pushUnique);

    // Hidden = everything not already in visibleBase (preserve original order)
    const hiddenRest = authorities.filter((a) => !seen.has(a));

    return { alwaysVisible: visibleBase, hidden: hiddenRest };
  }, [authorities]);

  const visible = expanded ? [...alwaysVisible, ...hidden] : alwaysVisible;

  return (
    <>
      <ul>
        {visible.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <button
          type="button"
          className="usa-button usa-button--unstyled margin-top-1"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : `Show all (${authorities.length})`}
        </button>
      )}
    </>
  );
});

AuthoritiesList.propTypes = {
  authorities: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function UserInfo({ user, onUserChange }) {
  let { lastLogin } = user;

  if (lastLogin && lastLogin !== '') {
    lastLogin = format(parseISO(lastLogin), 'MMM d, yyyy h:mm aa xxx');
  }

  const [roleOptions, setRoleOptions] = useState([]);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const rolesFromApi = await getRoles();
        setRoleOptions(rolesFromApi.map((r) => r.fullName));
      } catch (error) {
        setFetchError(true);
      }
    }

    if (!fetchError && roleOptions.length < 1) {
      fetchRoles();
    }
  }, [fetchError, roleOptions.length]);

  return (
    <>
      <Fieldset className="margin-bottom-2" legend="User Profile">
        <Grid row gap>
          <Grid col={12}>
            <Label htmlFor="input-email-name">Email</Label>
            <TextInput
              id="input-email-name"
              type="text"
              name="email"
              value={user.email || ''}
              onChange={onUserChange}
            />
          </Grid>
          <Grid col={12}>
            <Label htmlFor="input-full-name">Full Name</Label>
            <TextInput
              id="input-full-name"
              type="text"
              name="name"
              value={user.name || ''}
              onChange={onUserChange}
            />
          </Grid>
        </Grid>
        <Grid row gap>
          <Grid col={6}>
            <RegionDropdown
              id="user-region"
              name="homeRegionId"
              value={user.homeRegionId || undefined}
              onChange={onUserChange}
              includeCentralOffice
            />
          </Grid>
        </Grid>
        <Grid row gap>
          <Grid col={12}>
            <AdminMultiSelect
              id="user-roles"
              name="roles"
              value={user.roles ? user.roles.map((role) => role.fullName) : []}
              onChange={onUserChange}
              placeholder="Select roles..."
              label="Role(s)"
              options={roleOptions.map((role) => ({
                value: role,
                label: role,
              }))}
            />
          </Grid>
        </Grid>
      </Fieldset>
      <Fieldset className="margin-bottom-2" legend="User Information">
        <Grid row gap>
          <Grid col={12}>
            <dl>
              <dt className="text-bold">HSES ID</dt>
              <dd className="margin-bottom-1">{user.hsesUserId || ''}</dd>
              <dt className="text-bold">HSES Username</dt>
              <dd className="margin-bottom-1" data-testid="hses-username">
                {user.hsesUsername || ''}
              </dd>
              <dt className="text-bold">HSES Authorities</dt>
              <dd className="margin-bottom-1" data-testid="hses-authorities">
                {user.hsesAuthorities && user.hsesAuthorities.length > 0 ? (
                  <AuthoritiesList authorities={user.hsesAuthorities} />
                ) : (
                  <span>None</span>
                )}
              </dd>
              <dt className="text-bold">Last Login</dt>
              <dd data-testid="last-login">{lastLogin}</dd>
            </dl>
          </Grid>
        </Grid>
      </Fieldset>
    </>
  );
}

UserInfo.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    homeRegionId: PropTypes.number,
    roles: PropTypes.arrayOf(PropTypes.shape({
      fullName: PropTypes.string,
    })),
    hsesUserId: PropTypes.string,
    hsesUsername: PropTypes.string,
    hsesAuthorities: PropTypes.arrayOf(PropTypes.string),
    phoneNumber: PropTypes.string,
    lastLogin: PropTypes.string,
  }).isRequired,
  onUserChange: PropTypes.func.isRequired,
};

export default UserInfo;
