import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RecipientSpotlightCard from '../RecipientSpotlightCard';

const mockRecipient = {
  recipientId: 1,
  regionId: 5,
  recipientName: 'Test Recipient',
  grantIds: ['12345'],
  lastTTA: '2024-03-15',
  childIncidents: true,
  deficiency: false,
  newRecipients: true,
  newStaff: false,
  noTTA: false,
  DRS: false,
  FEI: false,
};

describe('RecipientSpotlightCard', () => {
  const renderCard = (recipient = mockRecipient) => render(
    <BrowserRouter>
      <RecipientSpotlightCard recipient={recipient} />
    </BrowserRouter>,
  );

  it('renders recipient name as link', () => {
    renderCard();
    const link = screen.getByText('Test Recipient');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute(
      'href',
      '/recipient-tta-records/1/region/5/profile',
    );
  });

  it('renders region number', () => {
    renderCard();
    const labels = screen.getAllByText('Region');
    expect(labels.length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('formats and displays last TTA date', () => {
    renderCard();
    const labels = screen.getAllByText('Last TTA');
    expect(labels.length).toBeGreaterThan(0);
    expect(screen.getByText('03/15/2024')).toBeInTheDocument();
  });

  it('displays N/A when lastTTA is null', () => {
    const recipient = { ...mockRecipient, lastTTA: null };
    renderCard(recipient);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('renders IndicatorCounter with correct count', () => {
    const { container } = renderCard();
    // mockRecipient has 2 active indicators: childIncidents and newRecipients
    const filledBoxes = container.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledBoxes.length).toBe(2);
  });

  it('displays indicator count text inline with counter', () => {
    renderCard();
    // The text is now rendered inline within the IndicatorCounter component
    expect(screen.getByText(/2\s+of\s+7/)).toBeInTheDocument();
  });

  it('renders ExpanderButton with "View" text initially', () => {
    renderCard();
    expect(screen.getByText(/View/)).toBeInTheDocument();
    expect(screen.getByText(/indicator/)).toBeInTheDocument();
  });

  it('does not show indicator details when collapsed', () => {
    renderCard();
    expect(screen.queryByText('Child incidents')).not.toBeInTheDocument();
    expect(screen.queryByText('New recipient')).not.toBeInTheDocument();
  });

  it('shows indicator details when expanded', () => {
    renderCard();
    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('Child incidents')).toBeInTheDocument();
    expect(screen.getByText('New recipient')).toBeInTheDocument();
    expect(screen.getByText(/more than one child incident cited in a RAN/)).toBeInTheDocument();
  });

  it('changes button text to "Hide" when expanded', () => {
    renderCard();
    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    expect(screen.getByText(/Hide/)).toBeInTheDocument();
  });

  it('toggles indicator details on button click', () => {
    renderCard();
    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });

    // Initially collapsed
    expect(screen.queryByText('Child incidents')).not.toBeInTheDocument();

    // Expand
    fireEvent.click(expandButton);
    expect(screen.getByText('Child incidents')).toBeInTheDocument();

    // Collapse
    fireEvent.click(expandButton);
    expect(screen.queryByText('Child incidents')).not.toBeInTheDocument();
  });

  it('renders all indicator boxes with different styling for active and inactive', () => {
    renderCard();
    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    // Should show all indicators
    expect(screen.getByText('Child incidents')).toBeInTheDocument();
    expect(screen.getByText('New recipient')).toBeInTheDocument();
    expect(screen.getByText('Deficiency')).toBeInTheDocument();
    expect(screen.getByText('New staff')).toBeInTheDocument();
    expect(screen.getByText('No TTA')).toBeInTheDocument();
    expect(screen.getByText('DRS')).toBeInTheDocument();
    expect(screen.getByText('FEI')).toBeInTheDocument();
  });

  it('handles recipient with all indicators active', () => {
    const allActiveRecipient = {
      ...mockRecipient,
      childIncidents: true,
      deficiency: true,
      newRecipients: true,
      newStaff: true,
      noTTA: true,
      DRS: true,
      FEI: true,
    };

    const { container } = render(
      <BrowserRouter>
        <RecipientSpotlightCard recipient={allActiveRecipient} />
      </BrowserRouter>,
    );

    const filledBoxes = container.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledBoxes.length).toBe(7);
  });

  it('handles recipient with no active indicators', () => {
    const noIndicatorsRecipient = {
      ...mockRecipient,
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
    };

    const { container } = render(
      <BrowserRouter>
        <RecipientSpotlightCard recipient={noIndicatorsRecipient} />
      </BrowserRouter>,
    );

    const filledBoxes = container.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledBoxes.length).toBe(0);
  });

  it('displays correct indicator descriptions', () => {
    renderCard();
    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    expect(screen.getByText(/Recipient has experienced more than one child incident/)).toBeInTheDocument();
    expect(screen.getByText(/Recipient is in the first 4 years as a Head Start program/)).toBeInTheDocument();
  });

  it('renders expander button even when no indicators are active', () => {
    const noIndicatorsRecipient = {
      ...mockRecipient,
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
    };

    const { container } = render(
      <BrowserRouter>
        <RecipientSpotlightCard recipient={noIndicatorsRecipient} />
      </BrowserRouter>,
    );

    // Expander button should now render even with 0 count
    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    expect(expandButton).toBeInTheDocument();

    const filledBoxes = container.querySelectorAll('.ttahub--indicator-box-filled');
    expect(filledBoxes.length).toBe(0);
  });

  it('displays success message when expanded with zero indicators', () => {
    const noIndicatorsRecipient = {
      ...mockRecipient,
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
    };

    render(
      <BrowserRouter>
        <RecipientSpotlightCard recipient={noIndicatorsRecipient} />
      </BrowserRouter>,
    );

    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('No priority indicators identified')).toBeInTheDocument();
    expect(screen.getByText('0 of 7 priority indicators')).toBeInTheDocument();
  });

  it('displays green checkmark when zero indicators are expanded', () => {
    const noIndicatorsRecipient = {
      ...mockRecipient,
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
    };

    const { container } = render(
      <BrowserRouter>
        <RecipientSpotlightCard recipient={noIndicatorsRecipient} />
      </BrowserRouter>,
    );

    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    // Check for SVG with green fill color
    const svg = container.querySelector('svg path[fill="#00A91C"]');
    expect(svg).toBeInTheDocument();
  });

  it('does not display success message when indicators are present', () => {
    renderCard(); // Uses mockRecipient with 2 active indicators

    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    // Should NOT show success message
    expect(screen.queryByText('No priority indicators identified')).not.toBeInTheDocument();

    // Should show count
    expect(screen.getByText('2 of 7 priority indicators')).toBeInTheDocument();
  });

  it('renders all 7 indicator types when all are active', () => {
    const allActiveRecipient = {
      ...mockRecipient,
      childIncidents: true,
      deficiency: true,
      newRecipients: true,
      newStaff: true,
      noTTA: true,
      DRS: true,
      FEI: true,
    };

    render(
      <BrowserRouter>
        <RecipientSpotlightCard recipient={allActiveRecipient} />
      </BrowserRouter>,
    );

    const expandButton = screen.getByRole('button', { name: /indicators for recipient/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('Child incidents')).toBeInTheDocument();
    expect(screen.getByText('Deficiency')).toBeInTheDocument();
    expect(screen.getByText('DRS')).toBeInTheDocument();
    expect(screen.getByText('FEI')).toBeInTheDocument();
    expect(screen.getByText('New recipient')).toBeInTheDocument();
    expect(screen.getByText('New staff')).toBeInTheDocument();
    expect(screen.getByText('No TTA')).toBeInTheDocument();
  });

  it('assigns correct test id to DataCard', () => {
    const { container } = renderCard();
    const card = container.querySelector('[data-testid="recipient-spotlight-card-1"]');
    expect(card).toBeInTheDocument();
  });
});
