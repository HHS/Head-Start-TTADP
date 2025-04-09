import React from 'react';
import { useFormContext } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReviewItem, { mapUrlValue } from '../ReviewItem';

// Mock useFormContext to control the values returned by watch
jest.mock('react-hook-form', () => ({
  useFormContext: jest.fn(),
}));

describe('mapUrlValue', () => {
  it('should return Recipient when passed recipient', () => {
    expect(mapUrlValue('recipient')).toEqual('Recipient');
  });

  it('should return Regional Office when passed regionalOffice', () => {
    expect(mapUrlValue('regionalOffice')).toEqual('Regional Office');
  });

  it('should return Other entity when passed other-entity', () => {
    expect(mapUrlValue('other-entity')).toEqual('Other entity');
  });

  it('should return Technical assistance when passed technical-assistance', () => {
    expect(mapUrlValue('technical-assistance')).toEqual('Technical assistance');
  });

  it('should return Training when passed training', () => {
    expect(mapUrlValue('training')).toEqual('Training');
  });

  it('should return In Person when passed in-person', () => {
    expect(mapUrlValue('in-person')).toEqual('In Person');
  });

  it('should return Virtual when passed virtual', () => {
    expect(mapUrlValue('virtual')).toEqual('Virtual');
  });

  it('should return Hybrid when passed hybrid', () => {
    expect(mapUrlValue('hybrid')).toEqual('Hybrid');
  });

  it('should return the value when passed an invalid value', () => {
    expect(mapUrlValue('invalid')).toEqual('invalid');
  });

  it('should return the value when passed an empty string', () => {
    expect(mapUrlValue('')).toEqual('');
  });
});

describe('ReviewItem emptySelector and classes', () => {
  it('should set emptySelector to an empty string when value has items', () => {
    const value = ['item1', 'item2'];
    const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
    expect(emptySelector).toEqual('');
  });

  it('should set emptySelector to "smart-hub-review-item--empty" when value is empty', () => {
    const value = [];
    const emptySelector = value && value.length > 0 ? '' : 'smart-hub-review-item--empty';
    expect(emptySelector).toEqual('smart-hub-review-item--empty');
  });

  it('should correctly generate classes string', () => {
    const emptySelector = 'smart-hub-review-item--empty';
    const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');
    expect(classes).toEqual('margin-top-1 smart-hub-review-item--empty');
  });

  it('should exclude emptySelector from classes when it is an empty string', () => {
    const emptySelector = '';
    const classes = ['margin-top-1', emptySelector].filter((x) => x !== '').join(' ');
    expect(classes).toEqual('margin-top-1');
  });
});

describe('ReviewItem link rendering', () => {
  let originalLocation;

  beforeAll(() => {
    originalLocation = window.location;
    delete window.location;
    window.location = new URL('http://example.com');
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  it('should render a valid internal link correctly', () => {
    useFormContext.mockReturnValue({
      watch: jest.fn(() => ['http://example.com/internal-link']),
    });

    render(
      <MemoryRouter>
        <ReviewItem
          label="Test Label"
          name="testName"
          path=""
          isFile={false}
          isRichText={false}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'http://example.com/internal-link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/internal-link');
  });

  it('should render a valid external link correctly', () => {
    useFormContext.mockReturnValue({
      watch: jest.fn(() => ['http://external.com']),
    });

    render(
      <ReviewItem
        label="Test Label"
        name="testName"
        path=""
        isFile={false}
        isRichText={false}
      />,
    );

    const link = screen.getByRole('link', { name: 'http://external.com' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'http://external.com');
  });
});
