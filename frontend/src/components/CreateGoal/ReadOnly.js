import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';

export default function ReadOnly({ grants, goalName, endDate }) {
  return (
    <>
      <div className="bg-base-lightest padding-4 margin-y-4">
        <h2 className="margin-top-0">Recipient TTA goal</h2>
        <h3>Goal summary</h3>
        <h4 className="margin-bottom-1">Recipient grant numbers</h4>
        { grants.map((g) => g.label) }
        <h4 className="margin-bottom-1">Goal</h4>
        <p className="margin-top-0">{goalName}</p>
        <h4 className="margin-bottom-1">End date</h4>
        <p className="margin-top-0">{endDate}</p>
      </div>

      <div className="margin-bottom-4">
        <Button unstyled>
          <FontAwesomeIcon className="margin-right-1" color="#005ea2" icon={faPlusCircle} />
          Add another goal
        </Button>
      </div>

      <Button type="button" outline>Save draft</Button>
      <Button type="submit">Submit goal</Button>
    </>
  );
}

ReadOnly.propTypes = {
  grants: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.number,
    }),
  ).isRequired,
  goalName: PropTypes.string.isRequired,
  endDate: PropTypes.string.isRequired,
};
