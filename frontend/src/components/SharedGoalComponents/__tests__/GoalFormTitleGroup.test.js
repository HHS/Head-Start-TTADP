import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalFormTitleGroup from '../GoalFormTitleGroup';

describe('GoalFormTitleGroup', () => {
  it('renders draft tag when status is draft', () => {
    render(<GoalFormTitleGroup status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders draft tag when status is Draft (case insensitive)', () => {
    render(<GoalFormTitleGroup status="Draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('does not render draft tag when status is not draft', () => {
    render(<GoalFormTitleGroup status="In Progress" />);
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });
});
