import '@testing-library/jest-dom';
import React from 'react';
import {
  render, fireEvent, waitFor, act, screen,
} from '@testing-library/react';
import * as fileFetcher from '../../fetchers/File';
import FileUploader, { getStatus, upload } from '../FileUploader';

describe('getStatus tests', () => {
  it('returns the correct statuses', () => {
    let newStatus;
    newStatus = getStatus('UPLOADING');
    expect(newStatus).toBe('Uploading');
    newStatus = getStatus('UPLOADED');
    expect(newStatus).toBe('Uploaded');
    newStatus = getStatus('UPLOAD_FAILED');
    expect(newStatus).toBe('Upload Failed');
    newStatus = getStatus('QUEUEING_FAILED');
    expect(newStatus).toBe('Upload Failed');
    newStatus = getStatus('SCANNING_QUEUED');
    expect(newStatus).toBe('Scanning');
    newStatus = getStatus('SCANNING');
    expect(newStatus).toBe('Scanning');
    newStatus = getStatus('APPROVED');
    expect(newStatus).toBe('Approved');
    newStatus = getStatus('REJECTED');
    expect(newStatus).toBe('Rejected');
  });
});

describe('upload tests', () => {
  const mockFile = { name: 'MockFile', size: 2000 };
  const mockSetErrorMessage = jest.fn();
  it('can upload a file and return the correct information', async () => {
    const mockFileUpload = jest.spyOn(fileFetcher, 'uploadFile').mockImplementation(async () => ({ id: 1 }));
    const got = await upload(mockFile, 1, 'fakeAttachment', mockSetErrorMessage);
    expect(got).toStrictEqual({
      id: 1, originalFileName: mockFile.name, fileSize: mockFile.size, status: 'UPLOADED',
    });
    expect(mockFileUpload).toHaveBeenCalled();
    expect(mockSetErrorMessage).toHaveBeenCalledWith(null);
  });
});

describe('FileUploader', () => {
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
    const ui = <FileUploader reportId="3" id="attachment" onChange={mockOnChange} files={[]} />;
    const { container, rerender } = render(ui);
    const dropzone = container.querySelector('div');

    await dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, ui);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('checks that onDrop does not run if reportId is new', async () => {
    const mockOnChange = jest.fn();
    const data = mockData([file('file')]);
    const ui = <FileUploader reportId="new" id="attachment" onChange={mockOnChange} files={[]} />;
    const { container, rerender } = render(ui);
    const dropzone = container.querySelector('div');

    await dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, ui);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('files are properly displayed', () => {
    render(<FileUploader reportId="new" id="attachment" onChange={() => {}} files={[file('fileOne', 1), file('fileTwo', 2)]} />);
    expect(screen.getByText('fileOne')).toBeVisible();
    expect(screen.getByText('fileTwo')).toBeVisible();
  });

  it('files can be removed', () => {
    const mockOnChange = jest.fn();
    render(<FileUploader reportId="new" id="attachment" onChange={mockOnChange} files={[{ id: 1, originalFileName: 'fileOne' }, { id: 2, originalFileName: 'fileTwo' }]} />);
    const fileTwo = screen.getByText('fileTwo');
    fireEvent.click(fileTwo.parentNode.lastChild.firstChild);
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    expect(mockOnChange).toHaveBeenCalledWith([{ id: 1, originalFileName: 'fileOne' }]);
  });
  it('files are not removed if cancel is pressed', () => {
    const mockOnChange = jest.fn();
    render(<FileUploader reportId="new" id="attachment" onChange={mockOnChange} files={[{ id: 1, originalFileName: 'fileOne' }, { id: 2, originalFileName: 'fileTwo' }]} />);
    const fileTwo = screen.getByText('fileTwo');
    fireEvent.click(fileTwo.parentNode.lastChild.firstChild);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
