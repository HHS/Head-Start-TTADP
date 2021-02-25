import '@testing-library/jest-dom';
import React from 'react';
import {
  render, fireEvent, waitFor, act, screen,
} from '@testing-library/react';
import * as fileFetcher from '../../fetchers/File';
import FileUploader, { getStatus } from '../FileUploader';

describe('FileUploader', () => {
  jest.spyOn(fileFetcher, 'default').mockImplementation(() => Promise.resolve());
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

  const file = (name) => ({ originalFileName: name, fileSize: 2000, status: 'Uploaded' });

  it('onDrop adds calls the onChange method', async () => {
    const mockOnChange = jest.fn();
    const data = mockData([file('file')]);
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
    render(<FileUploader reportId="new" id="attachment" onChange={() => {}} files={[file('fileOne'), file('fileTwo')]} />);
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
  describe('getStatus tests', () => {
    it('returns the correct statuses', () => {
      let got;
      got = getStatus('UPLOADING');
      expect(got).toBe('Uploading');
      got = getStatus('UPLOADED');
      expect(got).toBe('Uploaded');
      got = getStatus('UPLOAD_FAILED');
      expect(got).toBe('Upload Failed');
      got = getStatus('QUEUING_FAILED');
      expect(got).toBe('Upload Failed');
      got = getStatus('SCANNING_QUEUED');
      expect(got).toBe('Scanning');
      got = getStatus('SCANNING');
      expect(got).toBe('Scanning');
      got = getStatus('APPROVED');
      expect(got).toBe('Approved');
      got = getStatus('REJECTED');
      expect(got).toBe('Rejected');
    });
  });
});
