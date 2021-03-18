import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import { useFormContext } from 'react-hook-form/dist/index.ie11';

import { ExternalLink } from '../../../../components/ExternalResourceModal';
import { isValidURL, isExternalURL } from '../../../../utils';

const ReviewItem = ({ label, name, path }) => {
  const { watch } = useFormContext();
  const value = watch(name);
  let values = value;

  if (!Array.isArray(value)) {
    values = [value];
  }

  if (path) {
    values = values.map((v) => _.get(v, path));
  }

  values = values.map((v) => {
    // If not a valid url, then its most likely just text, so leave it as is
    if (!isValidURL(v)) {
      return v;
    }

    if (isExternalURL(v)) {
      return <ExternalLink to={v}>{v}</ExternalLink>;
    }

    const localLink = new URL(v);
    return <Link to={localLink.pathname}>{v}</Link>;
  });

  const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
  const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');

  return (
    <div className={`grid-row ${classes} margin-bottom-3 desktop:margin-bottom-0`}>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6  font-sans-2xs desktop:font-sans-sm text-bold desktop:text-normal">
        {label}
      </div>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6">
        {values.map((v, index) => (
          <div aria-label={`${label} ${index + 1}`} key={`${label}${v}`} col={12} className="desktop:flex-align-end display-flex flex-column flex-justify-center">
            {Number.isNaN(v) ? '' : v}
          </div>
        ))}
      </div>
    </div>
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
