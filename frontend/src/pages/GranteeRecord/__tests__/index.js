import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import fetchMock from 'fetch-mock';
import GranteeRecord from '../index';

describe('grantee record page', () => {
  const user = {
    id: 2,
    permissions: [
      {
        regionId: 45,
        userId: 2,
        scopeId: 1,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 2,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 3,
      },
    ],
  };

  const theMightyGrantee = {
    name: 'the Mighty Grantee',
    grants: [
      {
        name: 'Grant Name 1',
        number: 'GRANTEE_NUMBER',
        status: 'Active',
        programTypes: ['Early Head Start (ages 0-3)', 'Head Start (ages 3-5)'],
        startDate: null,
        endDate: null,
        id: 10,
        regionId: 45,
        programSpecialistName: 'The Mighty Program Specialist',
        granteeId: 9,
      },
    ],
  };

  function renderGranteeRecord() {
    const match = {
      path: '',
      url: '',
      params: {
        granteeId: 1,
        regionId: 45,
      },
    };

    render(<GranteeRecord user={user} match={match} />);
  }

  beforeEach(() => {
    fetchMock.get('/api/user', user);
    fetchMock.get('/api/grantee/1?region.in[]=45&modelType=grant', theMightyGrantee);
    fetchMock.get('/api/widgets/dashboardOverview?region.in[]=45&granteeId.in[]=1', {
      duration: '',
      deliveryMethod: '',
      numberOfParticipants: '',
      inPerson: '',
      sumDuration: '',
      numParticipants: '',
    });
    act(() => renderGranteeRecord());
  });
  afterEach(() => {
    fetchMock.restore();
  });

  it('shows the subtitle and grantee name', async () => {
    await waitFor(() => {
      expect(screen.getByText(/grantee tta record/i)).toBeInTheDocument();
      expect(screen.getByText('the Mighty Grantee - Region 45')).toBeInTheDocument();
    });
  });

  it('shows the grantee summary widget', async () => {
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: /region 45/i })).toBeInTheDocument();
      expect(screen.getByText(
        theMightyGrantee.grants[0].programSpecialistName,
      )).toBeInTheDocument();
    });
  });
});
