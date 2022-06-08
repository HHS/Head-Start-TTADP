import React from 'react';
import PropTypes from 'prop-types';
import { ROW_CLASS, FIRST_COLUMN_CLASS, SECOND_COLUMN_CLASS } from './constants';
import { STATUSES } from '../../../../components/GoalsTable/StatusDropdown';

export default function PrintableObjective({ objective }) {
  const key = objective.status || 'Needs Status';
  const { icon } = STATUSES[key];

  return (
    <div className="border-1px margin-y-1">
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Objective</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.title}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Activity reports</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.arId}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Grant number</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.grantNumber}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>End date</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.endDate}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Reasons</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.reasons.join(', ')}</p>
      </div>
      <div className={ROW_CLASS}>
        <p className={FIRST_COLUMN_CLASS}>Objective status</p>
        <p className={SECOND_COLUMN_CLASS}>
          {icon}
          {objective.status}
        </p>
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
