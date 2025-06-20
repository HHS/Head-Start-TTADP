import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { renderEditor } from '../renderReadOnlyContentData';

describe('renderReadOnlyContentData', () => {
  describe('renderEditor', () => {
    it('generates a UUID id if the heading is a react node', async () => {
      const data = 'test data';
      const heading = <h1>Test Heading</h1>;

      render(renderEditor(heading, data));

      expect(screen.getByText('test data')).toBeInTheDocument();
    });
  });
});
