/* eslint-disable react/prop-types */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import Approve from '../Approve';

jest.mock('../../../../components/HookFormRichEditor', () => function MockHookFormRichEditor({ id, name, ariaLabel }) {
  return <textarea id={id} name={name} aria-label={ariaLabel} data-testid="rich-editor" />;
});

jest.mock('../../../../components/ReadOnlyEditor', () => function MockReadOnlyEditor({ value, ariaLabel }) {
  return <textarea readOnly defaultValue={value || ''} aria-label={ariaLabel} data-testid="readonly-editor" />;
});

const FormWrapper = ({ defaultValues }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Approve
        reviewItems={[]}
        pages={[]}
        isPoc={false}
        onFormReview={jest.fn()}
        isApprover={false}
        isAdmin={false}
        approver={{}}
        author={{}}
        isSubmitted={false}
        onUpdatePage={jest.fn()}
        onSaveDraft={jest.fn()}
        onSubmit={jest.fn()}
        isNeedsAction={false}
        reviewSubmitPagePosition={4}
      />
    </FormProvider>
  );
};

describe('Approve', () => {
  it('renders with missing approver name', async () => {
    const mockOnSubmit = jest.fn();
    const defaultValues = {
      additionalNotes: '<p>These are the creator notes with <strong>bold text</strong>.</p>',
      managerNotes: 'Please update the report with more details.',
      approver: null,
      status: 'Needs Action',
    };

    act(() => {
      render(<FormWrapper defaultValues={defaultValues} onSubmit={mockOnSubmit} />);
    });

    expect(await screen.findByTestId('session-form-approver')).toBeVisible();
    expect(screen.getByText('Add manager notes')).toBeVisible();

    const readOnlyEditor = screen.getByTestId('readonly-editor');
    expect(readOnlyEditor).toBeVisible();
    expect(readOnlyEditor).toHaveAttribute('aria-label', 'Creator notes');

    const richEditor = screen.getByTestId('rich-editor');
    expect(richEditor).toHaveAttribute('aria-label', 'Add manager notes');
    expect(richEditor).toHaveAttribute('name', 'managerNotes');
  });
});
