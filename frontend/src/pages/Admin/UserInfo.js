import React from 'react';
import PropTypes from 'prop-types';
import {
  Label, TextInput, Grid, Fieldset,
} from '@trussworks/react-uswds';

import RegionDropdown from '../../components/RegionDropdown';
import JobTitleDropdown from '../../components/JobTitleDropdown';

/**
 * This component is the top half of the UserSection on the admin page. It displays and allows
 * editing of basic user information.
 */
function UserInfo({ user, onUserChange }) {
  return (
    <Fieldset className="margin-bottom-2" legend="User Info">
      <Grid row gap>
        <Grid col={12}>
          <Label htmlFor="input-email-name">Email</Label>
          <TextInput id="input-email-name" type="text" name="email" value={user.email || ''} onChange={onUserChange} />
        </Grid>
        <Grid col={12}>
          <Label htmlFor="input-full-name">Full Name</Label>
          <TextInput id="input-full-name" type="text" name="fullName" value={user.fullName || ''} onChange={onUserChange} />
        </Grid>
      </Grid>
      <Grid row gap>
        <Grid col={6}>
          <RegionDropdown id="user-region" name="region" value={user.region} onChange={onUserChange} />
        </Grid>
        <Grid col={6}>
          <JobTitleDropdown id="job-title" name="jobTitle" value={user.jobTitle} onChange={onUserChange} />
        </Grid>
      </Grid>
    </Fieldset>
  );
}

UserInfo.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
    fullName: PropTypes.string,
    region: PropTypes.string,
    jobTitle: PropTypes.string,
  }).isRequired,
  onUserChange: PropTypes.func.isRequired,
};

export default UserInfo;
