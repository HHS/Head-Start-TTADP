import React from 'react';
import {
  Checkbox, Grid, Fieldset,
} from '@trussworks/react-uswds';

export default function UserFeatureFlags() {
  return (
    <Fieldset legend="Advanced features">
      <Grid row gap className="margin-top-3">
        <Grid col={12}>
          <Checkbox
            onChange={() => {}}
            id="feature-1"
            label="Feature 1"
            name="feature-1"
            disabled={false}
          />
        </Grid>
        <Grid col={12}>
          <Checkbox
            checked
            onChange={() => {}}
            id="feature-2"
            label="Feature 2"
            name="feature-2"
            disabled={false}
          />
        </Grid>
      </Grid>
    </Fieldset>
  );
}
