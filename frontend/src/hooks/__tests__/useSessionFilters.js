import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSessionFilters from '../useSessionFilters';
import { mockWindowProperty } from '../../testHelpers';

const SessionFilters = () => {
  const [storage, setStorage] = useSessionFilters('test', 'this');

  return (
    <>
      <h1>{storage}</h1>
      <input type="text" onChange={(e) => setStorage(e.target.value)} />
    </>
  );
};

const renderSessionFilters = () => render(<SessionFilters />);

describe('useSessionFilters', () => {
  const setItem = jest.fn();

  mockWindowProperty('sessionStorage', {
    setItem,
    getItem: jest.fn(),
    removeItem: jest.fn(),
  });

  it('saves state to local storage', async () => {
    renderSessionFilters();

    const textBox = await screen.findByRole('textbox');

    userEvent.type(textBox, 'hello');

    expect(setItem).toHaveBeenCalled();
  });
});
