/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewCard from '../ReviewCard';

jest.mock('../../../../../../components/DataCard', () => ({ children, testId, className }) => (
  <div data-testid={testId} className={className}>{children}</div>
));

jest.mock('../../../../../../components/Tag', () => ({ children }) => (
  <span data-testid="tag">{children}</span>
));

jest.mock('../../../../../../components/ExpanderButton', () => ({
  closeOrOpen, count, expanded, type, ariaLabel,
}) => (
  <button
    type="button"
    data-testid="expander-button"
    data-count={count}
    data-expanded={String(expanded)}
    data-type={type}
    aria-label={ariaLabel}
    onClick={closeOrOpen}
  >
    Toggle
  </button>
));

jest.mock('../SpecialistTags', () => ({ specialists }) => (
  <div data-testid="specialist-tags" data-count={specialists.length} />
));

jest.mock('../FindingWithinReview', () => ({ finding, regionId }) => (
  <div data-testid="finding-within-review" data-citation={finding.citation} data-region={regionId} />
));

const baseFinding = {
  citation: '1302.47(b)(5)(iv)',
  status: 'Active',
  findingType: 'Deficiency',
  category: 'Inappropriate Release',
  correctionDeadline: '07/25/2024',
  objectives: [],
};

const baseReview = {
  name: '241234RAN',
  reviewType: 'RAN',
  reviewReceived: '06/21/2024',
  outcome: 'Deficiency',
  lastTTADate: '07/12/2024',
  specialists: [],
  grants: ['14CH123456', '14HP141234'],
  findings: [baseFinding],
};

function renderReviewCard(reviewOverrides = {}, regionId = 1) {
  return render(<ReviewCard review={{ ...baseReview, ...reviewOverrides }} regionId={regionId} />);
}

describe('ReviewCard', () => {
  it('renders the review name and type tag', () => {
    renderReviewCard();
    expect(screen.getByRole('heading', { name: /241234RAN/ })).toBeInTheDocument();
    expect(screen.getByTestId('tag')).toHaveTextContent('RAN');
  });

  it('renders all grant numbers', () => {
    renderReviewCard();
    expect(screen.getByText('14CH123456')).toBeInTheDocument();
    expect(screen.getByText('14HP141234')).toBeInTheDocument();
  });

  it('renders review received date', () => {
    renderReviewCard();
    expect(screen.getByText('06/21/2024')).toBeInTheDocument();
  });

  it('renders findings count', () => {
    renderReviewCard();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders review outcome', () => {
    renderReviewCard();
    expect(screen.getByText('Deficiency')).toBeInTheDocument();
  });

  it('renders last TTA date when provided', () => {
    renderReviewCard();
    expect(screen.getByText('07/12/2024')).toBeInTheDocument();
  });

  it('does not render TTA specialists section when specialists array is empty', () => {
    renderReviewCard({ specialists: [] });
    expect(screen.queryByTestId('specialist-tags')).not.toBeInTheDocument();
  });

  it('renders TTA specialists section when specialists are present', () => {
    renderReviewCard({ specialists: [{ name: 'Alice', roles: ['GS'] }] });
    expect(screen.getByTestId('specialist-tags')).toBeInTheDocument();
  });

  it('renders ExpanderButton with correct count and type', () => {
    renderReviewCard();
    const btn = screen.getByTestId('expander-button');
    expect(btn).toHaveAttribute('data-count', '1');
    expect(btn).toHaveAttribute('data-type', 'TTA activity');
  });

  it('does not render FindingWithinReview when collapsed', () => {
    renderReviewCard();
    expect(screen.queryByTestId('finding-within-review')).not.toBeInTheDocument();
  });

  it('renders a FindingWithinReview per finding after expanding', async () => {
    const findings = [
      { ...baseFinding, citation: '1302.47(b)(5)(iv)' },
      { ...baseFinding, citation: '1302.91(a)' },
    ];
    renderReviewCard({ findings });
    await userEvent.click(screen.getByTestId('expander-button'));
    const items = screen.getAllByTestId('finding-within-review');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('data-citation', '1302.47(b)(5)(iv)');
    expect(items[1]).toHaveAttribute('data-citation', '1302.91(a)');
  });

  it('passes regionId to FindingWithinReview', async () => {
    renderReviewCard({}, 5);
    await userEvent.click(screen.getByTestId('expander-button'));
    expect(screen.getByTestId('finding-within-review')).toHaveAttribute('data-region', '5');
  });

  it('collapses findings when expander is clicked a second time', async () => {
    renderReviewCard();
    await userEvent.click(screen.getByTestId('expander-button'));
    expect(screen.getByTestId('finding-within-review')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('expander-button'));
    expect(screen.queryByTestId('finding-within-review')).not.toBeInTheDocument();
  });
});
