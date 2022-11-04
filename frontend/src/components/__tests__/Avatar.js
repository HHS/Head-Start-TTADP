import { render, screen } from '@testing-library/react';
import React from 'react';
import Avatar from '../Avatar';

describe('Avatar', () => {
  const renderAvatar = (name) => {
    render(
      <Avatar name={name} />,
    );
  };

  it('renders an avatar', async () => {
    renderAvatar('Harry Potter');
    const avatar = await screen.findByTestId('avatar');
    expect(avatar).toBeTruthy();
    expect(avatar).toHaveTextContent('H');
  });
});
