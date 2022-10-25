import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../ContextMenu';
import ReadOnlyObjective from './ReadOnlyObjective';
import './ReadOnly.scss';

export default function ReadOnlyOtherEntityObjectives({
  onEdit,
  hideEdit,
  objectives,
}) {
  let menuItems;
  if (!hideEdit) {
    menuItems = [
      {
        label: 'Edit',
        onClick: () => onEdit(objectives),
      },
    ];
  }

  return (
    <div className="ttahub-goal-form-goal-summary padding-4 margin-y-4 position-relative">
      <h2 className="margin-top-0">Other entity objectives</h2>
      <div className="position-absolute pin-top pin-right padding-4">
        {
          !hideEdit
            ? (
              <ContextMenu
                label="Actions for Objectives"
                menuItems={menuItems}
                menuClassName="width-card"
              />
            )
            : null
        }
      </div>
      {
        objectives.map((objective) => (
          <ReadOnlyObjective key={`read-only-objective-${objective.id}`} objective={objective} />
        ))
    }
    </div>
  );
}

ReadOnlyOtherEntityObjectives.propTypes = {
  onEdit: PropTypes.func.isRequired,
  hideEdit: PropTypes.bool,
  objectives: PropTypes.arrayOf(
    PropTypes.shape({
      ttaProvided: PropTypes.string,
      resources: PropTypes.arrayOf(PropTypes.string),
      topics: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string,
      })),
      files: PropTypes.arrayOf(PropTypes.shape({
        originalFileName: PropTypes.string,
        fileSize: PropTypes.number,
        status: PropTypes.string,
        url: PropTypes.shape({
          url: PropTypes.string,
        }),
      })),
      title: PropTypes.string,
      id: PropTypes.number,
      status: PropTypes.string,
    }),
  ).isRequired,
};

ReadOnlyOtherEntityObjectives.defaultProps = {
  hideEdit: false,
};
