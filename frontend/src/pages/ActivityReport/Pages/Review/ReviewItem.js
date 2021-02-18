import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import _ from 'lodash';
import { useFormContext } from 'react-hook-form';

const ReviewItem = ({ label, name, path }) => {
  const { getValues } = useFormContext();
  const value = getValues(name);
  let values = value;

  if (!Array.isArray(value)) {
    values = [value];
  }

  if (path) {
    values = values.map((v) => _.get(v, path));
  }

  const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
  const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');

  return (
    <Grid row className={classes}>
      <Grid col={6}>
        {label}
      </Grid>
      <Grid col={6}>
        {values.map((v, index) => (
          <Grid aria-label={`${label} ${index + 1}`} key={`${label}${v}`} col={12} className="flex-align-end display-flex flex-column flex-justify-center">
            {v}
          </Grid>
        ))}
      </Grid>
    </Grid>
  );
};

ReviewItem.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  path: PropTypes.string,
};

ReviewItem.defaultProps = {
  path: '',
};

export default ReviewItem;
