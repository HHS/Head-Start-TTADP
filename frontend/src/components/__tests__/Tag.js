import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tag from '../Tag';

describe('Tag', () => {
  const renderTag = ({ clickable, handleClick }) => {
    render(
      <div data-testid="tag-container">
        <Tag clickable={clickable} handleClick={handleClick}>
          Tag Content
        </Tag>
      </div>,
    );
  };

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderTag({});
    expect(await screen.findByText(/Tag Content/i)).toBeVisible();
  });
  it('renders with underline', async () => {
    renderTag({ clickable: true });
    await expect(
      document.querySelector('.ttahub-tag-underline'),
    ).toBeInTheDocument();
  });
  it('handles click events', async () => {
    const handleClick = jest.fn();
    renderTag({ handleClick });
    const tag = await screen.findByText(/Tag Content/i);
    expect(tag).toBeVisible();
    fireEvent.click(tag);
    expect(handleClick).toHaveBeenCalled();
  });
});
