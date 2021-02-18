import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { HashLink } from 'react-router-hash-link';

const Section = ({
  title, children, basePath, anchor, hidePrint,
}) => {
  const classes = [
    'smart-hub-review-section',
    hidePrint ? 'smart-hub-review-section--empty no-print' : '',
    'margin-bottom-3',
  ].filter((x) => x).join(' ');

  return (
    <div className={classes}>
      <Grid row className="border-bottom padding-bottom-1 margin-bottom-105">
        <Grid col={6}>
          <b className="margin-y-1">{title}</b>
        </Grid>
        <Grid col={6} className="flex-align-end display-flex flex-column flex-justify-center">
          <HashLink
            aria-label={`Edit form section "${title}"`}
            to={`${basePath}#${anchor}`}
            className="smart-hub-edit-link pull-right no-print"
          >
            Edit
          </HashLink>
        </Grid>
      </Grid>
      {children}
    </div>
  );
};

Section.propTypes = {
  hidePrint: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  anchor: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  basePath: PropTypes.string.isRequired,
};

export default Section;
