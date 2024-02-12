import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import RTRGoalSource from '../RTRGoalSource';
import FormFieldThatIsSometimesReadOnly from '../FormFieldThatIsSometimesReadOnly';

describe('RTRGoalSource', () => {
  const source = {
    1234: '',
    5678: '',
    91011: '',
  };
  const setSource = jest.fn();
  const error = <></>;
  const isOnApprovedReport = false;
  const status = 'Not Started';
  const userCanEdit = true;
  const validateGoalSource = jest.fn();
  const isCurated = false;
  const createdVia = 'activityReport';

  it('should render the component', async () => {
    const { getByLabelText } = render(
      <FormFieldThatIsSometimesReadOnly
        label="Goal source"
        value={source}
        permissions={[true]}
      >
        <RTRGoalSource
          source={source}
          onChangeGoalSource={setSource}
          error={error}
          isOnApprovedReport={isOnApprovedReport}
          status={status}
          userCanEdit={userCanEdit}
          validateGoalSource={validateGoalSource}
          isCurated={isCurated}
          createdVia={createdVia}
          selectedGrants={[{
            id: 1,
            numberWithProgramTypes: '1234',
          }, {
            id: 2,
            numberWithProgramTypes: '5678',
          }, {
            id: 3,
            numberWithProgramTypes: '91011',
          }]}
        />
      </FormFieldThatIsSometimesReadOnly>,
    );

    expect(getByLabelText(/Do all recipient grants have the same source/i)).toBeInTheDocument();
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
  });

  it('should update sources individually', async () => {
    const { getByLabelText } = render(
      <FormFieldThatIsSometimesReadOnly
        label="Goal source"
        value={source}
        permissions={[true]}
      >
        <RTRGoalSource
          source={source}
          onChangeGoalSource={setSource}
          error={error}
          isOnApprovedReport={isOnApprovedReport}
          status={status}
          userCanEdit={userCanEdit}
          validateGoalSource={validateGoalSource}
          isCurated={isCurated}
          createdVia={createdVia}
          selectedGrants={[{
            id: 1,
            numberWithProgramTypes: '1234',
          }, {
            id: 2,
            numberWithProgramTypes: '5678',
          }, {
            id: 3,
            numberWithProgramTypes: '91011',
          }]}
        />
      </FormFieldThatIsSometimesReadOnly>,
    );

    act(() => {
      userEvent.click(getByLabelText('No'));
    });

    const dropdowns = await screen.findAllByRole('combobox');
    expect(dropdowns).toHaveLength(3);

    const [dropdown] = dropdowns;
    userEvent.selectOptions(dropdown, 'Training event follow-up');

    expect(setSource).toHaveBeenCalledWith({
      1234: 'Training event follow-up',
      5678: '',
      91011: '',
    });
  });

  it('Updates all sources at once', async () => {
    render(
      <FormFieldThatIsSometimesReadOnly
        label="Goal source"
        value={source}
        permissions={[true]}
      >
        <RTRGoalSource
          source={source}
          onChangeGoalSource={setSource}
          error={error}
          isOnApprovedReport={isOnApprovedReport}
          status={status}
          userCanEdit={userCanEdit}
          validateGoalSource={validateGoalSource}
          isCurated={isCurated}
          createdVia={createdVia}
          selectedGrants={[{
            id: 1,
            numberWithProgramTypes: '1234',
          }, {
            id: 2,
            numberWithProgramTypes: '5678',
          }, {
            id: 3,
            numberWithProgramTypes: '91011',
          }]}
        />
      </FormFieldThatIsSometimesReadOnly>,
    );

    const dropdown = await screen.findByRole('combobox');

    userEvent.selectOptions(dropdown, 'Training event follow-up');

    expect(setSource).toHaveBeenCalledWith({
      1234: 'Training event follow-up',
      5678: 'Training event follow-up',
      91011: 'Training event follow-up',
    });
  });
});
