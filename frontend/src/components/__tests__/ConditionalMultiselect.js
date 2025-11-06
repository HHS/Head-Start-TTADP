/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import ConditionalMultiselect from '../ConditionalMultiselect';

// Mock focus-trap to bypass tabbable-node requirements in JSDOM
jest.mock('focus-trap-react', () => ({
  __esModule: true,
  default: ({ children }) => (
    <div data-testid="mock-focus-trap">{children}</div>
  ),
}));

// Mock feed component used inside the drawer so tests don't perform network calls
jest.mock('../ContentFromFeedByTag', () => ({ className, tagName }) => (
  <div data-testid="feed-by-tag" className={className}>
    Feed for
    {' '}
    {tagName}
  </div>
));

describe('ConditionalMultiselect', () => {
  const CM = ({
    fieldData = {
      fieldType: 'partytime',
      title: 'Test',
      prompt: 'What is a test?',
      options: ['option1', 'option2'],
      validations: {
        required: false,
        rules: [
          {
            name: 'maxSelections',
            value: 1,
            message: 'How DARE you',
          },
        ],
      },
      response: [],
    },
    validations = {
      required: false,
      rules: [
        {
          name: 'maxSelections',
          value: 1,
          message: 'How DARE you',
        },
      ],
    },
    fieldName = 'test',
    fieldValue = [],
    onBlur = jest.fn(),
    onChange = jest.fn(),
    error = <></>,
    userCanEdit = true,
    // drawer defaults off; opt-in per-test
    drawerButtonText,
    drawerTitle,
    drawerTagName,
    drawerClassName,
  }) => (
    <>
      <ConditionalMultiselect
        fieldData={fieldData}
        validations={validations}
        fieldName={fieldName}
        fieldValue={fieldValue}
        onBlur={onBlur}
        onChange={onChange}
        error={error}
        userCanEdit={userCanEdit}
        drawerButtonText={drawerButtonText}
        drawerTitle={drawerTitle}
        drawerTagName={drawerTagName}
        drawerClassName={drawerClassName}
      />
      <button type="button">for blurrin</button>
    </>
  );

  it('renders a prompt', async () => {
    const onChange = jest.fn();
    act(() => {
      render(<CM onChange={onChange} />);
    });
    expect(screen.getByText('What is a test?')).toBeInTheDocument();

    await selectEvent.select(screen.getByLabelText('What is a test?'), ['option1']);

    expect(onChange).toHaveBeenCalled();
  });

  it('renders a prompt with null field value', async () => {
    act(() => {
      render(<CM fieldValue={null} />);
    });
    expect(screen.getByText('What is a test?')).toBeInTheDocument();
  });

  it('shows a drawer trigger and opens drawer with feed content when clicked', async () => {
    act(() => {
      render(
        <CM
          drawerButtonText="Get help choosing root causes"
          drawerTitle="Root causes"
          drawerTagName="ttahub-fei-root-causes"
          drawerClassName="ttahub-drawer--ttahub-fei-root-causes-guidance"
        />,
      );
    });

    // Drawer exists but is hidden initially
    const title = screen.getByText('Root causes');
    expect(title).toBeInTheDocument();
    expect(title).not.toBeVisible();

    // Click trigger to open
    const trigger = screen.getByRole('button', { name: 'Get help choosing root causes' });
    await userEvent.click(trigger);

    // Drawer visible with mocked feed content and class
    expect(title).toBeVisible();
    const feed = screen.getByTestId('feed-by-tag');
    expect(feed).toHaveTextContent('ttahub-fei-root-causes');
    expect(feed).toHaveClass('ttahub-drawer--ttahub-fei-root-causes-guidance');

    // Close the drawer
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    expect(title).not.toBeVisible();
  });

  it('does not render a drawer trigger without a tag', () => {
    act(() => {
      render(
        <CM
          drawerButtonText="Get help choosing root causes"
          drawerTitle="Root causes"
          // drawerTagName omitted
        />,
      );
    });

    expect(screen.queryByRole('button', { name: 'Get help choosing root causes' })).not.toBeInTheDocument();
  });
});
