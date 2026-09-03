import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import HorizontalTableWidget from '../HorizontalTableWidget';

jest.mock('@trussworks/react-uswds', () => ({
  Checkbox: (props) => <input type="checkbox" {...props} />,
  Table: ({ children }) => <table>{children}</table>,
}));

jest.mock('../../components/ContextMenu', () => () => <div data-testid="context-menu" />);

jest.mock(
  '../HorizontalTableWidgetCell',
  () =>
    function MockHorizontalTableWidgetCell({ data, className }) {
      return <td className={className}>{data.heading || data.value || ''}</td>;
    }
);

describe('HorizontalTableWidget', () => {
  it('applies the sticky total column class to the last footer cell', () => {
    const { container } = render(
      <HorizontalTableWidget
        headers={['2026-01', '2026-02']}
        data={[
          {
            id: 'with-tta',
            heading: 'With TTA support',
            data: [{ value: '2' }, { value: '1' }, { value: '3' }],
          },
        ]}
        firstHeading="Follow-up reviews"
        lastHeading="Totals"
        caption="Compliant follow-up reviews with TTA support"
        footerData={['Total', '2', '1', '3']}
        showTotalColumn
        stickyLastColumn
      />
    );

    const footerCells = Array.from(container.querySelectorAll('tfoot td'));
    const lastFooterCell = footerCells.at(-1);

    expect(lastFooterCell).toHaveTextContent('3');
    expect(lastFooterCell).toHaveClass('smarthub-horizontal-table-last-column');
    expect(lastFooterCell).not.toHaveClass('smarthub-horizontal-table-sticky-last-data-column');
  });
});
