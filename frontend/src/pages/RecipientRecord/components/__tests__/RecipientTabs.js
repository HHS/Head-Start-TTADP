import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecipientTabs from '../RecipientTabs';

describe('RecipientTabs', () => {
  const renderRecipientTabs = (backLink = null) => {
    render(
      <MemoryRouter>
        <RecipientTabs
          region="1"
          recipientId="1"
          backLink={backLink}
        />
      </MemoryRouter>,
    );
  };

  it('does not show the icon if there is no back link', () => {
    renderRecipientTabs();
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument();
  });

  it('does not show the icon if the backlink is a fragment', () => {
    renderRecipientTabs(<></>);
    expect(screen.queryByTestId('back-link-icon')).not.toBeInTheDocument();
  });

  it('shows the icon if the backlink is a <Link>', () => {
    renderRecipientTabs(<a href="/">Back</a>);
    expect(screen.queryByTestId('back-link-icon')).toBeInTheDocument();
  });
});
