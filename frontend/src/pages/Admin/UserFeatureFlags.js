import React from 'react';
import PropTypes from 'prop-types';
import {
  Checkbox, Grid, Fieldset,
} from '@trussworks/react-uswds';

export default function UserFeatureFlags({ flags, features, onFeaturesChange }) {
  return (
    <Fieldset legend="Advanced features">
      <Grid row gap className="margin-top-3">
        {features.map((f) => (
          <Grid col={12} key={f.value}>
            <Checkbox
              checked={flags.includes(f.value)}
              onChange={(e) => {
                onFeaturesChange(e, f.value);
              }}
              id={`feature-${f.value}`}
              label={f.label}
              name={f.value}
            />
          </Grid>
        ))}
      </Grid>
    </Fieldset>
  );
}

UserFeatureFlags.propTypes = {
  features: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.string,
  })).isRequired,
  onFeaturesChange: PropTypes.func.isRequired,
  flags: PropTypes.arrayOf(PropTypes.string).isRequired,
};
