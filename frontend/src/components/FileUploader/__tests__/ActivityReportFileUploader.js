import '@testing-library/jest-dom';
import React from 'react';
import {
  render, fireEvent, waitFor, act, screen,
} from '@testing-library/react';
import FileRejections from '../FileRejections';

import ActivityReportFileUploader from '../ActivityReportFileUploader';

describe('ActivityReportFileUploader', () => {
  const dispatchEvt = (node, type, data) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, data);
    fireEvent(node, event);
  };

  const flushPromises = async (rerender, ui) => {
    await act(() => waitFor(() => rerender(ui)));
  };

  const mockData = (files) => ({
    dataTransfer: {
      files,
      items: files.map((file) => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
      types: ['Files'],
    },
  });

  const file = (name, id) => ({
    originalFileName: name, id, fileSize: 2000, status: 'Uploaded',
  });

  it('onDrop adds calls the onChange method', async () => {
    const mockOnChange = jest.fn();
    const data = mockData([file('file', 1)]);
    const ui = <ActivityReportFileUploader reportId="3" id="attachment" onChange={mockOnChange} files={[]} />;
    const { container, rerender } = render(ui);
    const dropzone = container.querySelector('div');

    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, ui);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('checks that onDrop does not run if reportId is new', async () => {
    const mockOnChange = jest.fn();
    const data = mockData([file('file')]);
    const ui = <ActivityReportFileUploader reportId="new" id="attachment" onChange={mockOnChange} files={[]} />;
    const { container, rerender } = render(ui);
    const dropzone = container.querySelector('div');

    await dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, ui);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('files are properly displayed', () => {
    render(<ActivityReportFileUploader reportId="new" id="attachment" onChange={() => { }} files={[file('fileOne', 1), file('fileTwo', 2)]} />);
    expect(screen.getByText('fileOne')).toBeVisible();
    expect(screen.getByText('fileTwo')).toBeVisible();
  });

  it('files can be removed', () => {
    const mockOnChange = jest.fn();
    render(<ActivityReportFileUploader reportId="new" id="attachment" onChange={mockOnChange} files={[{ id: 1, originalFileName: 'fileOne' }, { id: 2, originalFileName: 'fileTwo' }]} />);
    const fileTwo = screen.getByText('fileTwo');
    fireEvent.click(fileTwo.parentNode.lastChild.firstChild);
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    expect(mockOnChange).toHaveBeenCalledWith([{ id: 1, originalFileName: 'fileOne' }]);
  });
  it('files are not removed if cancel is pressed', () => {
    const mockOnChange = jest.fn();
    render(<ActivityReportFileUploader reportId="new" id="attachment" onChange={mockOnChange} files={[{ id: 1, originalFileName: 'fileOne' }, { id: 2, originalFileName: 'fileTwo' }]} />);
    const fileTwo = screen.getByText('fileTwo');
    fireEvent.click(fileTwo.parentNode.lastChild.firstChild);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  describe('file rejections', () => {
    it('render rejections', () => {
      const rejectionList = [
        {
          file: {
            path: 'File Rejection 1',
          },
          errors: [
            {
              code: 'file-too-large',
              message: 'File Size Rejection Message',
            },
            {
              code: 'file-type-not-supported',
              message: 'File type not supported',
            },
          ],
        },
        {
          file: {
            path: 'File Rejection 2',
          },
          errors: [
            {
              code: 'file-corrupted',
              message: 'File is incomplete',
            },
          ],
        },
      ];

      render(<FileRejections fileRejections={rejectionList} />);
      expect(screen.getByText(/file rejection 1/i)).toBeVisible();
      expect(screen.getByText(/file is larger than 30 mb/i)).toBeVisible();
      expect(screen.getByText(/file type not supported/i)).toBeVisible();

      expect(screen.getByText(/file rejection 2/i)).toBeVisible();
      expect(screen.getByText(/file is incomplete/i)).toBeVisible();
    });
  });
});
