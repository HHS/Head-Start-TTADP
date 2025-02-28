/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HorizontalTableWidgetCell from '../HorizontalTableWidgetCell';

const renderTableCell = (props) => render(
  <BrowserRouter>
    <table>
      <tbody>
        <tr>
          <HorizontalTableWidgetCell {...props} />
        </tr>
      </tbody>
    </table>
  </BrowserRouter>,
);

describe('TableCell', () => {
  it('renders basic cell content', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    renderTableCell({ data });
    expect(screen.getByText('Test Value')).toBeInTheDocument();
  });

  it('renders first column content', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    renderTableCell({ data, isFirstColumn: true });
    expect(screen.getByText('Test Heading')).toBeInTheDocument();
  });

  it('renders dash for null value when showDashForNullValue is true', () => {
    const data = {
      title: 'Test Cell',
      value: null,
      heading: 'Test Heading',
    };

    renderTableCell({ data, showDashForNullValue: true });
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders internal link correctly', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Link',
      heading: 'Test Heading',
      isUrl: true,
      isInternalLink: true,
      link: '/test-link',
    };

    renderTableCell({ data });
    const link = screen.getByText('Test Heading');
    expect(link).toHaveAttribute('href', '/test-link');
  });

  it('renders external link with icon', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Link',
      heading: 'Test Heading',
      isUrl: true,
      link: 'https://example.com',
    };

    const { container } = renderTableCell({ data });
    const link = screen.getByText('Test Heading');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(container.querySelector('.fa-arrow-up-right-from-square')).toBeInTheDocument();
  });

  it('renders external link without icon when hideLinkIcon is true', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Link',
      heading: 'Test Heading',
      isUrl: true,
      link: 'https://example.com',
      hideLinkIcon: true,
    };

    const { container } = renderTableCell({ data });
    const link = screen.getByText('Test Heading');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(container.querySelector('.fa-arrow-up-right-from-square')).not.toBeInTheDocument();
  });

  it('renders tooltip content correctly', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
      tooltip: true,
    };

    renderTableCell({ data });
    const elements = screen.getAllByText('Test Heading');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders suffix content when provided', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
      suffixContent: <span>Suffix</span>,
    };

    renderTableCell({ data });
    expect(screen.getByText('Suffix')).toBeInTheDocument();
  });

  it('applies correct classes for first column with checkboxes', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
      enableCheckboxes: true,
    });

    const td = container.querySelector('td');
    expect(td).toHaveClass('left-with-checkbox');
  });
});
