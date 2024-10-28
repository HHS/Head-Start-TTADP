import { test, expect } from '@playwright/test';
import { blur } from './common';

test.describe('Recipient record', () => {
  test('create a basic goal', async ({ page }) => {  
    await page.goto('http://localhost:3000/');

    // navigate through the recipient record tabs
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'TTA History' }).click();

    // remove a filter
    await page.getByRole('button', { name: /This button removes the filter: Date started \(ar\) is within/i }).click();

    // goals and objectives, add a new goal
    await page.getByRole('link', { name: 'RTTAPA' }).click();
    await page.getByRole('link', { name: 'Add new goals' }).click();

    // save first goal, without an objective
    // click inside of the grants multi-select dropdown
    await page.getByText('Recipient grant numbers *').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // select a second grant as well
    await page.keyboard.press('Enter');

    await blur(page);

    await page.getByTestId('textarea').fill('This is the first goal for this recipient');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // edit that goal to add an objective
    await page.getByTestId('ellipsis-button').first().click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Add new objective' }).click();
    await page.getByLabel('TTA objective *').fill('A new objective');

    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Submit goal' }).click();

    // verify the goal appears in the table
    await expect(page.getByText('This is the first goal for this recipient')).toBeVisible();
  });

  test('closes a goal', async ({ page }) => {  
    await page.goto('http://localhost:3000/');

    // navigate through the recipient record tabs
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'TTA History' }).click();

    // goals and objectives, add a new goal
    await page.getByRole('link', { name: 'RTTAPA' }).click();
    await page.getByRole('link', { name: 'Add new goals' }).click();

    // save first goal, without an objective
    // click inside of the grants multi-select dropdown
    await page.getByText('Recipient grant numbers *').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // select a second grant as well
    await page.keyboard.press('Enter');

    await blur(page);

    await page.getByTestId('textarea').fill('This is the second goal for this recipient');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // edit that goal to add an objective
    await page.getByTestId('ellipsis-button').first().click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Add new objective' }).click();
    await page.getByLabel('TTA objective *').fill('A new objective for this second goal');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Submit goal' }).click();
  
    // verify the goal appears in the table
    await expect(page.getByText('This is the second goal for this recipient')).toBeVisible();

    // get container for the goal
    const goal = page.getByTestId('goalCard').filter({ 
      hasText: 'This is the second goal for this recipient' }
    );

    await goal.getByRole('button').first().click();
    await goal.getByText(/closed/i).click();

    // expect error
    await expect(page.getByText(/The goal status cannot be changed until all In progress objectives are complete or suspended./i)).toBeVisible();

    await goal.getByRole('button', { name: /view objectives for goal/i }).click();

    const objective = goal.getByTestId('objectiveList').first();
    await objective.getByRole('button').first().click();
    await objective.getByRole('button', { name: /complete/i }).click();
    await page.waitForTimeout(3000);
    await goal.getByRole('button').first().click();
    await goal.getByText(/closed/i).click();
    await page.waitForTimeout(3000);
    await page.getByText(/tta complete/i).click();
    await page.getByRole('button', { name: 'Change goal status' }).click();
  });
});
