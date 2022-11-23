import { test, expect } from '@playwright/test';

test.describe("Activity Report", () => {
  test('can create an AR with multiple goals, submit for review, and review', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();
    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0-0').click();
    await page.getByText('Office of Head Start TTA Hub').click();
    await page.locator('#targetPopulations div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-7-option-0').click();
    await page.getByText('Office of Head Start TTA Hub').click();
    await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient. *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.getByRole('group', { name: 'Reason for activity' }).getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-9-option-0').click();
    await page.getByText('Office of Head Start TTA Hub').click();
    await page.getByLabel('Start date *mm/dd/yyyy').click();
    await page.getByLabel('Start date *mm/dd/yyyy').fill('12/01/2020');
    await page.getByLabel('End date *mm/dd/yyyy').click();
    await page.getByLabel('End date *mm/dd/yyyy').fill('12/01/2050');
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').click();
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('5');
    await page.getByRole('group', { name: 'What TTA was provided *' }).getByText('Training').click();
    await page.getByText('Virtual').click();
    await page.getByText('Video').click();
    await page.locator('#participants div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-11-option-0').click();
    await page.getByText('Office of Head Start TTA Hub').click();
    await page.getByLabel('Number of participants involved *').click();
    await page.getByLabel('Number of participants involved *').fill('5');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // create the first goal
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-15-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g1');
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g1o1');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-21-option-0').click();
    await page.getByText('Office of Head Start TTA Hub').click();
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // extract the AR number from the URL:
    const url = await page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // create the second goal
    await page.getByRole('button', { name: 'Add new goal' }).click();
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g2');
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('Yes').click();
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-25-option-0').click();
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g2o1');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await page.getByText('Office of Head Start TTA Hub').click(); 
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // move to next steps
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // continue from supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out next steps
    await page.getByTestId('specialistNextSteps-input').click();
    await page.getByTestId('specialistNextSteps-input').fill('1');
    await page.getByLabel('When do you anticipate completing step 1? *').click();
    await page.getByLabel('When do you anticipate completing step 1? *').fill('12/01/2050');
    await page.getByTestId('recipientNextSteps-input').click();
    await page.getByTestId('recipientNextSteps-input').fill('2');
    await page.getByLabel('When does the recipient anticipate completing step 1? *').click();
    await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('12/01/2050');

    // move to review and submit
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.locator('.css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await page.getByText('Office of Head Start TTA Hub').click();
    
    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();

    await page.waitForTimeout(5000);

    // extract the region number from the URL, when the URL looks like this: 'http://localhost:3000/activity-reports?region.in[]=8'
    const url2 = await page.url();
    const regionNumber = url2.split('=').find((part) => /^\d+$/.test(part));

    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();

    expect(await page.getByTestId('accordionButton_activity-summary')).toHaveText('Activity summary');

    // expect the page to have text 'g1' and 'g1o1'
    expect(await page.getByText('g1')).toBeTruthy();
    expect(await page.getByText('g1o1')).toBeTruthy();

    // expect the page to have text 'g2' and 'g2o1'
    expect(await page.getByText('g2')).toBeTruthy();
    expect(await page.getByText('g2o1')).toBeTruthy();

    expect(await page.getByText('SuccessThis report was successfully submitted for approval')).toBeTruthy();

    expect(await page.getByRole('button', { name: 'Reset to Draft' })).toBeTruthy();

  });
})