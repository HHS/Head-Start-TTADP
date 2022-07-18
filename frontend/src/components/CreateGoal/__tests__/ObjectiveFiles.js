import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';
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
    expect(screen.getByText(/testfile1\.txt, testfile2\.txt/i)).toBeVisible();
  });

  it('hides and shows file upload', async () => {
    render(<ObjectiveFiles
      files={[]}
      onChangeFiles={jest.fn()}
      objectiveId={1}
      isOnApprovedReport={false}
      status="Draft"
    />);
    let radio = screen.getByRole('radio', { name: /yes/i });
    userEvent.click(radio);
    const attachResources = await screen.findByText('Attach any available non-link resources');
    expect(attachResources).toBeVisible();
    const uploadBtn = screen.getByRole('button', { name: /select and upload/i });
    expect(uploadBtn).toBeVisible();

    radio = screen.getByRole('radio', { name: /no/i });
    userEvent.click(radio);
    expect(uploadBtn).not.toBeVisible();
  });
});
