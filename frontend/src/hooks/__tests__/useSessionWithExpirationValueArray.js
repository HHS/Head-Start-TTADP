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

    expect(setItem).toHaveBeenCalled();
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

    expect(setItem).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledWith('test-jim');
  });
});
