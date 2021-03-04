import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import nextSteps from '../nextSteps';

const renderNextSteps = () => {
  render(nextSteps.render())
};

describe('next steps', () => {
  it('displays the next steps header', async () => {
    renderNextSteps();
    expect(await screen.findByText('Next Steps')).toBeVisible();
  });
});
