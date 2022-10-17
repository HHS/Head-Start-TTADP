import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import URLInput from '../URLInput';

describe('URLInput', () => {
  const renderUrlInput = (onChange) => {
    render(
      <div>
        <URLInput
          id="input"
          value=""
          onChange={onChange}
          onBlur={jest.fn()}
        />
        <button type="button">Test</button>
      </div>,
    );
  };

  it('validates correctly', () => {
    const testStrings = [
      { string: 'https://test.com', valid: true },
      { string: 'https://www.test.com', valid: true },
      { string: 'http://www.test.com', valid: true },
      { string: 'http://test.com', valid: true },

      { string: 'http://test.', valid: false },
      { string: 'file://test.com', valid: false },
      { string: 'http://test', valid: false },
    //   { string: 'https://test', valid: false },
    ];
    const onChange = jest.fn();
    renderUrlInput(onChange);

    testStrings.forEach((testString) => {
      const input = screen.getByRole('textbox');
      userEvent.clear(input);
      userEvent.type(input, testString.string);
      userEvent.tab();
      console.log(testString.string);
      expect(input.validity.valid).toBe(testString.valid);
    });
  });
});
