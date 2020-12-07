import '@testing-library/jest-dom';
import React from 'react';
import {
  render, fireEvent, waitFor, act, screen,
} from '@testing-library/react';

import FileUploader from '../FileUploader';

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

  const file = (name) => new File([''], name, { type: 'text/html' });

  it('onDrop adds calls the onChange method', async () => {
    const mockOnChange = jest.fn();
    const data = mockData([file('file')]);
    const ui = <FileUploader onChange={mockOnChange} files={[]} />;
    const { container, rerender } = render(ui);
    const dropzone = container.querySelector('div');

    dispatchEvt(dropzone, 'drop', data);
    await flushPromises(rerender, ui);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('files are properly displayed', () => {
    render(<FileUploader onChange={() => {}} files={[file('fileOne'), file('fileTwo')]} />);
    expect(screen.getByText('fileOne')).toBeVisible();
    expect(screen.getByText('fileTwo')).toBeVisible();
  });

  it('files can be removed', () => {
    const mockOnChange = jest.fn();
    render(<FileUploader onChange={mockOnChange} files={[file('fileOne'), file('fileTwo')]} />);
    const fileOne = screen.getByText('fileOne');
    fireEvent.click(fileOne.nextSibling);

    expect(mockOnChange).toHaveBeenCalledWith([file('fileTwo')]);
  });
});
