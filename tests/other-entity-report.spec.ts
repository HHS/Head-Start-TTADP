import { test, expect } from '@playwright/test';
import { describe } from 'node:test';

async function blur(page) {
  await page.getByText('Office of Head Start TTA Hub').click();
}

describe('other entity report', () => {
  test('create a report with two other entities and one objective', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // create a new report
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();
      
    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);
   
    // select two recipiients
    await page.locator('label').filter({ hasText: 'Other entity' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0').click();
    await page.locator('#react-select-3-option-1').click();

    // cycle through the side nav
    await page.getByRole('button', { name: 'Goals and objectives Not started' }).click();
    await page.getByRole('button', { name: 'Supporting attachments Not started' }).click();
    await page.getByRole('button', { name: 'Next steps Not started' }).click();
    await page.getByRole('button', { name: 'Review and submit' }).click();
    
    // fill out the activity summary
    await page.getByRole('button', { name: 'Activity summary In Progress' }).click();
    await page.locator('#targetPopulations div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-19-option-0').click();
    await page.locator('.smart-hub-activity-report > div:nth-child(2) > div:nth-child(2)').click();
    await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient. *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.getByRole('group', { name: 'Reason for activity' }).getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-21-option-0').click();
    await page.getByLabel(/Start date/i).fill('04/05/2021');
    await page.getByLabel('End date *mm/dd/yyyy').fill('05/07/2021');
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('2');
    await page.getByRole('group', { name: 'What TTA was provided *' }).getByText('Training').click();
    await page.getByText('Virtual').click();
    await page.getByText('Video').click();
    await page.locator('#participants div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-23-option-1').click();
    await page.locator('#react-select-23-option-3').click();
    await page.locator('.smart-hub-activity-report > div:nth-child(2) > div').first().click();
    await page.getByLabel('Number of participants involved *').click();
    await page.getByLabel('Number of participants involved *').fill('3');   
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out the objectives form
    await page.getByRole('button', { name: 'Add new objective' }).click();

    await page.getByTestId('textarea').fill('test');

    // fill in an invalid resource
    await page.getByTestId('textInput').fill('asdfasdf');

    // select a topic
    await page.locator('.css-125guah-control').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // clear out the invalid resource
    await page.getByTestId('textInput').fill('');

    // add tta provided
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');

    await page.getByRole('button', { name: 'Save objectives' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // skip supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out next steps
    await page.getByTestId('specialistNextSteps-input').click();
    await page.getByTestId('specialistNextSteps-input').fill('1');
    await page.getByLabel('When do you anticipate completing step 1? *').click();
    await page.getByLabel('When do you anticipate completing step 1? *').fill('12/01/2050');
    await page.getByTestId('recipientNextSteps-input').click();
    await page.getByTestId('recipientNextSteps-input').fill('2');
    await page.getByLabel('When does the other entity anticipate completing step 1? *').click();
    await page.getByLabel('When does the other entity anticipate completing step 1? *').fill('12/01/2050');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // select an approver
    await page.getByLabel(/Approving manager/i).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // extract the AR number from the URL:
    const url = page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    await blur(page);

    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();

    // verify draft report in table
    await expect(page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
  });
})
