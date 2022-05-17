import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSessionWithExpirationValueArray, { FIVE_MINUTES } from '../useSessionWithExpirationValueArray';
import { mockWindowProperty } from '../../testHelpers';

const StorageTest = ({ defaultValue }) => {
  const [users, { push: pushUser }] = useSessionWithExpirationValueArray('test', defaultValue);

  const input = useRef();

  return (
    <>
      <ul>
        {users.map((user) => <li key={user.expires}>{user.name}</li>)}
      </ul>
      <input type="text" ref={input} />
      <button
        type="button"
        onClick={() => pushUser(input.current.value)}
      >
        Click me
      </button>
    </>
  );
};

StorageTest.propTypes = {
  defaultValue: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    expires: PropTypes.string,
  })),
};

StorageTest.defaultProps = {
  defaultValue: [],
};

const renderStorageTest = (defaultValue = []) => (
  render(<StorageTest defaultValue={defaultValue} />));

describe('useSessionWithExpirationValueArray', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();
  const removeItem = jest.fn();

  mockWindowProperty('sessionStorage', {
    setItem,
    getItem,
    removeItem,
  });

  it('saves state to session storage', async () => {
    renderStorageTest();

    const textBox = await screen.findByRole('textbox');
    userEvent.type(textBox, 'hello');

    const button = await screen.findByRole('button');
    userEvent.click(button);
    expect(setItem.mock.calls[1][0]).toBe('test-hello');
  });

  it('deletes expired items from session storage', async () => {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setTime(tenMinutesAgo.getTime() - (FIVE_MINUTES * 2));

    getItem.mockImplementationOnce(() => (JSON.stringify({
      name: 'jim',
      expires: tenMinutesAgo.toJSON(),
    })));

    renderStorageTest([
      {
        name: 'jim',
        expires: tenMinutesAgo.toJSON(),
      },
    ]);

    const textBox = await screen.findByRole('textbox');
    userEvent.type(textBox, 'hello');

    const button = await screen.findByRole('button');
    userEvent.click(button);
    expect(setItem.mock.calls[1][0]).toBe('test-hello');
    expect(removeItem).toHaveBeenCalledWith('test-jim');
  });
});

describe('useSessionWithExpirationValueArray with error', () => {
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setTime(tenMinutesAgo.getTime() - (FIVE_MINUTES * 2));
  const setItem = jest.fn(() => {
    throw new Error('Storage not available');
  });

  const getItem = jest.fn(() => (JSON.stringify({
    name: 'jim',
    expires: tenMinutesAgo.toJSON(),
  })));

  mockWindowProperty('sessionStorage', {
    setItem,
    getItem,
  });

  it('saves state without session storage', async () => {
    renderStorageTest([
      {
        name: 'jim',
        expires: tenMinutesAgo.toJSON(),
      },
    ]);

    const textBox = await screen.findByRole('textbox');
    userEvent.type(textBox, 'hello');

    const button = await screen.findByRole('button');
    userEvent.click(button);
    expect(setItem.mock.calls.flat().includes('__storage_test__')).toBe(true);
    expect(setItem.mock.calls.flat().includes('test-hello')).toBe(false);
  });
});
