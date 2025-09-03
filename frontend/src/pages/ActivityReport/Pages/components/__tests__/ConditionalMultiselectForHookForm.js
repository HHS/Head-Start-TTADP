import '@testing-library/jest-dom';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import {
  FormProvider, useForm,
} from 'react-hook-form';
import ConditionalMultiselectForHookForm from '../ConditionalMultiselectForHookForm';

describe('ConditionalMultiselectForHookForm', () => {
  let setError;

  // eslint-disable-next-line react/prop-types
  const Rt = ({ userCanEdit = true, defaultValue = [], value = ['run', 'test'] }) => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {
        testField: value,
      },
    });

    setError = hookForm.setError;

    const fieldData = {
      prompt: 'answer my riddle',
      hint: 'hint',
      options: [
        'test',
        'run',
        'default',
      ],
      title: 'Riddle',
      type: 'multiselect',
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
          <ConditionalMultiselectForHookForm
            fieldData={fieldData}
            validations={validations}
            fieldName="testField"
            defaultValue={defaultValue}
            userCanEdit={userCanEdit}
          />
        </FormProvider>
      </div>
    );
  };

  it('renders the prompt if editable', () => {
    render(<Rt />);
    expect(screen.getByText('answer my riddle')).toBeInTheDocument();
    // Ensure we render the selected options.
    expect(screen.getByText('run')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders a prompt with errors', async () => {
    render(<Rt />);
    expect(screen.getByText('answer my riddle')).toBeInTheDocument();

    setError('testField', { message: 'too many' });
    await waitFor(() => expect(screen.getByText('too many')).toBeInTheDocument());
  });

  it('renders the prompt if read only', () => {
    render(<Rt userCanEdit={false} />);
    expect(screen.getByText('Riddle')).toBeInTheDocument();
  });

  it('renders the default value when the field value is null', () => {
    render(<Rt defaultValue={['default']} value={null} />);
    expect(screen.getByText('default')).toBeInTheDocument();
  });
});
