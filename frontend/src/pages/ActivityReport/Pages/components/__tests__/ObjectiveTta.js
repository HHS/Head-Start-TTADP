/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ERROR_FORMAT, NO_ERROR } from '../constants';
import ObjectiveTta from '../ObjectiveTta';

describe('ObjectiveTta', () => {
  const renderTta = (
    ttaProvided = '<p>What a wondrous amount of TTA that was provided</p>',
    isOnApprovedReport = true,
    error = NO_ERROR
  ) => {
    render(
      <ObjectiveTta
        ttaProvided={ttaProvided}
        onChangeTTA={jest.fn()}
        isOnApprovedReport={isOnApprovedReport}
        error={error}
        validateTta={jest.fn()}
        inputName="objectiveTta"
      />
    );
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

  it('exposes the editable field with the visible label as its accessible name', () => {
    renderTta('<p>editing</p>', false);
    expect(screen.getByLabelText('TTA provided')).toBeInTheDocument();
  });

  it('wires the error message to the field via id when invalid', () => {
    renderTta('', false, ERROR_FORMAT('This field is required'));
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toHaveAttribute('id', 'objectiveTta-error');
  });

  it('does not render an error message id when valid', () => {
    renderTta('<p>editing</p>', false, NO_ERROR);
    expect(document.getElementById('objectiveTta-error')).toBeNull();
  });
});
