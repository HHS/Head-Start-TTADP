import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { OBJECTIVE_STATUS } from '../../../Constants';
import ObjectiveTitle from '../ObjectiveTitle';

describe('ObjectiveTitle', () => {
  it('shows the read only view', async () => {
    render(
      <ObjectiveTitle
        error={<></>}
        isOnApprovedReport
        isOnReport
        title="Objective title"
        validateObjectiveTitle={jest.fn()}
        onChangeTitle={jest.fn()}
        status={OBJECTIVE_STATUS.COMPLETE}
      />
    );

    expect(await screen.findByText('Objective title')).toBeVisible();
  });
});
