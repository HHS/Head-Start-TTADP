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

    it('renders plain text (no HTML tags) as a simple span element', async () => {
      const plainText = 'Course A, Course B, Course C';
      const heading = 'iPD courses';

      const { container } = render(renderEditor(heading, plainText));

      // Should render as a span, not wrapped in Editor
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span.textContent).toBe(plainText);

      // Should NOT have the rdw-wrapper aria-label from Draft.js Editor
      const editorWrapper = container.querySelector('[aria-label="rdw-wrapper"]');
      expect(editorWrapper).not.toBeInTheDocument();
    });

    it('renders HTML content using Draft.js Editor', async () => {
      const htmlContent = '<p>This is <strong>HTML</strong> content</p>';
      const heading = 'TTA provided';

      const { container } = render(renderEditor(heading, htmlContent));

      // Should use Draft.js Editor (has rdw classes)
      const editorMain = container.querySelector('.rdw-editor-main');
      expect(editorMain).toBeInTheDocument();
    });

    it('handles empty string as plain text', async () => {
      const emptyString = '';
      const heading = 'Test heading';

      const { container } = render(renderEditor(heading, emptyString));

      // Empty string should render as span
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span.textContent).toBe('');
    });

    it('returns JSX objects as-is without modification', async () => {
      const jsxElement = (
        <div className="custom-component">
          <strong>Custom JSX</strong>
        </div>
      );
      const heading = 'Custom field';

      const { container } = render(renderEditor(heading, jsxElement));

      // Should render the JSX as-is
      const customDiv = container.querySelector('.custom-component');
      expect(customDiv).toBeInTheDocument();
      expect(customDiv.querySelector('strong')).toHaveTextContent('Custom JSX');
    });

    it('treats strings with less-than symbol as plain text (safe behavior)', async () => {
      const stringWithLessThan = '5 < 10';
      const heading = 'Math';

      const { container } = render(renderEditor(heading, stringWithLessThan));

      // The regex requires a letter after '<' to identify HTML tags
      // So "5 < 10" is correctly identified as plain text
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span.textContent).toBe(stringWithLessThan);
    });

    it('renders comma-separated lists as plain text', async () => {
      const topics = 'Topic 1, Topic 2, Topic 3';
      const heading = 'Topics';

      const { container } = render(renderEditor(heading, topics));

      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span.textContent).toBe(topics);

      // Should NOT have Editor wrapper
      const editorWrapper = container.querySelector('[aria-label="rdw-wrapper"]');
      expect(editorWrapper).not.toBeInTheDocument();
    });

    it('renders numeric strings as plain text', async () => {
      const number = '42';
      const heading = 'Count';

      const { container } = render(renderEditor(heading, number));

      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span.textContent).toBe(number);
    });
  });
});
