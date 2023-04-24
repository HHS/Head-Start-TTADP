import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import {
  FormProvider, useForm,
} from 'react-hook-form/dist/index.ie11';
import ConditionalFields from '../ConditionalFields';

describe('ConditionalFields', () => {
  const Rt = () => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues: {},
    });

    const prompts = [{
      type: 'multiselect',
      prompt: 'answer my riddle',
      hint: 'hint',
      options: [
        'test',
      ],
      title: 'Riddle',
      validations: {
        rules: [{
          name: 'maxSelections',
          value: 2,
          message: 'too many',
        }, {
          name: 'unknownKey',
          value: 1,
        }],
        required: true,
      },
    }];

    return (
      <div>
        { /* eslint-disable-next-line react/jsx-props-no-spreading */ }
        <FormProvider {...hookForm}>
          <ConditionalFields
            prompts={prompts}
          />
        </FormProvider>
      </div>
    );
  };

  it('renders the prompt', () => {
    render(<Rt />);
    expect(screen.getByText('answer my riddle')).toBeInTheDocument();
  });
});
