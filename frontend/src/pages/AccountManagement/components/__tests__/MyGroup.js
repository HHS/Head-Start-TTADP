import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MyGroup from '../MyGroup';

const defaultGroup = {
  id: 1,
  name: 'group1',
  userId: 1,
  isPublic: false,
  creator: {
    name: 'Tom Jones',
    id: 1,
  },
  groupCollaborators: [],
  updatedAt: '2021-07-19T00:00:00.000Z',
};

describe('MyGroup', () => {
  const renderMyGroup = (group = defaultGroup, isViewOnly = false, isCoOwner = false) => {
    render(
      <MemoryRouter>
        <MyGroup
          group={group}
          setMyGroups={jest.fn()}
          setError={jest.fn()}
          isViewOnly={isViewOnly}
          isCoOwner={isCoOwner}
        />
        ,
      </MemoryRouter>,
    );
  };

  it('renders without crashing', () => {
    renderMyGroup();
    expect(screen.getByText('group1')).toBeInTheDocument();
    expect(screen.getByText('Tom Jones')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByText('07/19/2021')).toBeInTheDocument();
    expect(screen.getByText('Edit group')).toBeInTheDocument();
    expect(screen.getByText('Delete group')).toBeInTheDocument();
  });

  it('renders view only', () => {
    renderMyGroup(defaultGroup, true);
    expect(screen.getByText('group1')).toBeInTheDocument();
    expect(screen.getByText('View group')).toBeInTheDocument();
    expect(screen.queryByText('Edit group')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete group')).not.toBeInTheDocument();
  });

  it('displays the correct accesss for co-owners', () => {
    const groupWithIndividuals = {
      ...defaultGroup,
      groupCollaborators: [
        {
          collaboratorType: {
            name: 'SharedWith',
          },
          user: {
            id: 1,
          },
        },
      ],
    };
    renderMyGroup(groupWithIndividuals, false, true);
    expect(screen.getByText('group1')).toBeInTheDocument();
    expect(screen.getByText('Tom Jones')).toBeInTheDocument();
    expect(screen.getByText('Individuals')).toBeInTheDocument();
    expect(screen.getByText('07/19/2021')).toBeInTheDocument();
    expect(screen.getByText('Edit group')).toBeInTheDocument();
    expect(screen.getByText('Delete group')).toBeInTheDocument();
  });

  it('displays the correct updated at with user', () => {
    const groupWithIndividuals = {
      ...defaultGroup,
      groupCollaborators: [
        {
          collaboratorType: {
            name: 'SharedWith',
          },
          user: {
            id: 1,
          },
        },
      ],
      editor: {
        id: 2,
        name: 'Jane Doe',
      },
    };
    renderMyGroup(groupWithIndividuals, false, true);
    expect(screen.getByText('group1')).toBeInTheDocument();
    expect(screen.getByText('Tom Jones')).toBeInTheDocument();
    expect(screen.getByText('Individuals')).toBeInTheDocument();
    expect(screen.getByText('07/19/2021 by Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Edit group')).toBeInTheDocument();
    expect(screen.getByText('Delete group')).toBeInTheDocument();
  });
});
