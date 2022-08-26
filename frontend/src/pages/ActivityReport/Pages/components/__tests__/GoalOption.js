/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import GoalOption from '../GoalOption';

describe('GoalOption', () => {
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

  const renderGoalOption = (data) => {
    const props = {
      ...defaultProps,
      data,
    };

    // eslint-disable-next-line react/jsx-props-no-spreading
    return render(<GoalOption {...props} />);
  };

  it('displays a bold option when appropriate', async () => {
    const data = {
      goalIds: [1, 2, 3],
    };
    renderGoalOption(data);
    expect(document.querySelector('strong')).toBeTruthy();
  });

  it('with no number, is not bold', async () => {
    const data = {};
    renderGoalOption(data);
    expect(document.querySelector('strong')).toBeFalsy();
  });
});
