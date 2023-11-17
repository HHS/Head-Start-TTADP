import React from 'react';
import PropTypes from 'prop-types';
import ReadOnlyField from '../../../../../components/ReadOnlyField';

export default function DisplayNextSteps({ title, steps }) {
  if (!steps || !steps.length) {
    return null;
  }

  return (
    <>
      <h3>{title}</h3>
      {steps.map(((step, index) => (
        <div key={`${title}${step}`}>
          <ReadOnlyField
            label={`Step ${index + 1}`}
          >
            { step.note }
          </ReadOnlyField>
          <ReadOnlyField
            label="Anticipated completion date"
          >
            { step.completeDate }
          </ReadOnlyField>
        </div>
      )))}
    </>
  );
}

DisplayNextSteps.propTypes = {
  title: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.shape({
    note: PropTypes.string,
    completeDate: PropTypes.string,
  })),
};

DisplayNextSteps.defaultProps = {
  steps: [],
};
