import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders Hello World', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/Hello/i);
  expect(linkElement).toBeInTheDocument();
});
