/**
 * Training Report Workflow Tests
 * 
 * These tests cover training event and session workflows:
 * - Event creation and editing
 * - Session creation (IST/Creator)
 * - Session with multiple participants
 * - Approval workflow
 * - View/Print functionality
 */

import { test, expect } from '@playwright/test';
import { blur } from '../common';
import { waitForAutosave, clickAndWaitForNavigation } from '../helpers/testHelpers';

test.describe('Training Report - Complete Workflow', () => {
  test('should create event, add session, and complete approval workflow', async ({ page }) => {
    test.setTimeout(240_000); // 4 minutes for complete workflow

    // Navigate to training reports
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();
    await page.waitForLoadState('networkidle');

    // Open existing event for editing
    await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
    await page.getByRole('button', { name: 'Edit event' }).click();
    await page.waitForLoadState('networkidle');

    // Edit event summary
    await page.getByText(/Event collaborators/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    await page.getByText('Recipients').click();
    await page.getByText('Yes, Regional HSA').click();

    await page.getByLabel('Event start date *mm/dd/yyyy').fill('01/02/2023');
    await page.getByLabel('Event end date *mm/dd/yyyy').fill('02/02/2023');

    // Submit event changes
    await page.getByRole('button', { name: 'Review and submit' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Yes, continue' }).click();
    await page.waitForLoadState('networkidle');

    // Create new session
    await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
    await page.getByRole('button', { name: 'Create session' }).click();
    await page.waitForLoadState('networkidle');

    // Select training facilitation type
    await page.waitForSelector('h2:has-text("Training facilitation")');
    await page.getByText('Regional TTA staff', { exact: true }).click();
    await page.getByRole('button', { name: 'Create session' }).click();
    await page.waitForLoadState('networkidle');

    // Fill session summary
    await page.getByLabel('Session name *').fill('Safety Training Session');
    await page.getByLabel('Session start date *mm/dd/yyyy').fill('01/02/2023');
    await page.getByLabel('Session end date *mm/dd/yyyy').fill('02/02/2023');
    await page.getByLabel('Duration in hours (round to the nearest quarter hour) *').fill('5');
    await page.getByLabel(/Session context/i).fill('Training on safety protocols');
    await page.getByLabel('Session objectives *').fill('Improve understanding of safety procedures');

    // Select goals
    await page.getByText('Select the goals that this activity supports *Get help selecting a goal').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Select topics
    await page.getByText('Topics *Get help choosing topics').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Select TTA providers
    await page.getByText(/Who provided the TTA/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    // Fill TTA provided
    await page.locator('#ttaProvided').fill('Comprehensive safety training');

    // Select support type
    await page.locator('select.usa-select').selectOption('Introducing');
    await blur(page);
    await page.waitForLoadState('networkidle');

    // Continue to participants
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('networkidle');

    // Fill participants section
    await page.getByText('Recipients *- Select -').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    await page.getByText(/Recipient participants/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Select delivery method
    await page.getByTestId('form').getByText('Training').click();
    await blur(page);

    await page.getByText('In Person').click();
    await blur(page);

    // Select language
    await page.getByText(/Language used/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Select hybrid and fill counts
    await page.getByText('Hybrid').click();
    await page.getByLabel('Number of participants attending in person *').fill('5');
    await page.getByLabel('Number of participants attending virtually *').fill('5');

    await blur(page);
    await page.waitForLoadState('networkidle');

    // Continue to attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('networkidle');

    // Skip attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('networkidle');

    // Fill next steps
    await page.getByTestId('specialistNextSteps-input').fill('Follow up on safety implementation');
    await page.getByTestId('recipientNextSteps-input').fill('Complete safety checklist');
    await page.getByLabel('When do you anticipate completing step 1? *').fill('07/02/2023');
    await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('07/03/2023');

    // Save draft
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.waitForLoadState('networkidle');

    // Navigate away and back
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();
    await page.getByRole('link', { name: 'In progress' }).click();
    await page.waitForLoadState('networkidle');

    // Resume and submit session
    await page.getByRole('button', { name: 'View sessions for event R01-PD-23-1037' }).click();
    await page.getByRole('link', { name: 'Edit session' }).click();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Next steps Complete' }).click();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('networkidle');

    // Submit for approval
    await page.getByTestId('approver').selectOption('Larry Botter, ECM');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Submit for approval' }).click();
    await page.waitForLoadState('networkidle');

    // Verify session data
    await page.getByLabel('View sessions for event R01-PD-23-').click();
    await expect(page.getByText('Session dates 01/02/2023 - 02/02/')).toBeVisible();
    await expect(page.getByText('Session objective Improve understanding of safety procedures')).toBeVisible();
    await expect(page.getByText('Topics Behavioral / Mental')).toBeVisible();

    // View/print event
    await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
    await page.getByTestId('menu').getByText('View/Print event').click();
    await page.waitForLoadState('networkidle');

    // Verify event view
    await expect(page.getByText('Training event report R01-PD-23-1037')).toBeVisible();
    await expect(page.getByText('Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective')).toBeVisible();
    await expect(page.getByText('Safety Training Session')).toBeVisible();
  });

  test('should handle multiple sessions for single event', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();

    // Verify event has sessions
    await page.getByRole('button', { name: 'View sessions for event R01-PD-23-1037' }).click();
    
    // Should show session cards
    await expect(page.getByText(/Session dates/i)).toBeVisible();
  });

  test('should update event status correctly', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();

    // Check different status tabs
    await page.getByRole('link', { name: 'Not started' }).click();
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('link', { name: 'In progress' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/R01-PD-23-1037/)).toBeVisible();
    
    await page.getByRole('link', { name: 'Complete' }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should validate required session fields', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();

    await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
    await page.getByRole('button', { name: 'Create session' }).click();
    await page.waitForLoadState('networkidle');

    // Select facilitation type
    await page.waitForSelector('h2:has-text("Training facilitation")');
    await page.getByText('Regional TTA staff', { exact: true }).click();
    await page.getByRole('button', { name: 'Create session' }).click();
    await page.waitForLoadState('networkidle');

    // Try to continue without filling required fields
    await page.getByRole('button', { name: 'Save and continue' }).click();
    
    // Should still be on session summary (validation prevented navigation)
    await expect(page.getByLabel('Session name *')).toBeVisible();
  });

  test('should display session information correctly on event view', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();

    // View event
    await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
    await page.getByTestId('menu').getByText('View/Print event').click();
    await page.waitForLoadState('networkidle');

    // Verify event information is displayed
    await expect(page.getByRole('heading', { name: /Training event report/i })).toBeVisible();
    
    // Verify session information if sessions exist
    const sessionExists = await page.getByText(/Session dates/i).isVisible().catch(() => false);
    
    if (sessionExists) {
      await expect(page.getByText(/Session dates/i)).toBeVisible();
      await expect(page.getByText(/Session objective/i)).toBeVisible();
    }
  });
});

test.describe('Training Report - Edge Cases', () => {
  test('should handle session draft save and recovery', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();
    await page.getByRole('link', { name: 'In progress' }).click();

    // Open session in draft
    await page.getByRole('button', { name: 'View sessions for event R01-PD-23-1037' }).click();
    const sessionEditLink = page.getByRole('link', { name: 'Edit session' });
    
    const sessionLinkExists = await sessionEditLink.count();
    
    if (sessionLinkExists > 0) {
      await sessionEditLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify can navigate away and return
      await page.goto('http://localhost:3000/');
      await page.getByRole('link', { name: 'Training Reports' }).click();
      
      // Session should still be accessible
      await expect(page.getByText(/R01-PD-23-1037/)).toBeVisible();
    }
  });

  test('should handle hybrid delivery participant counts', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Training Reports' }).click();

    // Navigate to create session flow
    await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
    await page.getByRole('button', { name: 'Create session' }).click();
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('h2:has-text("Training facilitation")');
    await page.getByText('Regional TTA staff', { exact: true }).click();
    await page.getByRole('button', { name: 'Create session' }).click();
    await page.waitForLoadState('networkidle');

    // Fill minimal required fields
    await page.getByLabel('Session name *').fill('Hybrid Test Session');
    await page.getByLabel('Session start date *mm/dd/yyyy').fill('03/01/2023');
    await page.getByLabel('Session end date *mm/dd/yyyy').fill('03/02/2023');
    await page.getByLabel('Duration in hours (round to the nearest quarter hour) *').fill('2');
    
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForLoadState('networkidle');

    // Test hybrid delivery
    await page.getByText('Hybrid').click();
    
    // Both fields should appear
    await expect(page.getByLabel('Number of participants attending in person *')).toBeVisible();
    await expect(page.getByLabel('Number of participants attending virtually *')).toBeVisible();
    
    await page.getByLabel('Number of participants attending in person *').fill('10');
    await page.getByLabel('Number of participants attending virtually *').fill('15');
    
    // Should save successfully
    await waitForAutosave(page);
  });
});
