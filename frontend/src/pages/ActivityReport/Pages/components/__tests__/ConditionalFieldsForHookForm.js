/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import {
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import {
  FormProvider, useForm,
} from 'react-hook-form';
import ConditionalFieldsForHookForm from '../ConditionalFieldsForHookForm';

const DEFAULT_PROMPTS = [{
  fieldType: 'multiselect',
  type: 'multiselect',
  prompt: 'answer my riddle',
  hint: 'hint',
  options: [
    'test',
    'rest',
  ],
  response: [],
  caution: 'be careful',
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

describe('ConditionalFieldsForHookForm', () => {
  const Rt = ({
    prompts = DEFAULT_PROMPTS,
    defaultValues = {},
  }) => {
    const hookForm = useForm({
      mode: 'onChange',
      defaultValues,
    });

    return (
      <div>
        { /* eslint-disable-next-line react/jsx-props-no-spreading */ }
        <FormProvider {...hookForm}>
          <ConditionalFieldsForHookForm
            prompts={prompts}
            userCanEdit
          />
        </FormProvider>
      </div>
    );
  };

  it('renders the prompt', () => {
    render(<Rt />);
    expect(screen.getByText('answer my riddle')).toBeInTheDocument();
  });

  it('renders nothing if a multi recipient report and no caution', () => {
    const prompts = [{
      response: ['test', 'rest'],
      fieldType: 'multiselect',
      prompt: 'answer my riddle',
      hint: 'hint',
      options: [
        'test',
        'rest',
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
    render(<Rt prompts={prompts} />);
    expect(screen.queryByText('riddle')).toBeNull();
    expect(screen.queryByText('be careful')).toBeNull();
  });

  it('renders nothing if the type is not in the field type dictionary', () => {
    const prompts = [{
      response: ['test', 'rest'],
      fieldType: 'adsf',
      prompt: 'answer my riddle',
      hint: 'hint',
      options: [
        'test',
        'rest',
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
    render(<Rt prompts={prompts} />);
    expect(screen.queryByText('riddle')).toBeNull();
    expect(screen.queryByText('be careful')).toBeNull();
  });
});
