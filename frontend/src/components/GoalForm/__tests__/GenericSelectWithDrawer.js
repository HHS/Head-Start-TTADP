import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React, { useState } from 'react';
import selectEvent from 'react-select-event';
import GenericSelectWithDrawer from '../GenericSelectWithDrawer';

describe('GenericSelectWithDrawer', () => {
  beforeEach(() =>
    fetchMock.get(
      '/api/feeds/item?tag=ttahub-topic',
      `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Whats New</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id></feed>`
    )
  );

  afterEach(() => fetchMock.restore());

  const defaultValues = [
    { id: 1, name: 'Value 1' },
    { id: 2, name: 'Value 2' },
  ];

  const defaultOptions = [
    { id: 3, name: 'Option C' },
    { id: 4, name: 'Option A' },
    { id: 5, name: 'Option B' },
  ];

  const renderGenericSelect = ({
    values = defaultValues,
    options = defaultOptions,
    hint = '',
  } = {}) =>
    render(
      <GenericSelectWithDrawer
        error={<></>}
        name="topic"
        inputName="test-select-drawer"
        options={options}
        validateValues={jest.fn()}
        values={values}
        onChangeValues={jest.fn()}
        drawerButtonText="Get help"
        drawerContent={<div>Drawer Content</div>}
        drawerTitle="Drawer Title"
        hint={hint}
      />
    );

  it('renders correctly with default props', () => {
    renderGenericSelect();
    expect(screen.getByText('topics')).toBeInTheDocument();
    expect(screen.getByText('Get help')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
    expect(screen.getByText('Value 2')).toBeInTheDocument();
  });

  it('renders with a hint and sorts options', () => {
    const hintText = 'This is a helpful hint.';
    renderGenericSelect({ hint: hintText });
    expect(screen.getByText(hintText)).toBeInTheDocument();

    expect(screen.getByText('Value 1')).toBeInTheDocument();
    expect(screen.getByText('Value 2')).toBeInTheDocument();
  });

  it('sorts options even if some are missing names', () => {
    const optionsWithMissingNames = [
      { id: 6, name: 'Option Z' },
      { id: 7 }, // missing name
      { id: 8, name: 'Option Y' },
      { id: 9, name: null }, // falsy name
    ];
    renderGenericSelect({ options: optionsWithMissingNames });
    expect(screen.getByText('topics')).toBeInTheDocument();
    expect(screen.getByText('Get help')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
    expect(screen.getByText('Value 2')).toBeInTheDocument();
  });

  it('renders with empty options', () => {
    renderGenericSelect({ options: [] });
    expect(screen.getByText('topics')).toBeInTheDocument();
    expect(screen.getByText('Get help')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
    expect(screen.getByText('Value 2')).toBeInTheDocument();
  });

  it('treats options sharing an id but with distinct selectKeys as independent items', async () => {
    // Both options share standardId 100 but represent different findings.
    // Without a unique selectKey, react-select would treat them as the same
    // item, so selecting one would visually select both.
    const sharedIdOptions = [
      {
        id: 100,
        name: 'ANC - 1302.47(b)(7)(vi) - Findings Outside the Protocol',
        findingType: 'Noncompliance',
        selectKey: 'Noncompliance::ANC - 1302.47(b)(7)(vi) - Findings Outside the Protocol',
      },
      {
        id: 100,
        name: 'DEF - 1302.47(b)(7)(vi) - Findings Outside the Protocol',
        findingType: 'Deficiency',
        selectKey: 'Deficiency::DEF - 1302.47(b)(7)(vi) - Findings Outside the Protocol',
      },
    ];

    const Harness = () => {
      const [values, setValues] = useState([]);
      return (
        <>
          <GenericSelectWithDrawer
            error={<></>}
            name="Citation"
            inputName="shared-id-select"
            options={sharedIdOptions}
            validateValues={jest.fn()}
            values={values}
            onChangeValues={setValues}
            drawerButtonText="Get help"
            drawerContent={<div>Drawer Content</div>}
            drawerTitle="Drawer Title"
          />
          <div data-testid="selected-count">{values.length}</div>
        </>
      );
    };

    render(<Harness />);

    const select = await screen.findByRole('combobox', { name: /citations/i });

    // Selecting the Noncompliance option must not also select the Deficiency one.
    // The menu stays open (closeMenuOnSelect is false), so assert on the
    // selection count rather than option text still visible in the dropdown.
    await selectEvent.select(select, [/ANC - 1302\.47/i]);
    expect(screen.getByTestId('selected-count')).toHaveTextContent('1');

    // The Deficiency option can be selected independently, giving two selections.
    await selectEvent.select(select, [/DEF - 1302\.47/i]);
    expect(screen.getByTestId('selected-count')).toHaveTextContent('2');
  });
});
