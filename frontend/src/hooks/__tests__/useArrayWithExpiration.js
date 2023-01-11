import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useArrayWithExpiration, { TWO_MINUTES } from '../useArrayWithExpiration';

const ArrayWithExpirationTest = ({ defaultValue }) => {
  const [users, { push: pushUser }] = useArrayWithExpiration(defaultValue);

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

ArrayWithExpirationTest.propTypes = {
  defaultValue: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    expires: PropTypes.string,
  })),
};

ArrayWithExpirationTest.defaultProps = {
  defaultValue: [],
};

const renderArrayWithExpirationTest = (defaultValue = []) => (
  render(<ArrayWithExpirationTest defaultValue={defaultValue} />));

describe('useArrayWithExpiration', () => {
  it('saves state to session storage', async () => {
    renderArrayWithExpirationTest();

    const textBox = await screen.findByRole('textbox');
    userEvent.type(textBox, 'hello');

    const button = await screen.findByRole('button');
    userEvent.click(button);

    expect(await screen.findByText('hello')).toBeVisible();
  });

  it('deletes expired items from session storage', async () => {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setTime(tenMinutesAgo.getTime() - (TWO_MINUTES * 2));

    renderArrayWithExpirationTest([
      {
        name: 'jim',
        expires: tenMinutesAgo.toJSON(),
      },
    ]);

    expect(await screen.findByText('jim')).toBeVisible();

    const textBox = await screen.findByRole('textbox');
    userEvent.type(textBox, 'hello');

    const button = await screen.findByRole('button');
    userEvent.click(button);

    expect(await screen.findByText('hello')).toBeVisible();
    expect(screen.queryByText(/jim/i)).toBeNull();
  });
});
