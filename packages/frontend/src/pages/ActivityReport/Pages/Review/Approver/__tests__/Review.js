/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { useHistory } from 'react-router-dom';
import Review from '../Review';
import UserContext from '../../../../../../UserContext';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
}));

describe('Review component', () => {
  const RenderReview = ({ onResetToDraft = jest.fn, creatorIsApprover = false, calculatedStatus = 'draft' }) => {
    const hookForm = useForm({
      defaultValues: { name: [] },
      mode: 'all',
    });

    return (
      <FormProvider {...hookForm}>
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <Review
            onFormReview={jest.fn()}
            pages={[]}
            showDraftViewForApproverAndCreator={false}
            creatorIsApprover={creatorIsApprover}
            onResetToDraft={onResetToDraft}
            calculatedStatus={calculatedStatus}
            approverStatusList={[{ user: { id: 1 }, note: 'Test' }]}
          />
        </UserContext.Provider>
      </FormProvider>
    );
  };

  it('renders the component', () => {
    render(<RenderReview />);
    expect(screen.getByText('Review and approve report')).toBeInTheDocument();
  });

  it('calls onResetToDraft and redirects to /activity-reports when onReset is called', async () => {
    const onResetToDraft = jest.fn();
    const historyPush = jest.fn();
    useHistory.mockReturnValueOnce({
      push: historyPush,
    });

    render(<RenderReview
      calculatedStatus="submitted"
      creatorIsApprover
      onResetToDraft={onResetToDraft}
    />);
    fireEvent.click(screen.getByText('Reset to Draft'));

    expect(onResetToDraft).toHaveBeenCalled();
  });
  it('handles error to reset to draft', async () => {
    const onResetToDraft = jest.fn(() => {
      throw new Error('Error');
    });
    const historyPush = jest.fn();
    useHistory.mockReturnValueOnce({
      push: historyPush,
    });

    render(<RenderReview
      calculatedStatus="submitted"
      creatorIsApprover
      onResetToDraft={onResetToDraft}
    />);
    fireEvent.click(screen.getByText('Reset to Draft'));

    expect(onResetToDraft).toHaveBeenCalled();
  });
});
