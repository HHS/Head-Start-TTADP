import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button,
} from '@trussworks/react-uswds';

import UserInfo from './UserInfo';
import UserPermissions from './UserPermissions';
import { userGlobalPermissions, userRegionalPermissions } from './PermissionHelpers';

const NUMBER_FIELDS = [
  'homeRegionId',
];

/**
 * The user section of the Admin UI. Editing existing users is done inside this component.
 * This component holds all the state for the user that is currently being edited. New users
 * are not created in this component, nor anywhere in the Admin UI. New users are created
 * automatically the first time they attempt to login to the Smart Hub
 */
function UserSection({ user, onSave }) {
  const [formUser, updateUser] = useState();

  useEffect(() => {
    updateUser(user);
  }, [user]);

  const onUserChange = (e) => {
    const { name, value } = e.target;
    updateUser({
      ...formUser,
      [name]: NUMBER_FIELDS.includes(name) ? parseInt(value, 10) : value,
    });
  };

  const onPermissionChange = (e, strRegion) => {
    const scope = parseInt(e.target.name, 10);
    const region = parseInt(strRegion, 10);
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
      <UserPermissions
        userId={user.id}
        globalPermissions={userGlobalPermissions(formUser)}
        onGlobalPermissionChange={onGlobalPermissionChange}
        regionalPermissions={userRegionalPermissions(formUser)}
        onRegionalPermissionChange={onRegionalPermissionChange}
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
    permissions: PropTypes.arrayOf(PropTypes.shape({
      regionId: PropTypes.number.isRequired,
      scopeId: PropTypes.number.isRequired,
    })),
  }).isRequired,
};

export default UserSection;
