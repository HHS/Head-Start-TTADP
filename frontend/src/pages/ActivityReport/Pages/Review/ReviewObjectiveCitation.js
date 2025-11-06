import React from 'react';
import PropTypes from 'prop-types';
import { useFormContext } from 'react-hook-form';
import RenderReviewCitations from '../components/RenderReviewCitations';

const ReviewObjectiveCitation = ({
  label,
  name,
  customValue,
}) => {
  const { getValues } = useFormContext();
  if (!customValue || !customValue[name]) {
    return null;
  }

  const { activityRecipients } = getValues();
  const objectiveCitations = customValue[name];

  return (
    <div className="grid-row grid-gap margin-top-1 margin-bottom-3 desktop:margin-bottom-0">
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6  font-sans-2xs desktop:font-sans-sm text-bold">
        {label}
      </div>
      <div className="grid-col-12 desktop:grid-col-6 print:grid-col-6">
        <RenderReviewCitations
          citations={objectiveCitations}
          activityRecipients={activityRecipients}
          className="margin-bottom-2"
        />
      </div>
    </div>
  );
};

ReviewObjectiveCitation.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  customValue: PropTypes.arrayOf(PropTypes.string),

};

ReviewObjectiveCitation.defaultProps = {
  customValue: null,
};

export default ReviewObjectiveCitation;
