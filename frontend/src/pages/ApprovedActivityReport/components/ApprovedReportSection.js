import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { renderData } from '../helpers';
import './ApprovedReportSection.scss';

export default function ApprovedReportSection({
  title,
  sections,
  className,
}) {
  return (
    <div className={`ttahub-approved-report-section-container ${className}`}>
      <h2 className="font-serif-xl margin-y-3">{title}</h2>
      {sections.map((section) => {
        const subheadings = Object.keys(section.data);
        return (
          <div
            className={`ttahub-approved-report-section padding-x-2 padding-top-3 padding-bottom-2 margin-0 ${section.striped ? 'ttahub-approved-report-section__striped' : ''}`}
            key={uuidv4()}
          >
            {section.heading ? <h3 className="ttahub-approved-report-section--heading font-sans-lg margin-0 margin-bottom-2">{section.heading}</h3> : null}
            {subheadings.map((subheading) => (
              <div className="ttahub-approved-report-section--heading--section-row tablet:display-flex" key={uuidv4()}>
                <p className="ttahub-approved-report-section--heading--section-row-title text-bold usa-prose margin-0 margin-bottom-1 font-sans-3xs">{subheading}</p>
                <p className="ttahub-approved-report-section--heading--section-row-data usa-prose margin-0 margin-bottom-1 font-sans-3xs">{renderData(subheading, section.data[subheading])}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

ApprovedReportSection.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(PropTypes.shape({
    heading: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    data: PropTypes.object.isRequired, // we are using an object here since we don't know the keys
    striped: PropTypes.bool,
  })).isRequired,
};

ApprovedReportSection.defaultProps = {
  className: '',
};
