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
    isMultiRecipientReport = false,
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
            isMultiRecipientReport={isMultiRecipientReport}
          />
        </FormProvider>
      </div>
    );
  };

  it('renders the prompt', () => {
    render(<Rt />);
    expect(screen.getByText('answer my riddle')).toBeInTheDocument();
  });

  it('renders only the caution if a multirecipient report', () => {
    render(<Rt isMultiRecipientReport />);
    expect(screen.queryByText('riddle')).toBeNull();
    expect(screen.getByText('be careful')).toBeInTheDocument();
  });

  it('renders nothing if a multirecipient report and no caution', () => {
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
    render(<Rt isMultiRecipientReport prompts={prompts} />);
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
