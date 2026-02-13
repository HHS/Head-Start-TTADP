import '@testing-library/jest-dom'
import React, { createRef } from 'react'
import { render, waitFor, act, screen } from '@testing-library/react'
import { TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS } from '@ttahub/common/src/constants'
import LineGraph from '../LineGraph'

const traces = [
  {
    x: ['Jan 23', 'Feb 23', 'Mar 23', 'Apr 23', 'May 23', 'Jun 23', 'Jul 23', 'Aug 23', 'Sep 23', 'Oct 23', 'Nov 23', 'Dec 23'],
    y: [80, 83, 83, 77, 77, 83, 84, 76, 73, 82, 79, 69],
    name: 'In person',
    traceOrder: 1,
    trace: 'circle',
    id: TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS.IN_PERSON,
  },
  {
    x: ['Jan 23', 'Feb 23', 'Mar 23', 'Apr 23', 'May 23', 'Jun 23', 'Jul 23', 'Aug 23', 'Sep 23', 'Oct 23', 'Nov 23', 'Dec 23'],
    y: [20, 17, 16, 16, 20, 13, 13, 21, 26, 17, 16, 29],
    name: 'Virtual',
    traceOrder: 2,
    trace: 'square',
    id: TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS.VIRTUAL,
  },
  {
    x: ['Jan 23', 'Feb 23', 'Mar 23', 'Apr 23', 'May 23', 'Jun 23', 'Jul 23', 'Aug 23', 'Sep 23', 'Oct 23', 'Nov 23', 'Dec 23'],
    y: [0, 0, 1, 1, 3, 4, 2, 2, 0, 1, 5, 2],
    name: 'Hybrid',
    traceOrder: 3,
    trace: 'triangle',
    id: TOTAL_HOURS_AND_RECIPIENT_GRAPH_TRACE_IDS.HYBRID,
  },
]

const tableConfig = {
  title: 'Delivery method',
  caption: 'TTA broken down by delivery method into total hours and percentages',
  enableCheckboxes: true,
  enableSorting: true,
  showTotalColumn: false,
  data: [
    {
      heading: 'Jan 23',
      sortKey: 1,
      id: 1,
      data: [
        {
          value: 818,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 80,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 204,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 20,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 0,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 0,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Feb 23',
      sortKey: 2,
      id: 2,
      data: [
        {
          value: 1750,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 83,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 174,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 17,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 0,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 0,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Mar 23',
      sortKey: 3,
      id: 3,
      data: [
        {
          value: 742,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 83,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 143,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 16,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 1,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 1,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Apr 23',
      sortKey: 4,
      id: 4,
      data: [
        {
          value: 936,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 77,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 255,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 16,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 24,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 1,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'May 23',
      sortKey: 5,
      id: 5,
      data: [
        {
          value: 742,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 77,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 191,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 20,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 29,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 3,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Jun 23',
      sortKey: 6,
      id: 6,
      data: [
        {
          value: 650,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 83,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 102,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 13,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 31,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 4,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Jul 23',
      sortKey: 7,
      id: 7,
      data: [
        {
          value: 827,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 84,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 138,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 13,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 20,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 2,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Aug 23',
      sortKey: 8,
      id: 8,
      data: [
        {
          value: 756,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 76,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 206,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 21,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 20,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 2,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Sep 23',
      sortKey: 9,
      id: 9,
      data: [
        {
          value: 699,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 73,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 258,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 26,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 0,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 0,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Oct 23',
      sortKey: 10,
      id: 10,
      data: [
        {
          value: 855,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 82,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 177,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 17,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 11,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 1,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Nov 23',
      sortKey: 11,
      id: 11,
      data: [
        {
          value: 803,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 79,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 290,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 16,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 78,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 5,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
    {
      heading: 'Dec 23',
      sortKey: 12,
      id: 12,
      data: [
        {
          value: 689,
          title: "In person (AR's)",
          sortKey: "In_person_(AR's)",
        },
        {
          value: 69,
          title: ' In person (Percentage)',
          sortKey: 'In_person_(Percentage)',
        },
        {
          value: 596,
          title: "Virtual (AR's)",
          sortKey: "Virtual_(AR's)",
        },
        {
          value: 29,
          title: 'Virtual (Percentage)',
          sortKey: 'Virtual_(Percentage)',
        },
        {
          value: 64,
          title: "Hybrid (AR's)",
          sortKey: "Hybrid_(AR's)",
        },
        {
          value: 2,
          title: 'Hybrid (Percentage)',
          sortKey: 'Hybrid_(Percentage)',
        },
      ],
    },
  ],
  sortConfig: {
    sortBy: '1',
    direction: 'desc',
    activePage: 1,
  },
  checkboxes: {},
  firstHeading: 'Months',
  headings: ["In person (AR's)", 'In person (Percentage)', "Virtual (AR's)", 'Virtual (Percentage)', "Hybrid (AR's)", 'Hybrid (Percentage)'],
  footer: {
    showFooter: true,
    data: ['', 'Total', '8420', '73', '2734', '24', '356', '3'],
  },
}

describe('LineGraph', () => {
  const renderTest = (showTabularData = false, data = traces) => {
    act(() => {
      render(
        <LineGraph
          data={data}
          hideYAxis={false}
          xAxisTitle="Months"
          yAxisTitle="Percentage"
          legendConfig={[
            {
              label: 'In person',
              selected: true,
              shape: 'circle',
              id: 'show-in-person-checkbox',
            },
            {
              label: 'Hybrid',
              selected: true,
              shape: 'square',
              id: 'show-hybrid-checkbox',
            },
            {
              label: 'Virtual',
              selected: true,
              shape: 'triangle',
              id: 'show-virtual-checkbox',
            },
          ]}
          tableConfig={tableConfig}
          widgetRef={createRef()}
          showTabularData={showTabularData}
        />
      )
    })
  }

  it('switches legends', () => {
    renderTest()

    const inPersonCheckbox = document.getElementById('show-in-person-checkbox')
    const hybridCheckbox = document.getElementById('show-hybrid-checkbox')
    const virtualCheckbox = document.getElementById('show-virtual-checkbox')
    expect(inPersonCheckbox).toBeChecked()
    expect(hybridCheckbox).toBeChecked()
    expect(virtualCheckbox).toBeChecked()

    act(() => {
      inPersonCheckbox.click()
    })

    act(() => {
      hybridCheckbox.click()
    })

    act(() => {
      virtualCheckbox.click()
    })

    expect(inPersonCheckbox).not.toBeChecked()
    expect(hybridCheckbox).not.toBeChecked()
    expect(virtualCheckbox).not.toBeChecked()
  })

  it('displays tabular data', async () => {
    const showTabularData = true
    renderTest(showTabularData)

    await waitFor(() => {
      expect(document.querySelector('.smarthub-horizontal-table-widget')).toBeInTheDocument()
    })
  })

  it('shows no results found', async () => {
    renderTest(false, [])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /no results found\./i })).toBeVisible()
      expect(screen.getByText('Try removing or changing the selected filters.')).toBeVisible()
      expect(screen.getByRole('button', { name: /get help using filters/i })).toBeInTheDocument()
    })
  })
})
