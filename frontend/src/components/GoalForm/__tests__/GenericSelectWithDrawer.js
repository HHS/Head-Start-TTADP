import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import GenericSelectWithDrawer from '../GenericSelectWithDrawer';

describe('GenericSelectWithDrawer', () => {
  beforeEach(() => fetchMock.get('/api/feeds/item?tag=ttahub-topic', `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>Whats New</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id></feed>`));

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
  } = {}) => render((
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
  ));

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
});
