import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import PropTypes from 'prop-types';
import useSpellCheck from '../useSpellCheck';

const SpellCheckTest = ({ inputId }) => {
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

SpellCheckTest.propTypes = {
  inputId: PropTypes.string.isRequired,
};

const renderSpellCheckTest = (inputId) => render(<SpellCheckTest inputId={inputId} />);

describe('useSpellCheck', () => {
  it('adds the attribute', async () => {
    renderSpellCheckTest('input');
    const input = await screen.findByRole('textbox', { name: /Test label/i });
    expect(input).toBeVisible();
    expect(input).toHaveAttribute('spellcheck', 'true');
    expect(await screen.findByRole('heading', { name: /Test heading/i })).toBeVisible();
  });

  it('fails gracefully', async () => {
    renderSpellCheckTest('asdf');
    const input = await screen.findByRole('textbox', { name: /Test label/i });
    expect(input).toBeVisible();
    expect(input).not.toHaveAttribute('spellcheck', 'true');
    expect(await screen.findByRole('heading', { name: /Test heading/i })).toBeVisible();
  });
});
