import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSessionStorage from '../useSessionStorage';
import { mockWindowProperty } from '../../testHelpers';

const StorageTest = () => {
  const [storage, setStorage] = useSessionStorage('test', 'this');

  return (
    <>
      <h1>{storage}</h1>
      <input type="text" onChange={(e) => setStorage(e.target.value)} />
    </>
  );
};

const renderStorageTest = () => render(<StorageTest />);

describe('useSessionStorage', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();

  mockWindowProperty('sessionStorage', {
    setItem,
    getItem,
    removeItem: jest.fn(),
  });

  it('saves state to local storage', async () => {
    renderStorageTest();

    const textBox = await screen.findByRole('textbox');

    userEvent.type(textBox, 'hello');

    expect(setItem).toHaveBeenCalled();
  });
});
