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
    const specialistsWithCorrectRoles = specialists.map((s) => ({
      ...s,
      roles: s.roles ? s.roles.map((roleName) => ({ role: { name: roleName } })) : [],
    }));
    render(<SpecialistTags specialists={specialistsWithCorrectRoles} />);
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

    expect(screen.getByText('Role 1, Role 2')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-tooltip-text', 'Multi Role');
  });

  it('handles specialists with empty or invalid roles in the input array', () => {
    const specialistsWithCorrectRoles = [
      { name: 'Bad Role', roles: [null, undefined, { role: { name: 'Valid Role' } }, { role: { name: '' } }] },
      { name: 'No Roles', roles: [] },
    ];
    render(<SpecialistTags specialists={specialistsWithCorrectRoles} />);

    expect(screen.getByText('Valid Role')).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    const noRolesTooltip = tooltips.find((t) => t.getAttribute('data-tooltip-text') === 'No Roles');
    expect(noRolesTooltip).toBeInTheDocument();
    expect(noRolesTooltip).toHaveTextContent('');

    expect(tooltips).toHaveLength(2);
  });

  it('renders nothing if specialists array is empty', () => {
    renderSpecialistTags([]);
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('handles roles array containing non-string values gracefully', () => {
    const specialistsWithCorrectRoles = [
      { name: 'Mixed Roles', roles: [{ role: { name: 'Role A' } }, null, { invalid: 'data' }, { role: { name: 'Role B' } }, undefined] },
    ];
    render(<SpecialistTags specialists={specialistsWithCorrectRoles} />);

    expect(screen.getByText('Role A, Role B')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-tooltip-text', 'Mixed Roles');
  });
});
