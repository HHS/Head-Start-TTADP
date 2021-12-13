import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import useSpellCheck from '../useSpellCheck';

const SpellCheckTest = (inputId) => {
  useSpellCheck(inputId);
  return (
    <>
      <h2>Test heading</h2>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
      <label htmlFor="input">Test label</label>
      <input id="input" type="text" />
    </>
  );
};

const renderSpellCheckTest = (inputId) => render(<SpellCheckTest inputId={inputId} />);

describe('useSpellCheck', () => {
  it('fails gracefully', async () => {
    renderSpellCheckTest('asdf');

    expect(await screen.findByRole('textbox', { name: /Test label/i })).toBeVisible();
    expect(await screen.findByRole('heading', { name: /Test heading/i })).toBeVisible();
  });
});
