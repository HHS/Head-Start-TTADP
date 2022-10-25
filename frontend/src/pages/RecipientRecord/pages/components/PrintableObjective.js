import React from 'react';
import PropTypes from 'prop-types';
import { ROW_CLASS, FIRST_COLUMN_CLASS, SECOND_COLUMN_CLASS } from './constants';
import { STATUSES } from '../../../../components/GoalCards/components/StatusDropdown';
import List from './List';

const ActivityReports = ({ reports }) => (
  <ul className="usa-list usa-list--unstyled">
    {reports.map((report) => {
      const link = report.legacyId ? `/activity-reports/legacy/${report.legacyId}` : `/activity-reports/view/${report.id}`;
      return (
        <li key={report.id}>
          <a href={link}>
            {report.displayId}
          </a>
        </li>
      );
    })}
  </ul>
);

ActivityReports.propTypes = {
  reports: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    displayId: PropTypes.string,
  })).isRequired,
};
export default function PrintableObjective({ objective }) {
  const key = objective.status || 'Needs Status';
  const { icon } = STATUSES[key] ? STATUSES[key] : STATUSES['Needs Status'];

  const rowClass = `ttahub-printable-objective ${ROW_CLASS}`;
  return (
    <div className="margin-bottom-1 margin-top-3">
      <div className={rowClass}>
        <p className={FIRST_COLUMN_CLASS}>Objective</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.title}</p>
      </div>
      <div className={rowClass}>
        <p className={FIRST_COLUMN_CLASS}>Activity reports</p>
        <p className={SECOND_COLUMN_CLASS}>
          <ActivityReports reports={objective.activityReports} />
        </p>
      </div>
      <div className={rowClass}>
        <p className={FIRST_COLUMN_CLASS}>End date</p>
        <p className={SECOND_COLUMN_CLASS}>{objective.endDate}</p>
      </div>
      <div className={rowClass}>
        <p className={FIRST_COLUMN_CLASS}>Reasons</p>
        <List className={SECOND_COLUMN_CLASS} list={objective.reasons} />
      </div>
      <div className={rowClass}>
        <p className={FIRST_COLUMN_CLASS}>Objective status</p>
        <p className={SECOND_COLUMN_CLASS}>
          {icon}
          {key}
        </p>
      </div>
    </div>
  );
}

PrintableObjective.propTypes = {
  objective: PropTypes.shape({
    title: PropTypes.string,
    activityReports: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      displayId: PropTypes.string,
    })),
    grantNumber: PropTypes.string,
    endDate: PropTypes.string,
    reasons: PropTypes.arrayOf(PropTypes.string),
    status: PropTypes.string,
  }).isRequired,
};
