import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import DescriptionList from './DescriptionList';
import DescriptionItem from './DescriptionItem';
import ObjectiveStatusDropdown from '../../../../../components/GoalCards/components/ObjectiveStatusDropdown';
import { NOOP } from '../../../../../Constants';

export default function ReviewObjective({ objective, regionId }) {
  return (
    <DescriptionList vertical className="usa-list usa-list--unstyled padding-2 margin-top-2 bg-base-lightest radius-lg">
      <DescriptionItem title="Objective">
        {objective.title}
      </DescriptionItem>
      <DescriptionItem title="Activity reports">
        <ul className="usa-list add-list-reset">
          {objective.activityReports.map(({ id, displayId }) => (
            <li key={displayId}>
              <Link to={`/activity-reports/view/${id}`}>
                {displayId}
              </Link>
            </li>
          ))}
        </ul>
      </DescriptionItem>
      <DescriptionItem title="End date">
        {objective.endDate}
      </DescriptionItem>
      <DescriptionItem title="Topics">
        {objective.topics.join(', ')}
      </DescriptionItem>
      <DescriptionItem title="Objective status">
        <ObjectiveStatusDropdown
          onUpdateObjectiveStatus={NOOP}
          currentStatus={objective.status}
          regionId={regionId}
          forceReadOnly
          objectiveTitle={objective.title}
        />
      </DescriptionItem>
    </DescriptionList>
  );
}

ReviewObjective.propTypes = {
  objective: PropTypes.shape({
    title: PropTypes.string.isRequired,
    activityReports: PropTypes.arrayOf(PropTypes.string).isRequired,
    endDate: PropTypes.string.isRequired,
    topics: PropTypes.arrayOf(PropTypes.string).isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  regionId: PropTypes.number.isRequired,
};
