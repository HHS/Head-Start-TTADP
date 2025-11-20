import React from 'react';
import PropTypes from 'prop-types';
import { uniqueId, uniq } from 'lodash';
import ContextMenu from '../ContextMenu';
import ReadOnlyObjective from './ReadOnlyObjective';
import './ReadOnly.scss';

const formatPrompts = (prompts) => {
  const ps = Array.isArray(prompts) ? prompts : Object.values(prompts);
  return ps.filter((prompt) => (
    prompt.response && prompt.response.length)).map((prompt) => ({
    key: prompt.title.replace(/\s/g, '-').toLowerCase() + prompt.ordinal,
    title: prompt.grantDisplayName,
    response: prompt.response.join ? prompt.response.join(', ') : prompt.response,
  }));
};

export const parseObjectValuesOrString = (d) => {
  try {
  // if null or undefined, return empty string
    if (!d) {
      return '';
    }

    if (typeof d === 'string') {
      return d;
    }

    // this gets arrays and numbers
    // (although numbers are not expected
    // and will be converted to empty arrays by Object.values)
    return uniq(Object.values(d)).join(', ');
  } catch (e) {
    return ''; // honestly, try breaking this function now, you can't
  }
};

export default function ReadOnlyGoal({
  onEdit,
  onRemove,
  hideEdit,
  goal,
  index,
}) {
  let menuItems = [
    {
      label: 'Edit',
      onClick: () => onEdit(goal, index),
    },
    {
      label: 'Remove',
      onClick: () => onRemove(goal),
    },
  ];

  if (hideEdit) {
    menuItems = [
      {
        label: 'Remove',
        onClick: () => onRemove(goal),
      },
    ];
  }

  return (
    <div key={`goal${goal.id}`}>
      <div className="ttahub-goal-form-goal-summary padding-3 position-relative margin-bottom-4">
        <div className="display-flex flex-justify">
          <div className="display-flex flex-align-start align-items-flex-start">
            <h2 className="margin-top-0 margin-bottom-3">Recipient TTA goal</h2>
          </div>
          <div className="margin-left-2">
            <ContextMenu
              label={`Actions for Goal ${goal.id}`}
              menuItems={menuItems}
              menuClassName="width-card"
            />
          </div>
        </div>
        <h3 className="margin-top-0 margin-bottom-2">Goal summary</h3>
        { goal.grants && goal.grants.length
          ? (
            <div className="margin-bottom-2">
              <h4 className="margin-0">Recipient grant numbers</h4>
              <p className="usa-prose margin-0">{goal.grants.map((grant) => grant.numberWithProgramTypes).join(', ')}</p>
            </div>
          )
          : null }
        <div className="margin-bottom-3">
          <h4 className="margin-0">Recipient&apos;s goal</h4>
          <p className="usa-prose margin-0">{goal.name}</p>
        </div>
        {(goal.source) ? (
          <div className="margin-bottom-2" key={uniqueId('goal-source-read-only-')}>
            <h4 className="margin-0">Goal source</h4>
            <p className="usa-prose margin-0">{parseObjectValuesOrString(goal.source)}</p>
          </div>
        ) : null}
        {goal.prompts && goal.prompts.length > 0 && (
          <>
            <h3 className="margin-top-3 margin-bottom-2">Root cause</h3>
            {formatPrompts(goal.prompts).map((prompt) => (
              <div className="margin-bottom-2" key={prompt.key}>
                <h4 className="margin-0">{prompt.title}</h4>
                <p className="usa-prose margin-0">{prompt.response}</p>
              </div>
            ))}
          </>
        )}
        { goal.objectives.map((objective) => (
          <ReadOnlyObjective key={`read-only-objective-${objective.id}`} objective={objective} />
        ))}
      </div>
    </div>
  );
}

ReadOnlyGoal.propTypes = {
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  hideEdit: PropTypes.bool,
  index: PropTypes.number.isRequired,
  goal: PropTypes.shape({
    prompts: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        response: PropTypes.oneOfType([
          PropTypes.arrayOf(PropTypes.string),
          PropTypes.string,
        ]),
      }),
    ),
    source: PropTypes.string,
    id: PropTypes.number,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.number,
      }),
    ),
    objectives: PropTypes.arrayOf(
      PropTypes.shape({
        ttaProvided: PropTypes.string,
        resources: PropTypes.arrayOf(PropTypes.shape({
          key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          value: PropTypes.string,
        })),
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
    ),
    name: PropTypes.string,
    isRttapa: PropTypes.string,
  }).isRequired,
};

ReadOnlyGoal.defaultProps = {
  hideEdit: false,
};
