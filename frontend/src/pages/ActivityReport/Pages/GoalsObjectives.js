import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';

import {
  Fieldset, Label, Textarea,
} from '@trussworks/react-uswds';

const GoalsObjectives = ({ register }) => (
  <>
    <Helmet>
      <title>Goals and objectives</title>
    </Helmet>
    <Fieldset className="smart-hub--report-legend smart-hub--form-section" legend="Context">
      <Label htmlFor="context">OPTIONAL: Provide background or context for this activity</Label>
      <Textarea id="context" name="context" inputRef={register()} />
    </Fieldset>
  </>
);

GoalsObjectives.propTypes = {
  register: PropTypes.func.isRequired,
};

export default GoalsObjectives;
