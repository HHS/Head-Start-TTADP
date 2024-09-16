import React from 'react';
import { render } from '@testing-library/react';
import ReadOnlyGoalCollaborators from '../ReadOnlyGoalCollaborators';

describe('ReadOnlyGoalCollaborators', () => {
  test('renders nothing when collaborators array is empty', () => {
    const { container } = render(<ReadOnlyGoalCollaborators collaborators={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders goal collaborators correctly', () => {
    const collaborators = [
      {
        goalCreatorName: 'John Doe',
        goalCreatorRoles: 'Role 1, Role 2',
        goalNumber: '1',
      },
      {
        goalCreatorName: 'Jane Smith',
        goalCreatorRoles: 'Role 3',
        goalNumber: '2',
      },
    ];

    const { getByText } = render(<ReadOnlyGoalCollaborators collaborators={collaborators} />);

    expect(getByText('Entered by (1)')).toBeInTheDocument();
    expect(getByText(/John Doe/i)).toBeInTheDocument();
    expect(getByText(/Role 1, Role 2/i)).toBeInTheDocument();

    expect(getByText('Entered by (2)')).toBeInTheDocument();
    expect(getByText(/Jane Smith/i)).toBeInTheDocument();
    expect(getByText(/Role 3/i)).toBeInTheDocument();
  });

  test('renders null when goalCreatorName is missing', () => {
    const collaborators = [
      {
        goalCreatorRoles: 'Role 1',
        goalNumber: '1',
      },
    ];

    const { queryByText } = render(<ReadOnlyGoalCollaborators collaborators={collaborators} />);

    expect(queryByText(/Entered by (1)/i)).not.toBeInTheDocument();
  });

  test('renders correcly when goalCreatorRoles is missing', () => {
    const collaborators = [
      {
        goalCreatorName: 'John Doe',
        goalNumber: '1',
      },
    ];

    const { getByText } = render(<ReadOnlyGoalCollaborators collaborators={collaborators} />);

    expect(getByText('Entered by')).toBeInTheDocument();
    expect(getByText(/John Doe/i)).toBeInTheDocument();
  });
});
