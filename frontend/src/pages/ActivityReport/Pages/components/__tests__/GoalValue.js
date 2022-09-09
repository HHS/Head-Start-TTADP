/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render, screen,
} from '@testing-library/react';
import React from 'react';
import GoalValue from '../GoalValue';

describe('GoalValue', () => {
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

  const renderGoalValue = (data, passedProps = null) => {
    const props = passedProps ? { ...passedProps, data }
      : {
        ...defaultProps,
        data,
      };

    // eslint-disable-next-line react/jsx-props-no-spreading
    return render(<GoalValue {...props} />);
  };

  it('displays a bold option when appropriate', async () => {
    const data = {
      goalIds: [1, 2, 3],
    };
    renderGoalValue(data);
    expect(document.querySelector('strong')).toBeTruthy();
  });

  it('with no number, is not bold', async () => {
    const data = {};
    renderGoalValue(data);
    expect(document.querySelector('strong')).toBeFalsy();
  });

  it('displays label at data name', async () => {
    const data = {
      name: 'sample name label',
      goalIds: [1, 2, 3],
    };
    renderGoalValue(data, { ...defaultProps, children: null });
    expect(await screen.findByText(/sample name label/i)).toBeVisible();
  });
});
