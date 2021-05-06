import React from 'react';
import PropTypes from 'prop-types';
import { HashLink } from 'react-router-hash-link';

const Section = ({
  title, children, basePath, anchor, hidePrint, canEdit,
}) => {
  const classes = [
    'smart-hub-review-section',
    'margin-top-2 desktop:margin-top-0',
    hidePrint ? 'smart-hub-review-section--empty no-print' : '',
    'margin-bottom-3',
  ].filter((x) => x).join(' ');

  return (
    <div className={classes}>
      <div className="grid-row border-bottom padding-bottom-1 margin-bottom-105">
        <div className="grid-col-12 desktop:grid-col-6">
          <b className="margin-y-1">{title}</b>
        </div>
        <div className="grid-col-12 desktop:grid-col-6 display-flex flex-align-end flex-column flex-justify-center">
          {canEdit && (
          <HashLink
            aria-label={`Edit form section "${title}"`}
            to={`${basePath}#${anchor}`}
            className="smart-hub-edit-link pull-right no-print"
          >
            Edit
          </HashLink>
          )}
        </div>
      </div>
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
  canEdit: PropTypes.bool.isRequired,
};

export default Section;
