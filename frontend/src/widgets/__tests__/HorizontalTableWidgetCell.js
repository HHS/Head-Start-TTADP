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

  it('applies position-relative class to non-first column cells', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({ data, isFirstColumn: false });
    const td = container.querySelector('td');
    expect(td).toHaveClass('position-relative');
    expect(td).not.toHaveClass('smarthub-horizontal-table-first-column');
  });

  it('applies position-relative class to first column cells', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({ data, isFirstColumn: true });
    const td = container.querySelector('td');
    expect(td).toHaveClass('position-relative');
    expect(td).toHaveClass('smarthub-horizontal-table-first-column');
  });

  it('applies sticky column classes when stickyFirstColumn is true', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
      stickyFirstColumn: true,
    });

    const td = container.querySelector('td');
    expect(td).toHaveClass('smarthub-horizontal-table--sticky-first-column');
    expect(td).toHaveClass('smarthub-horizontal-table-first-column-border');
  });

  it('applies sticky column checkbox class when both stickyFirstColumn and enableCheckboxes are true', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
      stickyFirstColumn: true,
      enableCheckboxes: true,
    });

    const td = container.querySelector('td');
    expect(td).toHaveClass('smarthub-horizontal-table--sticky-first-column');
    expect(td).toHaveClass('smarthub-horizontal-table--sticky-first-column-checkboxes-enabled');
    expect(td).toHaveClass('left-with-checkbox');
  });

  it('applies border class when hideFirstColumnBorder is false (default)', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
    });

    const td = container.querySelector('td');
    expect(td).toHaveClass('smarthub-horizontal-table-first-column-border');
  });

  it('does not apply border class when hideFirstColumnBorder is true and stickyFirstColumn is false', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
      hideFirstColumnBorder: true,
      stickyFirstColumn: false,
    });

    const td = container.querySelector('td');
    expect(td).not.toHaveClass('smarthub-horizontal-table-first-column-border');
  });

  it('applies border class when stickyFirstColumn is true even if hideFirstColumnBorder is true', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
      hideFirstColumnBorder: true,
      stickyFirstColumn: true,
    });

    const td = container.querySelector('td');
    expect(td).toHaveClass('smarthub-horizontal-table-first-column-border');
  });

  it('applies left-0 class when enableCheckboxes is false', () => {
    const data = {
      title: 'Test Cell',
      value: 'Test Value',
      heading: 'Test Heading',
    };

    const { container } = renderTableCell({
      data,
      isFirstColumn: true,
      enableCheckboxes: false,
    });

    const td = container.querySelector('td');
    expect(td).toHaveClass('left-0');
    expect(td).not.toHaveClass('left-with-checkbox');
  });
});
