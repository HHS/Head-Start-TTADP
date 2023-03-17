import '@testing-library/jest-dom';
import {
  render, screen,
} from '@testing-library/react';
import selectEvent from 'react-select-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import ApproverSelect from '../ApproverSelect';
import FormItem from '../../../../../../../components/FormItem';

describe('ApproverSelect', () => {
  let getValues;

  const RenderApproverSelect = () => {
    const hookForm = useForm({
      mode: 'onBlur',
      defaultValues: {
      },
    });

    getValues = hookForm.getValues;

    return (
    // eslint-disable-next-line react/jsx-props-no-spreading
      <FormProvider {...hookForm}>
        <FormItem
          label="Approving manager"
          name="approvers"
        >
          <ApproverSelect
            name="approvers"
            options={[{ value: 1, label: 'Test' }, { value: 2, label: 'Test2' }, { value: 3, label: 'Test3' }]}
            labelProperty="name"
            valueProperty="id"
          />
        </FormItem>
      </FormProvider>
    );
  };

  it('passes the correct values to onChange', async () => {
    render(<RenderApproverSelect />);
    await selectEvent.select(screen.getByLabelText(/Approving manager/i), ['Test', 'Test2']);
    const approvers = getValues('approvers');
    expect(approvers).toHaveLength(2);
  });
});
