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
        { originalFileName: 'TestFile1.txt', id: 1 },
        { originalFileName: 'TestFile2.txt', id: 2 },
      ]}
      onChangeFiles={jest.fn()}
      objective={{ id: 1 }}
      isOnApprovedReport
      isOnReport
      status="Completed"
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
      goalStatus="Closed"
      onUploadFiles={jest.fn()}
    />);
    expect(await screen.findByText('Resource files')).toBeVisible();
    expect(screen.getByText(/testfile1\.txt/i)).toBeVisible();
    expect(screen.getByText(/testfile2\.txt/i)).toBeVisible();
  });

  it('shows files in not read only mode', async () => {
    render(<ObjectiveFiles
      files={[
        { originalFileName: 'TestFile1.txt', id: 1 },
        { originalFileName: 'TestFile2.txt', id: 2 },
      ]}
      onChangeFiles={jest.fn()}
      objective={{ id: 1 }}
      isOnApprovedReport={false}
      isOnReport={false}
      status="Draft"
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
      onUploadFiles={jest.fn()}
      goalStatus="In Progress"
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
      onUploadFiles={jest.fn()}
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
      isOnApprovedReport={false}
      status="Draft"
      goalStatus="In Progress"
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

  it('hides the file toggle if files can\'t be deleted', async () => {
    render(<ObjectiveFiles
      files={[{
        id: 1,
        originalFileName: 'TestFile1.txt',
        onAnyReport: true,
      }]}
      onChangeFiles={jest.fn()}
      objective={{ id: 1 }}
      isOnReport
      onUploadFiles={jest.fn()}
      index={0}
      inputName="objectiveFiles"
      onBlur={jest.fn()}
      isOnApprovedReport={false}
      status="Draft"
      goalStatus="In Progress"
    />);
    expect(screen.queryByRole('radio', { name: /yes/i })).not.toBeInTheDocument();
  });
});
