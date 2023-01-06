import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button,
} from '@trussworks/react-uswds';

import UserInfo from './UserInfo';
import UserPermissions from './UserPermissions';
import UserFeatureFlags from './UserFeatureFlags';
import { userGlobalPermissions, userRegionalPermissions } from './PermissionHelpers';
import { DECIMAL_BASE, SESSION_STORAGE_IMPERSONATION_KEY } from '../../Constants';
import { storageAvailable } from '../../hooks/helpers';

const NUMBER_FIELDS = [
  'homeRegionId',
];

/**
 * The user section of the Admin UI. Editing existing users is done inside this component.
 * This component holds all the state for the user that is currently being edited. New users
 * are not created in this component, nor anywhere in the Admin UI. New users are created
 * automatically the first time they attempt to login to the Smart Hub
 */
function UserSection({ user, onSave, features }) {
  const [formUser, updateUser] = useState();
  const haveStorage = useMemo(() => storageAvailable('sessionStorage'), []);

  useEffect(() => {
    updateUser(user);
  }, [user]);

  const impersonateUserId = () => {
    if (!haveStorage) return;
    window.sessionStorage.setItem(SESSION_STORAGE_IMPERSONATION_KEY, formUser.id);
    window.location.href = '/';
  };

  const onUserChange = (e) => {
    if (Array.isArray(e)) {
      updateUser({
        ...formUser,
        roles: e.map((obj) => ({ fullName: obj.value })),
      });
      return;
    }
    const { name, value } = e.target;
    updateUser({
      ...formUser,
      [name]: NUMBER_FIELDS.includes(name) ? parseInt(value, DECIMAL_BASE) : value,
    });
  };

  const onFeaturesChange = (e, flag) => {
    if (e.target.checked) {
      updateUser({
        ...formUser,
        flags: [
          ...formUser.flags,
          flag,
        ],
      });
    } else {
      updateUser({
        ...formUser,
        flags: formUser.flags.filter((f) => f !== flag),
      });
    }
  };

  const onPermissionChange = (e, strRegion) => {
    const scope = parseInt(e.target.name, DECIMAL_BASE);
    const region = parseInt(strRegion, DECIMAL_BASE);
    const { checked } = e.target;

    if (checked) {
      updateUser({
        ...formUser,
        permissions: [
          ...formUser.permissions,
          { userId: user.id, scopeId: scope, regionId: region },
        ],
      });
    } else {
      updateUser({
        ...formUser,
        permissions: formUser.permissions.filter((permission) => (
          // We are removing permissions (because checked is false). Only keep
          // permissions that do not have the "unchecked" scope and region
          !(permission.scopeId === scope && permission.regionId === region)
        )),
      });
    }
  };

  const onGlobalPermissionChange = (e) => {
    onPermissionChange(e, 14);
  };

  const onRegionalPermissionChange = (e, region) => {
    onPermissionChange(e, region);
  };

  if (!formUser) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  return (
    <Form
      onSubmit={(e) => { e.preventDefault(); onSave(formUser); }}
      large
    >
      <UserInfo
        user={formUser}
        onUserChange={onUserChange}
      />
      {process.env.NODE_ENV === 'development' && (
        <Button className="margin-bottom-6" onClick={impersonateUserId}>Impersonate user</Button>
      )}
      <UserPermissions
        userId={user.id}
        globalPermissions={userGlobalPermissions(formUser)}
        onGlobalPermissionChange={onGlobalPermissionChange}
        regionalPermissions={userRegionalPermissions(formUser)}
        onRegionalPermissionChange={onRegionalPermissionChange}
      />
      <UserFeatureFlags
        onFeaturesChange={onFeaturesChange}
        features={features}
        flags={formUser.flags}
      />
      <Button>
        Save
      </Button>
    </Form>
  );
}

UserSection.propTypes = {
  onSave: PropTypes.func.isRequired,
  user: PropTypes.shape({
    id: PropTypes.number,
    email: PropTypes.string,
    name: PropTypes.string,
    hsesUserId: PropTypes.string,
    phoneNumber: PropTypes.string,
    homeRegionId: PropTypes.number,
    title: PropTypes.string,
    flags: PropTypes.arrayOf(PropTypes.string),
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
  features: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.string,
  })),
};

UserSection.defaultProps = {
  features: [],
};

export default UserSection;
