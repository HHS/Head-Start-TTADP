/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import ObjectiveOption from '../ObjectiveOption';

describe('ObjectiveOption', () => {
  const defaultProps = {
    children: 'This is an option',
    className: '',
    cx: jest.fn(),
    getStyles: jest.fn(),
    isDisabled: false,
    isFocused: false,
    innerRef: {
      current: '',
    },
    innerProps: {},
  };

  const renderObjectiveOption = (data) => {
    const props = {
      ...defaultProps,
      data,
    };

    // eslint-disable-next-line react/jsx-props-no-spreading
    return render(<ObjectiveOption {...props} />);
  };

  it('displays a bold option when appropriate', async () => {
    const data = {
      ids: [1, 2, 3],
    };
    renderObjectiveOption(data);
    expect(document.querySelector('strong')).toBeTruthy();
  });

  it('with no number, is not bold', async () => {
    const data = {};
    renderObjectiveOption(data);
    expect(document.querySelector('strong')).toBeFalsy();
  });
});
