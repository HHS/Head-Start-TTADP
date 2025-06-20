/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import { TextInput } from '@trussworks/react-uswds';
import ObjectiveFormItem from '../ObjectiveFormItem';

const RenderObjectiveFormItem = ({
  // eslint-disable-next-line react/prop-types
  isValid, formItemValue, onChange = () => { },
}) => (
  <ObjectiveFormItem
    showErrors={!isValid}
    className="margin-top-0"
    message="objective form item required"
    label="Objective"
    value={formItemValue}
  >
    <TextInput
      name="text-input-name"
      aria-label="text-input-label"
      onChange={onChange}
      value={formItemValue}
    />
  </ObjectiveFormItem>
);

describe('ObjectiveFormItem', () => {
  it('renders correctly', async () => {
    const onChange = jest.fn();
    render(<RenderObjectiveFormItem isValid formItemValue="some value" onChange={onChange} />);
    const save = await screen.findByText('Objective');
    expect(save).toBeVisible();
    const errorMessage = screen.queryByText('objective form item required');
    expect(errorMessage).toBeNull();
  });

  it('renders with required message', async () => {
    const onChange = jest.fn();
    render(<RenderObjectiveFormItem isValid={false} formItemValue="" onChange={onChange} />);
    const save = await screen.findByText('Objective');
    expect(save).toBeVisible();
    const errorMessage = await screen.findByText('objective form item required');
    expect(errorMessage).toBeVisible();
  });
});
