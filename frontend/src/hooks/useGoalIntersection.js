import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to track which goal is currently most visible in the viewport
 * using IntersectionObserver
 *
 * @param {Array} goals - Array of goal objects
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Visibility threshold (0-1)
 * @param {string} options.rootMargin - Root margin for observer
 * @returns {Object} { currentGoalIndex, totalGoals, goalLabel }
 */
const useGoalIntersection = (goals = [], options = {}) => {
  const {
    threshold = 0.4,
    rootMargin = '-80px 0px -40% 0px', // Account for header and bottom portion
  } = options;

  const [currentGoalIndex, setCurrentGoalIndex] = useState(null);

  /**
   * Extract text from parentheses in goal name
   * Example: "Increase enrollment (families)" -> "families"
   */
  const extractParentheticalText = useCallback((goalName) => {
    if (!goalName) return null;
    const match = goalName.match(/\(([^)]+)\)/);
    return match ? match[1] : null;
  }, []);

  useEffect(() => {
    // Don't set up observer if no goals
    if (!goals || goals.length === 0) {
      setCurrentGoalIndex(null);
      return undefined;
    }

    const ratios = {};

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-goal-index'), 10);
          if (!Number.isNaN(index)) {
            ratios[index] = entry.isIntersecting ? entry.intersectionRatio : 0;
          }
        });

        // Find the goal with the highest intersection ratio
        const maxIndex = Object.keys(ratios).reduce((max, key) => {
          const keyNum = parseInt(key, 10);
          const maxNum = max === null ? -1 : max;
          return ratios[keyNum] > (ratios[maxNum] || 0) ? keyNum : max;
        }, null);

        setCurrentGoalIndex(maxIndex);
      },
      {
        threshold,
        rootMargin,
      },
    );

    // Observe all goal elements
    const goalElements = document.querySelectorAll('[data-goal-index]');
    goalElements.forEach((element) => {
      observer.observe(element);
    });

    // Cleanup
    return () => {
      goalElements.forEach((element) => {
        observer.unobserve(element);
      });
      observer.disconnect();
    };
  }, [goals, threshold, rootMargin]);

  const currentGoal = currentGoalIndex !== null && goals[currentGoalIndex]
    ? goals[currentGoalIndex]
    : null;

  const goalLabel = currentGoal
    ? extractParentheticalText(currentGoal.name)
    : null;

  return {
    currentGoalIndex: currentGoalIndex !== null ? currentGoalIndex + 1 : null, // Convert to 1-based
    totalGoals: goals.length,
    goalLabel,
    isVisible: currentGoalIndex !== null,
  };
};

export default useGoalIntersection;
