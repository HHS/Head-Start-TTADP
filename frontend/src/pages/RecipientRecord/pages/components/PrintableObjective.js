import React from 'react';
import PropTypes from 'prop-types';

export default function PrintableObjective({ objective }) {
  return (
    <div className="border-1px margin-bottom-105">
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Objective</div>
        <div className="flex-1">{objective.title}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Activity reports</div>
        <div className="flex-1">{objective.arId}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Grant number</div>
        <div className="flex-1">{objective.grantNumber}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">End date</div>
        <div className="flex-1">{objective.endDate}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Reasons</div>
        <div className="flex-1">{objective.reasons.join(', ')}</div>
      </div>
      <div className="display-flex padding-105 no-break-within">
        <div className="text-bold width-card-lg">Objective status</div>
        <div className="flex-1">{objective.status}</div>
      </div>
    </div>
  );
}

PrintableObjective.propTypes = {
  objective: PropTypes.shape({
    title: PropTypes.string,
    arId: PropTypes.number,
    grantNumber: PropTypes.string,
    endDate: PropTypes.string,
    reasons: PropTypes.arrayOf(PropTypes.string),
    status: PropTypes.string,
  }).isRequired,
};
