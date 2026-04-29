import { render } from '@testing-library/react';
import React from 'react';
import DescriptionItem from '../DescriptionItem';

describe('DescriptionItem', () => {
  // eslint-disable-next-line react/jsx-props-no-spreading
  const renderTest = (props) => render(<DescriptionItem {...props} />);

  it('renders title and children', () => {
    const props = {
      title: 'Test Title',
      children: <span>Test Content</span>,
    };
    const { getByText } = renderTest(props);

    expect(getByText('Test Title')).toBeInTheDocument();
    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('returns null when hideIf is true', () => {
    const props = {
      title: 'Test Title',
      children: <span>Test Content</span>,
      hideIf: true,
    };
    const { container } = renderTest(props);

    expect(container.firstChild).toBeNull();
  });
});
