import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import {
  FormProvider, useForm,
} from 'react-hook-form/dist/index.ie11';
import ConditionalMultiselect from '../ConditionalMultiselect';

describe('ConditionalMultiselect', () => {
  // eslint-disable-next-line react/prop-types
  const Rt = ({ isEditable = true }) => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {
        testField: ['run'],
      },
    });

    const fieldData = {
      prompt: 'answer my riddle',
      hint: 'hint',
      options: [
        'test',
        'run',
      ],
      title: 'Riddle',
    };

    const validations = {
      rules: [{
        name: 'maxSelections',
        value: 2,
        message: 'too many',
      }, {
        name: 'unknownKey',
        value: 1,
      }],
      required: true,
    };

    return (
      <div>
        { /* eslint-disable-next-line react/jsx-props-no-spreading */ }
        <FormProvider {...hookForm}>
          <ConditionalMultiselect
            fieldData={fieldData}
            validations={validations}
            fieldName="testField"
            defaultValue={[]}
            isEditable={isEditable}
          />
        </FormProvider>
      </div>
    );
  };

  it('renders the prompt if editable', () => {
    render(<Rt />);
    expect(screen.getByText('answer my riddle')).toBeInTheDocument();
  });

  it('renders the prompt if read only', () => {
    render(<Rt isEditable={false} />);
    expect(screen.getByText('Riddle')).toBeInTheDocument();
  });
});
