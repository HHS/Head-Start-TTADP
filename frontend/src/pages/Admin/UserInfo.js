import React from 'react';
import PropTypes from 'prop-types';
import {
  Label, TextInput, Grid, Fieldset,
} from '@trussworks/react-uswds';
import moment from 'moment';

import RegionDropdown from '../../components/RegionDropdown';
import JobTitleDropdown from '../../components/JobTitleDropdown';

/**
 * This component is the top half of the UserSection on the admin page. It displays and allows
 * editing of basic user information.
 */
function UserInfo({ user, onUserChange }) {
  let { lastLogin } = user;
  if (lastLogin && lastLogin !== '') {
    lastLogin = moment(lastLogin).format('lll Z');
  }
  return (
    <Fieldset className="margin-bottom-2" legend="User Info">
      <Grid row gap>
        <Grid col={12}>
          <Label htmlFor="input-email-name">Email</Label>
          <TextInput readOnly disabled id="input-email-name" type="text" name="email" value={user.email || ''} />
        </Grid>
        <Grid col={12}>
          <Label htmlFor="input-full-name">Full Name</Label>
          <TextInput id="input-full-name" type="text" name="name" value={user.name || ''} onChange={onUserChange} />
        </Grid>
      </Grid>
      <Grid row gap>
        <Grid col={6}>
          <RegionDropdown id="user-region" name="homeRegionId" value={user.homeRegionId || undefined} onChange={onUserChange} includeCentralOffice />
        </Grid>
        <Grid col={6}>
          <JobTitleDropdown id="role" name="role" value={user.role || undefined} onChange={onUserChange} />
        </Grid>
      </Grid>
      <Grid row gap>
        <Grid col={12}>
          <Label htmlFor="input-last-login">Last Login</Label>
          <TextInput readOnly disabled id="input-last-login" type="text" name="lastLogin" value={lastLogin} />
        </Grid>
      </Grid>
    </Fieldset>
  );
}

UserInfo.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
    name: PropTypes.string,
    homeRegionId: PropTypes.number,
    role: PropTypes.string,
    hsesUserId: PropTypes.string,
    phoneNumber: PropTypes.string,
  }).isRequired,
  onUserChange: PropTypes.func.isRequired,
};

export default UserInfo;
