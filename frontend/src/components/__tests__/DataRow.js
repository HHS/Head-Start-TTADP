import React from 'react';
import { render } from '@testing-library/react';
import DataRow from '../DataRow';

describe('DataRow', () => {
  it('renders correctly with data', () => {
    const { getByText } = render(<DataRow label="Sample Label" value="Sample Value" />);

    expect(getByText('Sample Label')).toBeInTheDocument();
    expect(getByText('Sample Value')).toBeInTheDocument();
  });
});
