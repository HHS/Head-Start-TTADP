import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import TTAHistory from '../TTAHistory';

const memoryHistory = createMemoryHistory();

describe('Grantee Record - TTA History', () => {
  const renderTTAHistory = () => {
    render(
      <Router history={memoryHistory}>
        <TTAHistory granteeName="Jim Grantee" granteeId="401" regionId="1" />
      </Router>,
    );
  };

  it('renders the TTA History page appropriately', async () => {
    act(() => renderTTAHistory());
    const overview = document.querySelector('.smart-hub--dashboard-overview');
    expect(overview).toBeTruthy();
  });

  it('renders the activity reports table', async () => {
    renderTTAHistory();
    const reports = await screen.findByText('Activity Reports');
    expect(reports).toBeInTheDocument();
  });
});
