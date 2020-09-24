import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button,
} from '@trussworks/react-uswds';

import UserInfo from './UserInfo';
import UserPermissions from './UserPermissions';
import { userGlobalPermissions, userRegionalPermissions } from './PermissionHelpers';

/**
 * The user section of the Admin UI. Creating new users (and editing existing) is done
 * inside this component. This component holds all the state for the user that is currently
 * being edited.
 */
function UserSection({ user }) {
  const [formUser, updateUser] = useState();
  const [globalPermissions, updateGlobalPermissions] = useState({});
  const [regionalPermissions, updateRegionalPermissions] = useState();

  useEffect(() => {
    updateUser(user);
    updateGlobalPermissions(userGlobalPermissions(user));
    updateRegionalPermissions(userRegionalPermissions(user));
  }, [user]);

  const onUserChange = (e) => {
    updateUser({
      ...formUser,
      [e.target.name]: e.target.value,
    });
  };

  const onGlobalPermissionChange = (e) => {
    updateGlobalPermissions({
      ...globalPermissions,
      [e.target.name]: e.target.checked,
    });
  };

  const onRegionalPermissionChange = (updatedRegionalPermissions) => {
    updateRegionalPermissions({
      ...regionalPermissions,
      ...updatedRegionalPermissions,
    });
  };

  if (!formUser) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  return (
    <Form large>
      <UserInfo
        user={formUser}
        onUserChange={onUserChange}
      />
      <UserPermissions
        userId={user.id}
        globalPermissions={globalPermissions}
        onGlobalPermissionChange={onGlobalPermissionChange}
        regionalPermissions={regionalPermissions}
        onRegionalPermissionChange={onRegionalPermissionChange}
      />
      <Button>
        Save
      </Button>
    </Form>
  );
}

UserSection.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number,
    email: PropTypes.string,
    fullName: PropTypes.string,
    region: PropTypes.string,
    jobTitle: PropTypes.string,
    permissions: PropTypes.arrayOf(PropTypes.shape({
      region: PropTypes.number.isRequired,
      scope: PropTypes.string.isRequired,
    })),
  }).isRequired,
};

export default UserSection;
