/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import {
  render, fireEvent, waitFor, act, screen,
} from '@testing-library/react';
import ObjectiveFileUploader from '../ObjectiveFileUploader';

describe('ObjectiveFileUploader', () => {
  beforeEach(async () => {
    fetchMock.post('/api/files/objectives', [{ objectiveIds: [] }]);
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  const dispatchEvt = (node, type, data) => {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, data);
    fireEvent(node, event);
  };

  const flushPromises = async (rerender, ui) => {
    await act(() => waitFor(() => rerender(ui)));
  };

  const RenderFileUploader = ({
    onChange, files, upload = jest.fn(), reportId = 0, objIds = [],
  }) => (
    <ObjectiveFileUploader
      onChange={onChange}
      files={files}
      objective={{ id: 1, ids: objIds }}
      id="id"
      upload={upload}
      index={0}
      inputName="inputName"
      onBlur={jest.fn()}
      setError={jest.fn()}
      reportId={reportId}
    />
  );

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

  const file = (name, id, status = 'Uploaded') => ({
    originalFileName: name, id, fileSize: 2000, status, lastModified: 123456,
  });

  it('onDrop adds calls the onChange method', async () => {
    const mockOnChange = jest.fn();
    const data = mockData([file('file', 1)]);
    const FileUploader = (
      <RenderFileUploader
        files={[]}
        onChange={mockOnChange}
      />
    );
    const { container, rerender } = render(FileUploader);
    const dropzone = container.querySelector('div');

    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, FileUploader);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('files are properly displayed and can be removed', async () => {
    const mockOnChange = jest.fn();
    render(<RenderFileUploader onChange={mockOnChange} files={[file('fileOne', 1, null), { ...file('fileTwo', 2), ObjectiveFile: { objectiveId: 1 } }, file('fileThree', 'abc')]} />);
    expect(screen.getByText('fileOne')).toBeVisible();
    expect(screen.getByText('fileTwo')).toBeVisible();
    expect(screen.getByText('Pending')).toBeVisible();
    fetchMock.delete('/api/files/2/objectives', { status: 204 });
    const fileTwo = screen.getByText('fileTwo');
    fireEvent.click(fileTwo.parentNode.lastChild.firstChild);
    let deleteButton = screen.getByText('Delete');
    act(() => {
      fireEvent.click(deleteButton);
    });
    expect(fetchMock.called()).toBe(true);
    await waitFor(() => expect(mockOnChange).toHaveBeenCalledWith([
      {
        id: 1, originalFileName: 'fileOne', fileSize: 2000, lastModified: 123456, status: null,
      },
      {
        id: 'abc', originalFileName: 'fileThree', fileSize: 2000, lastModified: 123456, status: 'Uploaded',
      },
    ]));
    const fileThree = screen.getByText('fileThree');
    fireEvent.click(fileThree.parentNode.lastChild.firstChild);
    deleteButton = screen.getByText('Delete');
    fetchMock.restore();
    fetchMock.delete('/api/files/abc', { status: 204 });
    act(() => {
      fireEvent.click(deleteButton);
    });
    expect(fetchMock.called()).toBeTruthy();
    await waitFor(() => expect(mockOnChange).toHaveBeenCalledTimes(2));
  });

  it('files are properly removed when on a report', async () => {
    const mockOnChange = jest.fn();
    render(<RenderFileUploader reportId={1} objIds={[1]} onChange={mockOnChange} files={[file('fileOne', 1, null), { ...file('fileTwo', 2), ObjectiveFile: { objectiveId: 1 } }]} />);
    expect(screen.getByText('fileOne')).toBeVisible();
    expect(screen.getByText('fileTwo')).toBeVisible();
    expect(screen.getByText('Pending')).toBeVisible();

    fetchMock.delete('/api/files/report/1/file/2', { status: 204 });
    const fileTwo = screen.getByText('fileTwo');
    fireEvent.click(fileTwo.parentNode.lastChild.firstChild);
    const deleteButton = screen.getByText('Delete');
    act(() => {
      fireEvent.click(deleteButton);
    });
    expect(fetchMock.called()).toBe(true);
    await waitFor(() => expect(mockOnChange).toHaveBeenCalledWith([
      {
        id: 1, originalFileName: 'fileOne', fileSize: 2000, lastModified: 123456, status: null,
      },
    ]));
  });
});
