import { test, expect } from '@playwright/test';
import { blur } from './common';

test('can fill out and complete a training and session report', async ({ page }) => {
  // navigate to training reports
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Training Reports' }).click();
  await page.getByRole('link', { name: 'R01-PD-23-1037' }).click();

  // event summary
  await page.getByText(/Event collaborators/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); 

  await page.getByText(/Event region point of contact/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); 
  await page.getByText('Recipients').click();
  await page.getByLabel('Event start date *mm/dd/yyyy').fill('01/02/2023');
  await page.getByLabel('Event end date *mm/dd/yyyy').fill('02/02/2023');
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // event vision and goal
  await page.getByLabel('Event goal *').fill('Event goal');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Submit event' }).click();

  // verify event cannot be submitted
  expect(page.getByText('Event must be complete to submit')).toBeTruthy();

  // go back to training reports and create a session
  await page.getByRole('link', { name: 'Back to Training Reports' }).click();
  await page.getByTestId('ellipsis-button').click();
  await page.getByRole('button', { name: 'Create session' }).click();

  // session summary
  await page.waitForTimeout(2000); // wait for first post to complete
  await page.getByLabel('Session name *').fill('First session');
  await page.getByLabel('Session start date *mm/dd/yyyy').fill('01/02/2023');
  await page.getByLabel('Session end date *mm/dd/yyyy').fill('02/02/2023');
  await page.getByLabel('Duration in hours (round to the nearest quarter hour) *').fill('5');
  await page.getByLabel('Session context *').fill('Context');
  await page.getByLabel('Session objective *').fill('Objective');

  await page.getByText('Topics *Get help choosing topics').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.getByText(/Who were the trainers for this session/i).click()
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.locator('#ttaProvided').fill('TTA');

  await page.getByTestId('dropdown').selectOption('Introducing');
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await page.waitForTimeout(5000);

  // session participants
  await page.getByText(/Recipients/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByText(/Recipient participants/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByText('Hybrid').click();
  await page.getByLabel('Number of participants attending in person *').fill('5');
  await page.getByLabel('Number of participants attending virtually *').fill('5');

  await page.getByRole('button', { name: 'Save and continue' }).click();

  // supporting attachments.
  await page.getByRole('button', { name: 'Save and continue' }).click();

  // next steps
  await page.getByTestId('specialistNextSteps-input').fill('Next step');
  await page.getByTestId('recipientNextSteps-input').fill('test ');
  await page.getByLabel('When do you anticipate completing step 1? *').fill('07/02/2023');
  await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('07/03/2023');
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Training Reports' }).click();
  await page.getByRole('link', { name: 'In progress' }).click();

  // edit session and save changes
  await page.getByRole('button', { name: 'View sessions for event R01-PD-23-1037' }).click();
  await page.getByRole('link', { name: 'Edit session' }).click();
  await page.getByLabel('Session name *').fill('First session revised');

  await page.getByRole('button', { name: 'Complete session Not Started' }).click();

  // complete session 
  await page.getByTestId('dropdown').selectOption('Complete');
  await page.getByRole('button', { name: 'Submit session' }).click();

  // complete event
  await page.getByTestId('ellipsis-button').click();
  await page.getByRole('button', { name: 'Edit event' }).click();
  await page.getByText(/complete event/i).click();
  await page.getByTestId('dropdown').selectOption('Complete');
  await page.getByRole('button', { name: 'Submit event' }).click();

  await page.waitForTimeout(2000); // waiting for navigation

  // view event
  await page.getByTestId('ellipsis-button').click();
  await page.getByTestId('menu').getByTestId('button').click();

  await page.waitForTimeout(2000); // waiting for navigation

  // verify event view
  expect(page.getByText('Training event report R01-PD-23-1037')).toBeTruthy();
  expect(page.getByText('Health Webinar Series: Oral Health and Dental Care from a Regional and State Perspective')).toBeTruthy();

  expect(page.getByText('First session revised')).toBeTruthy();
});