import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AddTtaRequestButton from '../AddTtaRequestButton';

describe('AddTtaRequestButton', () => {
  it('opens the form it was given', () => {
    render(
      <MemoryRouter>
        <AddTtaRequestButton label="Add request" to="/tta-requests/new" />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Add request' })).toHaveAttribute(
      'href',
      '/tta-requests/new'
    );
  });
});
