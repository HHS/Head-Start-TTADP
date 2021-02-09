import React, { useState, useEffect, useMemo } from 'react';
import ReactRouterPropTypes from 'react-router-prop-types';
import _ from 'lodash';
import { Helmet } from 'react-helmet';
import {
  Label, TextInput, Grid, SideNav, Alert, Radio, Fieldset,
} from '@trussworks/react-uswds';
import moment from 'moment';
import UserSection from './UserSection';
import NavLink from '../../components/NavLink';
import Container from '../../components/Container';
import { updateUser, getUsers } from '../../fetchers/Admin';
import { SCOPE_IDS, DECIMAL_BASE } from '../../Constants';

/**
 * Render the left hand user navigation in the Admin UI. Use the user's full name
 * or email address if the user doesn't have a full name.
 */
function renderUserNav(users) {
  return users.map((user) => {
    const {
      name, email, id,
    } = user;
    let display = email;
    if (name) {
      display = name;
    }
    return <NavLink to={`/admin/${id}`}>{display}</NavLink>;
  });
}

/**
 * Admin UI page component. It is split into two main sections, the user list and the
 * user section. The user list can be filtered to make searching for users easier. The
 * user section contains all info on the user that can be updated (full name,
 * permissions, etc...). This component handles fetching of users from the API and will
 * be responsible for sending updates/creates back to the API (not yet implemented).
 */
function Admin(props) {
  const { match: { params: { userId } } } = props;
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, updateError] = useState();
  const [users, updateUsers] = useState([]);
  const [selectedUser, updateSelectedUser] = useState();
  const [userSearch, updateUserSearch] = useState('');
  const [lockedFilter, updateLockedFilter] = useState(false);
  const [saved, updateSaved] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      setIsLoaded(false);
      try {
        updateUsers(await getUsers());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(e);
        updateError('Unable to fetch users');
      }
      setIsLoaded(true);
    }
    fetchUsers();
  }, []);

  const onUserSearchChange = (e) => {
    updateUserSearch(e.target.value);
  };

  useEffect(() => {
    if (userId) {
      updateSelectedUser(users.find((u) => (
        u.id === parseInt(userId, DECIMAL_BASE)
      )));
      updateSaved(false);
    }
  }, [userId, users]);

  const permissionsIncludesAccess = (permissions) => (
    _.some(permissions, (perm) => (perm.scopeId === SCOPE_IDS.SITE_ACCESS))
  );

  // rules for to-lock and to-disable filters are laid out in Access Control SOP:
  // https://github.com/HHS/Head-Start-TTADP/wiki/Access-Control-&-Account-Management-SOP#account-review-frequency-and-process
  const lockThreshold = moment().subtract(60, 'days');
  const disableThreshold = moment().subtract(180, 'days');

  const filteredUsers = useMemo(() => (
    _.filter(users, (u) => {
      const { email, name, permissions } = u;
      const lastLogin = moment(u.lastLogin);
      const userMatchesFilter = `${email}${name}`.toLowerCase().includes(userSearch.toLowerCase());
      let userMatchesLockFilter = true;
      if (lockedFilter === 'recent') {
        userMatchesLockFilter = lastLogin.isAfter(lockThreshold) && !permissionsIncludesAccess(permissions);
      } else if (lockedFilter === 'to-lock') {
        userMatchesLockFilter = lastLogin.isBefore(lockThreshold) && permissionsIncludesAccess(permissions);
      } else if (lockedFilter === 'to-disable') {
        userMatchesLockFilter = lastLogin.isBefore(disableThreshold) && permissions.length > 0;
      }
      return userMatchesFilter && userMatchesLockFilter;
    })
  ), [users, userSearch, lockedFilter]);

  if (!isLoaded) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  const onSave = async (newUser) => {
    let updatedUser;
    try {
      updatedUser = await updateUser(selectedUser.id, newUser);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
      updateError('Unable to save user');
      return;
    }
    // update the FE view of all users with the updated user
    const newUsers = [...users];
    const index = newUsers.findIndex((u) => (
      u.id === newUser.id
    ));
    newUsers.splice(index, 1, updatedUser);
    updateUsers(newUsers);
    updateSelectedUser(updatedUser);
    updateError();
    updateSaved(true);
  };

  return (
    <>
      <Helmet>
        <title>User Administration</title>
      </Helmet>
      <Container>
        <h1 className="text-center">User Administration</h1>
        <Grid row gap>
          <Grid col={4}>
            <Fieldset className="smart-hub--report-legend" legend="Access Control Filtering">
              <Radio
                label="Show all users"
                id="access-control-filter-all"
                name="lock-filter"
                checked={lockedFilter === false}
                onChange={() => updateLockedFilter(false)}
              />
              <Radio
                label="Show recent locked logins"
                id="access-control-filter-recent"
                name="lock-filter"
                checked={lockedFilter === 'recent'}
                onChange={() => updateLockedFilter('recent')}
              />
              <Radio
                label="Show users to lock"
                id="access-control-filter-lock"
                name="lock-filter"
                checked={lockedFilter === 'to-lock'}
                onChange={() => updateLockedFilter('to-lock')}
              />
              <Radio
                label="Show users to disable"
                id="access-control-filter-disable"
                name="lock-filter"
                checked={lockedFilter === 'to-disable'}
                onChange={() => updateLockedFilter('to-disable')}
              />
            </Fieldset>
            <Label htmlFor="input-filter-users">Filter Users</Label>
            <TextInput value={userSearch} onChange={onUserSearchChange} id="input-filter-users" name="input-filter-users" type="text" />
            <div className="overflow-y-scroll maxh-tablet-lg margin-top-3">
              <SideNav items={renderUserNav(filteredUsers)} />
            </div>
          </Grid>
          <Grid col={8}>
            {error
          && (
          <Alert type="error" role="alert">
            {error}
          </Alert>
          )}
            {saved
          && (
          <Alert type="success" role="alert">
            Successfully saved user
          </Alert>
          )}
            {!selectedUser
          && (
            <p className="margin-top-3 text-bold">
              Select a user...
            </p>
          )}
            {selectedUser
          && (
            <UserSection onSave={onSave} user={selectedUser} />
          )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

Admin.propTypes = {
  match: ReactRouterPropTypes.match.isRequired,
};

export default Admin;
