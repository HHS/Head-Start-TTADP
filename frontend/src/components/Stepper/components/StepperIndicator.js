/*
  Our react USWDS library does not have support for the step indicator,
  which is why those components are defined in our codebase. This component
  represents the complete stepper navigation. It converts an array of "steps"
  which are objects with a label and what "stepper" status the object has
  (active vs complete vs incomplete) and converts the objects into the
  appropriate <StepperIndicatorSegment />
*/
import React from 'react';
import PropTypes from 'prop-types';

import StepperIndicatorSegment from './StepperIndicatorSegment';
// The css in this file along with `flex-justify-center` causes the indicator to be
// _mostly_ centered in whatever container it is inside of. flex-justify-center centers
// the complete ordered list. The max-width css class removes most of the extra width
// on the last element in the list. Without these CSS changes the stepper indicator
// is too far to the left (because the last element in the list has a lot of unused
// space). The problem is more pronounced the fewer steps there are in the stepper.
import './StepperIndicator.css';

const StepperIndicator = ({ segments }) => (
  <div className="usa-step-indicator usa-step-indicator--counters" aria-label="progress">
    <ol className="usa-step-indicator__segments flex-justify-center">
      {segments.map((segment) => (
        <StepperIndicatorSegment
          key={segment.label}
          label={segment.label}
          complete={segment.complete}
          current={segment.current}
        />
      ))}
    </ol>
  </div>
);

StepperIndicator.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      complete: PropTypes.bool.isRequired,
      current: PropTypes.bool.isRequired,
    }),
  ).isRequired,
};

export default StepperIndicator;
