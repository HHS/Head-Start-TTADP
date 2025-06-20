import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import NavLink from '../NavLink';

describe('NavLink', () => {
  const title = 'title';
  const to = '/to';

  test('renders title', () => {
    render(<MemoryRouter><NavLink to={to}>{title}</NavLink></MemoryRouter>);
    expect(screen.getByText(title)).toBeDefined();
  });

  test('sets to prop', () => {
    render(<MemoryRouter><NavLink to={to}>{title}</NavLink></MemoryRouter>);
    expect(screen.getByText(title)).toHaveAttribute('href', to);
  });

  describe('with exact false', () => {
    test('is active when location is not an exact match', () => {
      render(
        <MemoryRouter initialEntries={[`${to}/test`]} initialIndex={0}>
          <NavLink to={to}>{title}</NavLink>
        </MemoryRouter>,
      );
      expect(screen.getByText(title)).toHaveClass('usa-current');
    });
  });

  describe('with exact true', () => {
    test('is not active when location is not an exact match', () => {
      render(
        <MemoryRouter initialEntries={[`${to}/test`]} initialIndex={0}>
          <NavLink exact to={to}>{title}</NavLink>
        </MemoryRouter>,
      );
      expect(screen.getByText(title)).not.toHaveClass('usa-current');
    });

    test('is active when location is an exact match', () => {
      render(
        <MemoryRouter initialEntries={[to]} initialIndex={0}>
          <NavLink exact to={to}>{title}</NavLink>
        </MemoryRouter>,
      );
      expect(screen.getByText(title)).toHaveClass('usa-current');
    });
  });
});
