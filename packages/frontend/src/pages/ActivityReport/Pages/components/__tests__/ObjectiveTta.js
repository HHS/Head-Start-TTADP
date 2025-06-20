/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen,
} from '@testing-library/react';
import React from 'react';
import ObjectiveTta from '../ObjectiveTta';

describe('ObjectiveTta', () => {
  const renderTta = (ttaProvided = '<p>What a wondrous amount of TTA that was provided</p>', isOnApprovedReport = true) => {
    render(<ObjectiveTta
      ttaProvided={ttaProvided}
      onChangeTTA={jest.fn()}
      isOnApprovedReport={isOnApprovedReport}
      error={<></>}
      validateTta={jest.fn()}
      inputName="objectiveTta"
    />);
  };

  it('correctly renders as read only', async () => {
    renderTta();
    expect(document.querySelector('[contenteditable="false"')).toBeTruthy();
  });

  it('handles a null tta provided value', async () => {
    renderTta(null);
    expect(document.querySelector('[contenteditable="false"')).toBeTruthy();
    expect(await screen.findByText(/TTA provided/i)).toBeVisible();
  });
});
