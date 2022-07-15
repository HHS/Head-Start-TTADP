import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ObjectiveFiles from '../ObjectiveFiles';

describe('ObjectiveFiles', () => {
  it('shows the read only view', async () => {
    render(<ObjectiveFiles
      files={[
        { originalFileName: 'TestFile1.txt' },
        { originalFileName: 'TestFile2.txt' },
      ]}
      onChangeFiles={jest.fn()}
      objectiveId={1}
      isOnApprovedReport
      status="Complete"
    />);

    expect(await screen.findByText('Resources')).toBeVisible();
  });
});
