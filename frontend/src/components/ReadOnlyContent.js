import React, { createElement } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import renderData from './renderReadOnlyContentData';
import STATUSES from './GoalCards/components/StatusDropdownStatuses';
import './ReadOnlyContent.scss';

const HEADING_CLASSES = {
  4: 'font-serif-md',
  default: 'font-sans-lg',
};

const Status = ({ statusKey }) => {
  const statusData = STATUSES[statusKey];
  const defaultData = STATUSES['Not Started'];

  let data = defaultData;

  if (statusData) {
    data = statusData;
  }

  const { IconWithProps } = data;
  return (
    <div className="ttahub-read-only-content-section--heading--section-row-status display-flex flex-align-center margin-left-4">
      <IconWithProps size="xl" />
      <p className="ttahub-read-only-content-section--heading--section-row-status-text margin-0 text-bold font-sans-md">{data.display}</p>
    </div>
  );
};

Status.propTypes = {
  statusKey: PropTypes.string.isRequired,
};

export default function ReadOnlyContent({
  title,
  sections,
  className,
  displayStatus,
}) {
  return (
    <div className={`ttahub-read-only-content-section-container ${className}`}>
      <div className="display-flex">
        <h2 className="font-serif-xl margin-bottom-3 margin-top-0">{title}</h2>
        {displayStatus && (
          <Status statusKey={displayStatus} />
        )}
      </div>
      {sections.map((section) => {
        const subheadings = Object.keys(section.data);
        const headingTag = `h${section.headingLevel || 3}`;
        const headingFontClass = HEADING_CLASSES[section.headingLevel] || HEADING_CLASSES.default;
        return (
          <div
            className="ttahub-read-only-content-section padding-bottom-3 margin-0"
            key={uuidv4()}
          >
            {section.heading ? createElement(headingTag, {
              className: `ttahub-read-only-content-section--heading ${headingFontClass} margin-0 margin-bottom-2`,
            }, section.heading) : null}
            {subheadings.map((subheading) => (
              <div className="ttahub-read-only-content-section--heading--section-row" key={uuidv4()}>
                {subheading !== 'Recipient\'s goal' ? (
                  /* Normal data section */
                  <>
                    <div className="ttahub-read-only-content-section--heading--section-row-title text-bold margin-0">{subheading}</div>
                    <div className="ttahub-read-only-content-section--heading--section-row-data margin-0 margin-bottom-2">{renderData(subheading, section.data[subheading])}</div>
                  </>
                ) : (
                  /* Recipient's Goal section */
                  <div className="ttahub-read-only-content-section--goal-summary border-left border-width-05 padding-left-2">
                    <div className="ttahub-read-only-content-section--heading--section-row-title text-bold margin-0">{subheading}</div>
                    <div className="ttahub-read-only-content-section--heading--section-row-data margin-0 margin-bottom-2 font-sans-lg">{renderData(subheading, section.data[subheading])}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

ReadOnlyContent.propTypes = {
  className: PropTypes.string,
  title: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(PropTypes.shape({
    heading: PropTypes.string,
    data: PropTypes.shape().isRequired,
    goalSection: PropTypes.bool,
  })).isRequired,
  displayStatus: PropTypes.string,
};

ReadOnlyContent.defaultProps = {
  className: '',
  displayStatus: '',
};
