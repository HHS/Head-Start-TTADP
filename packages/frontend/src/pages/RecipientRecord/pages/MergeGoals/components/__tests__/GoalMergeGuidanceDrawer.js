import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalMergeGuidanceDrawer from '../GoalMergeGuidanceDrawer';

describe('GoalMergeGuidanceDrawer', () => {
  const renderTest = () => {
    render(<div><GoalMergeGuidanceDrawer drawerTriggerRef={null} /></div>);
  };

  it('handles no ref', async () => {
    renderTest();
    expect(screen.queryByText('Merge Goals')).not.toBeInTheDocument();
  });
});
