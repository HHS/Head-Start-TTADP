import { test, expect } from '@playwright/test';
import { blur } from './common';
import { query } from '../utils/common';

test.beforeAll(async ({ request }) => {
  // Set user to a temporary admin.
  await query(request, 'insert into "Permissions" ("userId", "regionId", "scopeId") values (5, 1, 2);')
});

test.afterAll(async ({ request }) => {
  // Remove the temporary admin.
  await query(request, 'delete from "Permissions" where "userId" = 5 AND "regionId" = 1 AND "scopeId" = 2;')
});

test('can fill out and complete a training and session report', async ({ page}) => {
  // navigate to training reports
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Training Reports' }).click();

  // Edit the event (use Actions menu instead of clicking the event ID link)
  await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
  await page.getByRole('button', { name: 'Edit event' }).click();

  // event summary
  await page.getByText(/Event collaborators/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByText('Recipients').click();

  await page.getByText('Yes, Regional HSA').click();

  await page.getByLabel('Event start date *mm/dd/yyyy').fill('01/02/2023');
  await page.getByLabel('Event end date *mm/dd/yyyy').fill('02/02/2023');

  await page.getByRole('button', { name: 'Review and submit' }).click();

  // Click the modal 'Yes, and continue' button.
  await page.waitForLoadState('networkidle'); // wait for form submission to complete
  await page.getByRole('button', { name: 'Yes, continue' }).click();

  // Back on the TR page click create session.
  await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
  await page.getByRole('button', { name: 'Create session' }).click();

  // New: Handle the "Training facilitation" page
  await page.waitForSelector('h2:has-text("Training facilitation")');
  // Click the label text instead of the radio button to avoid viewport issues
  await page.getByText('Regional TTA staff', { exact: true }).click();
  await page.getByRole('button', { name: 'Create session' }).click();

  // IST/Creator session summary
  await page.waitForLoadState('networkidle'); // wait for navigation to complete
  await page.getByLabel('Session name *').fill('First session');
  await page.getByLabel('Session start date *mm/dd/yyyy').fill('01/02/2023');
  await page.getByLabel('Session end date *mm/dd/yyyy').fill('02/02/2023');
  await page.getByLabel('Duration in hours (round to the nearest quarter hour) *').fill('5');
  await page.getByLabel('Session context *').fill('Context');
  await page.getByLabel('Session objectives *').fill('Objective');

  await page.getByText('Select the goals that this activity supports *Get help selecting a goal').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.getByText('Topics *Get help choosing topics').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.getByText(/Who provided the TTA/i).click()
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');

  await page.locator('#ttaProvided').fill('TTA');

  await page.locator('select.usa-select').selectOption('Introducing');
  await blur(page);
  await page.waitForLoadState('networkidle'); // wait for autosave to complete
  // Click Save and continue.
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await page.waitForLoadState('networkidle'); // wait for navigation to complete

  await page.getByText('Recipients *- Select -').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByText(/Recipient participants/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByTestId('form').getByText('Training').click();
  await blur(page);

  await page.getByText('In Person').click();
  await blur(page);

  await page.getByText(/Language used/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByText('Hybrid').click();
  await page.getByLabel('Number of participants attending in person *').fill('5');
  await page.getByLabel('Number of participants attending virtually *').fill('5');

  await blur(page);
  await page.waitForLoadState('networkidle'); // wait for autosave
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // supporting attachments.
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // next steps
  await page.getByTestId('specialistNextSteps-input').fill('Next step');
  await page.getByTestId('recipientNextSteps-input').fill('test ');
  await page.getByLabel('When do you anticipate completing step 1? *').fill('07/02/2023');
  await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('07/03/2023');

  // Save POC session draft.
  await page.getByRole('button', { name: 'Save draft' }).click();

 // Leave the session.
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Training Reports' }).click();
  await page.getByRole('link', { name: 'In progress' }).click();

  // edit session and submit changes
  await page.getByRole('button', { name: 'View sessions for event R01-PD-23-1037' }).click();
  await page.getByRole('link', { name: 'Edit session' }).click();
  await page.getByRole('button', { name: 'Next steps Complete' }).click();
  await page.waitForLoadState('networkidle'); // wait for navigation to complete
  await page.getByRole('button', { name: 'Review and submit' }).click();

  await page.waitForLoadState('networkidle'); // waiting for form submission to complete
  await page.getByRole('button', { name: 'Submit for approval' }).click();

  await page.waitForLoadState('networkidle'); // waiting for navigation to complete

  // verify session data entry
  await page.getByLabel('View sessions for event R01-PD-23-').click();
  expect(page.getByText('Session dates 01/02/2023 - 02/02/')).toBeTruthy();
  expect(page.getByText('Session objective Objective')).toBeTruthy();
  expect(page.getByText('Session objective Objective')).toBeTruthy();
  expect(page.getByText('Topics Behavioral / Mental')).toBeTruthy();

  // view/print event
  await page.getByRole('button', { name: 'Actions for event R01-PD-23-1037' }).click();
  await page.getByTestId('menu').getByText('View/Print event').click();

  await page.waitForLoadState('networkidle'); // waiting for navigation

  // verify event view
  expect(page.getByText('Training event report R01-PD-23-1037')).toBeTruthy();
  expect(page.getByText('Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective')).toBeTruthy();

  expect(page.getByText('First session')).toBeTruthy();
});