import '@testing-library/jest-dom';
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
      objective={{ id: 1 }}
      isOnApprovedReport
      isOnReport
      status="Complete"
      onUploadFile={jest.fn()}
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
    />);
    expect(await screen.findByText('Resource files')).toBeVisible();
    expect(screen.getByText(/testfile1\.txt/i)).toBeVisible();
    expect(screen.getByText(/testfile2\.txt/i)).toBeVisible();
  });

  it('shows files in not read only mode', async () => {
    render(<ObjectiveFiles
      files={[
        { originalFileName: 'TestFile1.txt' },
        { originalFileName: 'TestFile2.txt' },
      ]}
      onChangeFiles={jest.fn()}
      objective={{ id: 1 }}
      isOnApprovedReport={false}
      isOnReport={false}
      status="Draft"
      onUploadFile={jest.fn()}
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
    />);
    expect(screen.getByText(/testfile1\.txt/i)).toBeVisible();
    expect(screen.getByText(/testfile2\.txt/i)).toBeVisible();
  });

  it('hides and shows file upload', async () => {
    render(<ObjectiveFiles
      files={[]}
      onChangeFiles={jest.fn()}
      objective={{ id: 1 }}
      isOnReport
      onUploadFile={jest.fn()}
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
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
