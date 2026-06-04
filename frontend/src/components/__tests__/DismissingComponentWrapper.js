import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import DismissingComponentWrapper from '../DismissingComponentWrapper';

describe('DismissingComponentWrapper', () => {
  const updateShown = jest.fn();

  const renderDismissingComponentWrapper = () => {
    render(
      <DismissingComponentWrapper
        shown
        timeVisibleInSec={10}
        hideFromScreenReader={false}
        updateShown={updateShown}
      >
        <h1>DismissingComponentWrapper</h1>
      </DismissingComponentWrapper>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('dismisses automatically', async () => {
    renderDismissingComponentWrapper();
    jest.runAllTimers();
    expect(updateShown).toHaveBeenCalledWith(false);
  });
});
