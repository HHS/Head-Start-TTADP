/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import SingleRecipientSelect from '../SingleRecipientSelect';

describe('SingleRecipientSelect', () => {
  const mockPossibleRecipients = [
    {
      id: 100,
      label: 'Recipient 1',
      options: [
        {
          value: 1,
          label: 'Recipient 1 - Grant 1',
          recipientIdForLookUp: 100,
        },
        {
          value: 2,
          label: 'Recipient 1 - Grant 2',
          recipientIdForLookUp: 100,
        },
      ],
    },
    {
      id: 200,
      label: 'Recipient 2',
      options: [
        {
          value: 3,
          label: 'Recipient 2 - Grant 1',
          recipientIdForLookUp: 200,
        },
        {
          value: 4,
          label: 'Recipient 2 - Grant 2',
          recipientIdForLookUp: 200,
        },
      ],
    },
    {
      id: 300,
      label: 'Recipient 3',
      options: [
        {
          value: 5,
          label: 'Recipient 3 - Single Grant',
          recipientIdForLookUp: 300,
        },
      ],
    },
  ];

  const RenderTest = ({ selectedRecipients = [], onChangeActivityRecipients = jest.fn() }) => {
    const hookForm = useForm();

    return (
      <FormProvider {...hookForm}>
        <SingleRecipientSelect
          selectedRecipients={selectedRecipients}
          possibleRecipients={mockPossibleRecipients}
          onChangeActivityRecipients={onChangeActivityRecipients}
        />
      </FormProvider>
    );
  };

  it('renders correctly with default props', () => {
    render(<RenderTest />);
    expect(screen.getByText('Recipient')).toBeInTheDocument();
  });

  it('populates the dropdown with the correct recipient options', async () => {
    render(<RenderTest />);

    const selectElement = screen.getByRole('combobox');
    userEvent.click(selectElement);

    expect(screen.getByText('Recipient 1')).toBeInTheDocument();
    expect(screen.getByText('Recipient 2')).toBeInTheDocument();
    expect(screen.getByText('Recipient 3')).toBeInTheDocument();
  });

  it('displays grants when a recipient is selected', async () => {
    const onChangeActivityRecipients = jest.fn();

    render(<RenderTest onChangeActivityRecipients={onChangeActivityRecipients} />);

    // Select a recipient
    const selectElement = screen.getByRole('combobox');
    userEvent.click(selectElement);
    userEvent.click(screen.getByText('Recipient 1'));

    // Check that the grants section appears
    expect(screen.getByTestId('recipient-grants-label')).toBeInTheDocument();
    expect(screen.getByText('Recipient 1 - Grant 1')).toBeInTheDocument();
    expect(screen.getByText('Recipient 1 - Grant 2')).toBeInTheDocument();
  });

  it('calls onChangeActivityRecipients when grants are selected', async () => {
    const onChangeActivityRecipients = jest.fn();

    render(<RenderTest onChangeActivityRecipients={onChangeActivityRecipients} />);

    // Select a recipient
    const selectElement = screen.getByRole('combobox');
    userEvent.click(selectElement);
    userEvent.click(screen.getByText('Recipient 1'));

    // Select a grant
    const grant1Checkbox = screen.getByLabelText('Select grant Recipient 1 - Grant 1');
    userEvent.click(grant1Checkbox);

    // Check that onChangeActivityRecipients was called with the correct data
    expect(onChangeActivityRecipients).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Recipient 1 - Grant 1',
        activityRecipientId: 1,
        recipientIdForLookUp: 100,
      }),
    ]);
    // Select a second grant
    const grant2Checkbox = screen.getByLabelText('Select grant Recipient 1 - Grant 2');
    userEvent.click(grant2Checkbox);

    // Check that onChangeActivityRecipients was called with both grants
    expect(onChangeActivityRecipients).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Recipient 1 - Grant 1',
          activityRecipientId: 1,
          recipientIdForLookUp: 100,
        }),
        expect.objectContaining({
          name: 'Recipient 1 - Grant 2',
          activityRecipientId: 2,
          recipientIdForLookUp: 100,
        }),
      ]),
    );
  });

  it('automatically selects the grant when a recipient with a single grant is chosen', async () => {
    const onChangeActivityRecipients = jest.fn();

    render(<RenderTest onChangeActivityRecipients={onChangeActivityRecipients} />);

    // Select a recipient with a single grant
    const selectElement = screen.getByRole('combobox');
    userEvent.click(selectElement);
    userEvent.click(screen.getByText('Recipient 3'));

    // Check that onChangeActivityRecipients was called automatically with the single grant
    expect(onChangeActivityRecipients).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Recipient 3 - Single Grant',
        activityRecipientId: 5,
        recipientIdForLookUp: 300,
      }),
    ]);

    // Verify the grants section is shown with the single grant
    expect(screen.getByTestId('read-only-label')).toBeInTheDocument();
    expect(screen.getByText('Recipient 3 - Single Grant')).toBeInTheDocument();
  });

  it('displays previously selected recipients and grants when provided', async () => {
    const selectedRecipients = [
      {
        recipientIdForLookUp: 100,
        activityRecipientId: 1,
        name: 'Recipient 1 - Grant 1',
      },
    ];

    render(<RenderTest selectedRecipients={selectedRecipients} />);

    // Check that the recipient is selected
    await waitFor(() => {
      expect(screen.getByText('Recipient 1')).toBeInTheDocument();
      expect(screen.getByTestId('recipient-grants-label')).toBeInTheDocument();
    });

    // Check that the grant is selected
    const grantCheckbox = screen.getByLabelText('Select grant Recipient 1 - Grant 1');
    expect(grantCheckbox).toBeChecked();
  });

  it('renders blank state when none of the selected recipients are in the possible recipients', async () => {
    const selectedRecipients = [
      {
        recipientIdForLookUp: 300,
        activityRecipientId: 123,
        name: 'Unknown Recipient',
      },
    ];
    render(<RenderTest selectedRecipients={selectedRecipients} />);

    // Ensure the recipent drop down has the placeholder text - Select - .
    const selectElement = screen.getByRole('combobox');
    // Assert select element is blank.
    expect(selectElement).toHaveTextContent('');
  });

  it('unselects grants when a grant is unchcked', async () => {
    const onChangeActivityRecipients = jest.fn();

    render(<RenderTest onChangeActivityRecipients={onChangeActivityRecipients} />);

    // Select a recipient
    const selectElement = screen.getByRole('combobox');
    userEvent.click(selectElement);
    userEvent.click(screen.getByText('Recipient 1'));

    // Select a grant
    const grant1Checkbox = screen.getByLabelText('Select grant Recipient 1 - Grant 1');
    userEvent.click(grant1Checkbox);

    // Unselect the grant
    userEvent.click(grant1Checkbox);

    // Check that onChangeActivityRecipients was called with an empty array
    expect(onChangeActivityRecipients).toHaveBeenCalledWith([]);
  });

  it('clears all selected grants when a different recipient is selected', async () => {
    const onChangeActivityRecipients = jest.fn();

    render(<RenderTest onChangeActivityRecipients={onChangeActivityRecipients} />);

    // Select a recipient
    const selectElement = screen.getByRole('combobox');
    userEvent.click(selectElement);
    userEvent.click(screen.getByText('Recipient 1'));

    // Select a grant
    const grant1Checkbox = screen.getByLabelText('Select grant Recipient 1 - Grant 1');
    userEvent.click(grant1Checkbox);

    // Change to a different recipient
    userEvent.click(selectElement);
    userEvent.click(screen.getByText('Recipient 2'));

    // Check that onChangeActivityRecipients was called with the new recipient and no grants
    expect(onChangeActivityRecipients).toHaveBeenCalledWith([]);
  });

  it('does not show grants when no recipient is selected', () => {
    render(<RenderTest />);

    // Check that the grants section is not displayed initially
    expect(screen.queryByTestId('recipient-grants-label')).not.toBeInTheDocument();
  });
});
