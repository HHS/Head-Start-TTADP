import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import SpecialistTags from '../components/SpecialistTags';

jest.mock('../../../../../components/Tooltip', () => ({
  __esModule: true,
  default: ({ displayText, tooltipText }) => (
    <span data-testid="tooltip" data-tooltip-text={tooltipText}>
      {displayText}
    </span>
  ),
}));

describe('SpecialistTags', () => {
  const renderSpecialistTags = (specialists) => {
    render(<SpecialistTags specialists={specialists} />);
  };

  it('renders tags for specialists', () => {
    const specialists = [
      { name: 'John Doe', roles: ['Grantee Specialist'] },
      { name: 'Jane Smith', roles: ['Regional Specialist'] },
    ];
    renderSpecialistTags(specialists);

    expect(screen.getByText('Grantee Specialist')).toBeInTheDocument();
    expect(screen.getByText('Regional Specialist')).toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toHaveAttribute('data-tooltip-text', 'John Doe');
    expect(tooltips[1]).toHaveAttribute('data-tooltip-text', 'Jane Smith');
  });

  it('handles specialists with no name', () => {
    const specialists = [
      { name: 'John Doe', roles: ['Grantee Specialist'] },
      { name: null, roles: ['Something'] },
    ];
    renderSpecialistTags(specialists);

    expect(screen.getByText('Grantee Specialist')).toBeInTheDocument();
    expect(screen.queryByText('Something')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('tooltip')).toHaveLength(1);
  });

  it('handles specialists with multiple roles', () => {
    const specialists = [
      { name: 'Multi Role', roles: ['Role 1', 'Role 2'] },
    ];
    renderSpecialistTags(specialists);

    expect(screen.getByText('Role 1')).toBeInTheDocument();
    expect(screen.getByText('Role 2')).toBeInTheDocument();
    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toHaveAttribute('data-tooltip-text', 'Multi Role');
    expect(tooltips[1]).toHaveAttribute('data-tooltip-text', 'Multi Role');
  });

  it('handles specialists with empty or invalid roles in the input array', () => {
    const specialists = [
      { name: 'Bad Role', roles: [null, undefined, 'Valid Role', ''] },
      { name: 'No Roles', roles: [] },
    ];
    renderSpecialistTags(specialists);

    expect(screen.getByText('Valid Role')).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toHaveAttribute('data-tooltip-text', 'Bad Role');
    expect(tooltips[1]).toHaveAttribute('data-tooltip-text', 'No Roles');
    expect(tooltips[1]).toHaveTextContent('Unavailable');
  });

  it('handles roles array containing non-string values gracefully', () => {
    const specialists = [
      { name: 'Mixed Roles', roles: ['Role A', null, undefined, 'Role B'] },
    ];
    renderSpecialistTags(specialists);

    expect(screen.getByText('Role A')).toBeInTheDocument();
    expect(screen.getByText('Role B')).toBeInTheDocument();
    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toHaveAttribute('data-tooltip-text', 'Mixed Roles');
    expect(tooltips[1]).toHaveAttribute('data-tooltip-text', 'Mixed Roles');
  });
});
