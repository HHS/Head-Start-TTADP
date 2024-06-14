import React from 'react';
import { render } from '@testing-library/react';
import ErrorDetails from '../ErrorDetails';

describe('ErrorDetails', () => {
  it('should render the title and content', () => {
    const title = 'Error Title';
    const content = { message: 'Error Message' };
    const { getByText } = render(<ErrorDetails title={title} content={content} />);

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText(/"message": "Error Message"/i)).toBeInTheDocument();
  });

  it('should render default content when content prop is not provided', () => {
    const title = 'Error Title';
    const { getByText } = render(<ErrorDetails title={title} />);

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText('{}')).toBeInTheDocument();
  });
});
