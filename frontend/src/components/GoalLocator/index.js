import React from 'react';
import PropTypes from 'prop-types';
import useGoalIntersection from '../../hooks/useGoalIntersection';
import './GoalLocator.scss';

/**
 * GoalLocator Component
 *
 * Displays a sticky indicator showing which goal is currently being viewed.
 * Adapts to screen size:
 * - Desktop: Full text "Viewing goal X of Y" with extracted label
 * - Mobile: Compact "X/Y" badge
 *
 * @param {Array} goals - Array of goal objects to track
 * @param {Object} options - Configuration options for intersection observer
 */
const GoalLocator = ({ goals, options }) => {
  const {
    currentGoalIndex,
    totalGoals,
    goalLabel,
  } = useGoalIntersection(goals, options);

  // Display current goal index or 0 if none visible
  const displayIndex = currentGoalIndex || 0;

  return (
    <div
      className="goal-locator"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="goal-locator__content">
        <div className="goal-locator__desktop">
          <span className="goal-locator__label">Viewing goal</span>
          <span className="goal-locator__count">
            <strong>{displayIndex}</strong>
            {' '}
            of
            {' '}
            {totalGoals}
          </span>
          {goalLabel && (
            <div className="goal-locator__description">
              {goalLabel}
            </div>
          )}
        </div>
        <div className="goal-locator__mobile">
          <span className="goal-locator__mobile-count">
            {displayIndex}
            /
            {totalGoals}
          </span>
        </div>
      </div>
    </div>
  );
};

GoalLocator.propTypes = {
  goals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      status: PropTypes.string,
    }),
  ).isRequired,
  options: PropTypes.shape({
    threshold: PropTypes.number,
    rootMargin: PropTypes.string,
  }),
};

GoalLocator.defaultProps = {
  options: {},
};

export default GoalLocator;
