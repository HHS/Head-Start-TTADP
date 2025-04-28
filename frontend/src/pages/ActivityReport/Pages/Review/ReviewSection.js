import React from 'react';
import PropTypes from 'prop-types';
import { HashLink } from 'react-router-hash-link';
import './ReviewSection.scss';

const Section = ({
  title, children, basePath, anchor, hidePrint, canEdit, isLastSection,
}) => {
  const classes = [
    'smart-hub-review-section',
    'margin-top-2 desktop:margin-top-0',
    hidePrint ? 'smart-hub-review-section--empty no-print' : '',
    isLastSection ? 'margin-bottom-0' : 'margin-bottom-3',
  ].filter((x) => x).join(' ');

  return (
    <div className={classes}>
      <div className="smart-hub-review-section--edit-link">
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
      <div className="grid-row padding-bottom-1">
        <div className="grid-col-12 desktop:grid-col-6">
          <h3 className="margin-y-1">{title}</h3>
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
  isLastSection: PropTypes.bool,
};

Section.defaultProps = {
  isLastSection: false,
};

export default Section;
