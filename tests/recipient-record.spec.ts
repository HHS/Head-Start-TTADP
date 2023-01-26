import { test, expect } from '@playwright/test';

test.describe('Recipient record', () => {
  test('create a basic goal', async ({ page }) => {  
    await page.goto('http://localhost:3000/');

    // navigate through the recipient record tabs
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'TTA History' }).click();

    // remove a filter
    await page.getByRole('button', { name: /This button removes the filter: Date started is within/i }).click();

    // goals and objectives, add a new goal
    await page.getByRole('link', { name: 'Goals & Objectives' }).click();
    await page.getByRole('link', { name: 'Add new goals' }).click();

    // save first goal, without an objective
    // click inside of the grants multi-select dropdown
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').first().click();
    await page.keyboard.press('Enter');
    // select a second grant as well
    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').fill('This is the first goal for this recipient');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // edit that goal to add an objective
    await page.getByTestId('ellipsis-button').first().click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Add new objective' }).click();
    await page.getByLabel('TTA objective *').fill('A new objective');

    // try it with an invalid URL
    await page.getByTestId('textInput').fill('FISH BANANA GARBAGE MAN');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Enter one resource per field. Valid resource links must start with http:// or https://')).toBeVisible();

    await page.getByTestId('textInput').fill('HTTP:// FISH BANANA GARBAGE MAN');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Enter one resource per field. Valid resource links must start with http:// or https://')).toBeVisible();

    await page.getByTestId('textInput').fill('http://www.fish-banana-garbage-man.com');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
    // locate the topics dropdown
    await page.locator('.css-g1d714-ValueContainer').last().click();
    await page.keyboard.press('Enter');
    // enter second topic as well
    await page.keyboard.press('Enter');
    // first click blurs
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Submit goal' }).click();

    // verify the goal appears in the table
    await expect(page.getByText('This is the first goal for this recipient')).toBeVisible();
  });
});