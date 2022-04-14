/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render,
  screen,
  fireEvent,
} from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import NextStepsRepeater from '../NextStepsRepeater';

const RenderNextStepsRepeater = ({
  nextSteps,
  setNextSteps = () => {},
}) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <>
    <NextStepsRepeater
      nextSteps={nextSteps}
      setNextSteps={setNextSteps}
    />
  </>
);

describe('Next Steps Repeater', () => {
  it('renders next steps', async () => {
    const nextSteps = [
      { key: 'key 1', value: 'First step.' },
      { key: 'key 2', value: 'Second step.' },
      { key: 'key 3', value: 'Third step.' },
    ];
    render(<RenderNextStepsRepeater nextSteps={nextSteps} />);

    expect(await screen.findByDisplayValue(/first step./i)).toBeVisible();
    expect(await screen.findByRole('button', { name: /remove step 1/i })).toBeVisible();

    expect(await screen.findByDisplayValue(/second step./i)).toBeVisible();
    expect(await screen.findByRole('button', { name: /remove step 2/i })).toBeVisible();

    expect(await screen.findByDisplayValue(/third step./i)).toBeVisible();
    expect(await screen.findByRole('button', { name: /remove step 3/i })).toBeVisible();

    expect(await screen.findByRole('button', { name: /add next step/i })).toBeVisible();
  });

  it('calls add step', async () => {
    const nextSteps = [];
    const setNextSteps = jest.fn();
    render(<RenderNextStepsRepeater nextSteps={nextSteps} setNextSteps={setNextSteps} />);

    const addNewStep = await screen.findByRole('button', { name: /add next step/i });
    userEvent.click(addNewStep);
    expect(setNextSteps).toHaveBeenCalled();
  });

  it('calls removes step', async () => {
    const nextSteps = [
      { key: 'key 1', value: 'First step.' },
      { key: 'key 2', value: 'Second step.' },
    ];
    const removeStep = jest.fn();
    render(<RenderNextStepsRepeater nextSteps={nextSteps} setNextSteps={removeStep} />);

    const addNewStep = await screen.findByRole('button', { name: /remove step 1/i });
    userEvent.click(addNewStep);
    expect(removeStep).toHaveBeenCalledWith([{ key: 'key 2', value: 'Second step.' }]);
  });

  it('calls update step', async () => {
    const nextSteps = [
      { key: 'key 1', value: 'First step.' },
    ];
    const updateStep = jest.fn();
    render(<RenderNextStepsRepeater nextSteps={nextSteps} setNextSteps={updateStep} />);

    const stepTextBox = await screen.findByRole('textbox', { name: /next step 1/i });
    fireEvent.change(stepTextBox, { target: { value: 'This is my updated step.' } });

    expect(updateStep).toHaveBeenCalledWith([{ key: 'key 1', value: 'This is my updated step.' }]);
  });
});
