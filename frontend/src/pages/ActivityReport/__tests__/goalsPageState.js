/* eslint-disable max-len */
import '@testing-library/jest-dom';
import {
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { renderActivityReport, formData, mockGoalsAndObjectives } from '../testHelpers';

describe('Goals & Objectives page state', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  const setupCommonMocks = (dataOverride) => {
    const data = { ...formData(), ...dataOverride };
    // Ensure the Goals & Objectives page initially appears Not started to prove transition.
    data.pageState = {
      1: 'Not started',
      2: 'Not started',
      3: 'Not started',
      4: 'Not started',
    };

    fetchMock.get('/api/activity-reports/1', data);
    // Generic mocks used by the Goals & Objectives page effects.
    fetchMock.get(/\/api\/goal-templates.*/, []);
    fetchMock.get(/\/api\/activity-reports\/goals.*/, []);
    fetchMock.get('/api/topic', []);
    // Save endpoint.
    fetchMock.put('/api/activity-reports/1', data);
  };

  it('shows In progress after navigating away when goals exist but page is not complete', async () => {
    setupCommonMocks({
      id: 1,
      // A goal with no objectives -> page is not complete
      goals: mockGoalsAndObjectives(false),
      goalForEditing: null,
    });

    // Start on Goals & Objectives
    renderActivityReport('1', 'goals-objectives');

    // Navigate to Supporting attachments (this triggers a save and pageState recalculation)
    const attachmentsBtn = await screen.findByRole('button', { name: /supporting attachments/i });
    userEvent.click(attachmentsBtn);

    // Wait for navigation/save effects and assert Goals & Objectives shows In progress
    await waitFor(async () => {
      const goalsNavBtn = await screen.findByRole('button', { name: /goals and objectives in progress/i });
      expect(goalsNavBtn).toBeVisible();
    });
  });

  it('shows In progress after navigating away when a goal is being edited (form open)', async () => {
    setupCommonMocks({
      id: 1,
      // No selected goals yet
      goals: [],
      // Goal form is open with minimal fields
      goalForEditing: {
        id: 'temp-1',
        name: 'Draft goal',
        endDate: '',
        objectives: [],
        grantIds: [1],
      },
      goalPrompts: [],
    });

    // Start on Goals & Objectives
    renderActivityReport('1', 'goals-objectives');

    // Navigate to Supporting attachments (this triggers draft save for navigation from goals page)
    const attachmentsBtn = await screen.findByRole('button', { name: /supporting attachments/i });
    userEvent.click(attachmentsBtn);

    // Wait for navigation/save effects and assert Goals & Objectives shows In progress
    await waitFor(async () => {
      const goalsNavBtn = await screen.findByRole('button', { name: /goals and objectives in progress/i });
      expect(goalsNavBtn).toBeVisible();
    });
  });
});
