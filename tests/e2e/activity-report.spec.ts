/* eslint-disable jest/no-done-callback */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
import { test, expect, Page } from '@playwright/test';
import { blur } from './common';

async function getFullName(page: Page) {
  await page.goto('/');
  const welcomeText = page.getByRole('heading', { name: /welcome to the tta hub,/i });
  const text = await welcomeText.textContent();
  return text ? text.replace(/welcome to the tta hub, /i, '') : '';
}
/**
 * Formats goals from the heading string to use in the "View objective (x)" selectors
 *
 * @remarks
 * A sample heading string: "Goal G-5, G-6RTTAPA"
 * Would return "G-5G6"
 * @param headingString - string to extract goals from
 */
function getGoals(headingString: string) {
  const goal1 = headingString.split(' ')[1].split(',')[0];
  const goal2 = headingString.split(' ')[2].split('RTTAPA')[0];
  return `${goal1}${goal2}`;
}

/**
 *
 * Given a page, returns the region number from the heading text
 *
 * @param page {Page}
 * @returns string
 */
async function getRegionNumber(page: Page) {
  const heading = page.getByRole('heading', { name: /activity report for region \d/i });
  return heading.textContent().then((text) => text!.match(/\d/)![0]);
}

/**
 * Extracts a recipient name from the "Activity participant" review section display
 *
 * @remarks
 * A sample Activity participants input: "Agency 1.a in region 1, Inc. - 01HP044444  - ECS"
 * Would return "Agency 1.a in region 1, Inc."
 * @param page - the page object
 */
async function getRecipient(page: Page) {
  const recipient = page.locator('[aria-label="Activity participants 1"]');
  const text = await recipient.textContent();
  return text ? text.split('-')[0].trim() : '';
}

/**
 * Extracts the grant numbers from the recipients string
 *
 * @remarks
 * A sample Activity participants input: "Agency 1.a in region 1, Inc. - 01HP044444  - ECS,
 * Agency 1.a in region 1, Inc. - 01HP044445" would return "01HP044444, 01HP044445"
 * Note - there is a bug currently that displays the grant number in a descending order,
 * hence a need to temporarily reverse the returned array to return "01HP044445, 01HP04444"
 * instead
 * @param recipients - the recipients string
 */
function getGrants(recipients: string): string[] {
  const recArray = recipients.split(', ');
  // remove potential elements without grant numbers
  const recArrayGrants = recArray.filter((el) => el.indexOf(' - ') > 0);

  return recArrayGrants
    .map((r) => r.split('-')[1].trim())
    .toString()
    .replace(',', ' ')
    .replace(/\s+/g, ' ')
    .split(' ');
}

/**
 * Extracts the text of the dropdown's selected value
 *
 * @param selectedOption - dropdown
 */
async function extractSelectedDisplayedValue(selectedOption) {
  return selectedOption.evaluate((sel) => sel.options[sel.options.selectedIndex].textContent);
}

interface ActivitySummaryConfig {
  recipients?: number;
  ttaType?: 'Training' | 'Technical Assistance' | 'Both';
}

const defaultActivitySummaryConfig = {
  recipients: 2,
  ttaType: 'Training',
} as ActivitySummaryConfig;

/**
 *
 * @param page {Page}
 * @param recipients {number} how many recipients to select, starting at the top of the list
 */
async function activitySummary(
  page: Page,
  config: ActivitySummaryConfig = defaultActivitySummaryConfig,
) {
  const { recipients, ttaType } = { ...defaultActivitySummaryConfig, ...config,  };

  await page.getByRole('group', { name: /Was this activity for a recipient or other entity\?/i }).locator('label').filter({ hasText: 'Recipient' }).click();
  await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();

  if (recipients) {
  // select recipients
    for (let i = 0; i < recipients; i++) {
      await page.keyboard.press('Enter'); 
    }
  } else {
    await page.keyboard.press('Enter');
  }

  await blur(page);

  await page.getByText('Target populations addressed *- Select -').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByRole('group', { name: /Who requested this activity\? Use "Regional Office" for TTA not requested by recipient/i }).locator('label').filter({ hasText: 'Recipient' }).click();
  await page.getByRole('group', { name: 'Reason for activity' }).getByTestId('label').click();
  await page.keyboard.type('Change in scope');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByLabel('Start date *mm/dd/yyyy').fill('12/01/2020');
  await page.getByLabel('End date *mm/dd/yyyy').fill('12/01/2050');
  await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('5');
  await page.getByRole('group', { name: /What type of TTA was provided/i }).getByText(ttaType || 'Training').click();
  await page.getByText('Virtual').click();
  await page.getByText('Video').click();
  await page.locator('#participants div').filter({ hasText: '- Select -' }).nth(1).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByText('Language used *- Select -').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByLabel('Number of participants involved *').fill('5');
}

async function nextSteps(page: Page, isForOtherEntity: boolean = false) {
  // determine label for next steps
  const label = isForOtherEntity ? 'other entity' : 'recipient';

  // fill out next steps
  await page.getByTestId('specialistNextSteps-input').click();
  await page.getByTestId('specialistNextSteps-input').fill('1');
  await page.getByLabel('When do you anticipate completing step 1? *').fill('12/01/2050');
  await page.getByTestId('recipientNextSteps-input').click();
  await page.getByTestId('recipientNextSteps-input').fill('2');
  await page.getByLabel(`When does the ${label} anticipate completing step 1? *`).fill('12/01/2050');
}

test.describe('Activity Report', () => {
  test('can create an AR with multiple goals, submit for review, and review', async ({ page }) => {
    const fullName = await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();

    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    const regionNumber = await getRegionNumber(page);

    await activitySummary(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByRole('button', { name: 'Supporting attachments not started' }).click();
    await page.getByRole('button', { name: 'Goals and objectives not started' }).click();

    // create the first goal

    await page.getByLabel(/Select recipient's goal/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g1');
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.getByText(/Select TTA objective/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('g1o1');
    // Topics.
    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);


    // save draft doesn't work with invalid resources
    await page.getByRole('textbox', { name: 'Resource 1' }).fill('banana banana banana');
    await page.getByRole('button', { name: 'Save draft' }).click();

    await expect(page.getByText('Enter one resource per field. Valid resource links must start with http:// or https://')).toBeVisible();

    await page.getByRole('textbox', { name: 'Resource 1' }).clear();
    await page.getByRole('textbox', { name: 'Resource 1' }).fill('https://banana.banana.com');

    // save draft does work with valid resources
    await page.getByRole('button', { name: 'Save draft' }).click();

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('hello');

    const supportType = page.getByRole('combobox', { name: /Support type/i });
    await supportType.selectOption('Implementing');

    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.waitForTimeout(5000);

    // navigate away
    await page.getByRole('button', { name: 'Supporting attachments' }).click();

    // PROBLEM: the side nav is not updating to reflect the saved goal..
    // navigate back
    await page.getByRole('button', { name: 'Goals and objectives' }).click()

    // confirm tta provided is still there (form is still open)
    await page.getByRole('textbox', { name: /TTA provided for objective/i }).click();


    // save goal and go on to create second goal
    await page.getByRole('button', { name: 'Save goal' }).click();

    // extract the AR number from the URL:
    const url = page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // create the second goal
    await page.getByRole('button', { name: 'Add new goal' }).click();

    await page.getByTestId('label').click();

    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').fill('g2');
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.getByText(/Select TTA objective/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);
    await page. locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('g2o1');  
    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await blur(page);

    await page.getByRole('combobox', { name: /Support type/i }).selectOption('Implementing');
    await blur(page);

    await page.waitForTimeout(10000);

    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.waitForTimeout(10000);

    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.waitForTimeout(10000);

    // assert the goals and objectives section is complete
    let sideNavTextContent = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();
   
    await page.waitForTimeout(10000);

    expect(sideNavTextContent?.match(/Complete/i)).toBeTruthy();

    await page.getByRole('button', { name: /Goals and objectives complete/i }).click();
    await page.waitForTimeout(5000);

    // edit the first goal
    await page.getByText('g1', { exact: true }).locator('..').locator('..').getByRole('button')
      .click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // navigate away from the activity report page
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // navigate back to the activity report page & the goals and objectives section
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();
    await page.getByRole('button', { name: 'Goals and objectives' }).click();

    // test to make sure that side nav is updated when a goal is edited
    sideNavTextContent = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();

    expect(sideNavTextContent?.match(/in progress/i)).toBeTruthy();
    
    // save the first goal
    await page.getByRole('button', { name: 'Save goal' }).click();

    // move to next steps
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // continue from supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();

    await nextSteps(page);

    // move to review and submit
    await page.getByRole('button', { name: 'Save and continue' }).click();

    const recipient = await getRecipient(page);
    expect(recipient.length).not.toBe(0);

    // add creator notes
    await page.getByRole('textbox', { name: 'Additional notes' }).locator('div').nth(2).click();
    await page.keyboard.type('these are my creator notes');

    const approverDropdown = page.getByRole('group', { name: 'Review and submit report' }).getByTestId('label');
    await approverDropdown.click();

    // type our name into the dropdown to filter to just us
    await page.keyboard.type(fullName);
    // press Enter to select ourself
    await page.keyboard.press('Enter');

    await blur(page);

    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();

    await page.waitForTimeout(5000);

    // find the recently created AR in the table and navigate to it
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();

    // begin review assertions
    await expect(page.getByText(`${fullName} has requested approval for this activity report`)).toBeVisible();
    await expect(page.getByTestId('accordionButton_activity-summary')).toHaveText('Activity summary');
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Recipient').nth(1)).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Recipient').nth(2)).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Change in Scope', { exact: true })).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Virtual', { exact: true })).toBeVisible();
    await expect(page.getByText('Recipient or other entity', { exact: true })).toBeVisible();
    await expect(page.getByText('Activity participants', { exact: true })).toBeVisible();
    await expect(page.getByText('Collaborating specialists', { exact: true })).toBeVisible();
    await expect(page.getByText('Target populations addressed', { exact: true })).toBeVisible();

    await expect(page.getByText('Goal summary').first()).toBeVisible();
    await expect(page.getByText('Goal summary').nth(1)).toBeVisible();
    await expect(page.getByText('g1', { exact: true } )).toBeVisible();
    await expect(page.getByText('g1o1', { exact: true })).toBeVisible();
    await expect(page.getByText('g2', { exact: true })).toBeVisible();
    await expect(page.getByText('g2o1', { exact: true })).toBeVisible();
    await expect(page.getByText(/these are my creator notes/i)).toBeVisible();
    // end review assertions

    // add manager notes
    await page.getByRole('textbox', { name: 'Manager notes' }).locator('div').nth(2).click();
    await page.keyboard.type('these are my manager notes');

    // set status to approved
    await page.locator('select.usa-select').selectOption('approved');

    // submit approval
    await page.getByTestId('form').getByRole('button', { name: 'Submit' }).click();

    // this is in the 'approved activity reports' table
    await page.getByRole('rowheader', { name: `R0${regionNumber}-AR-${arNumber}` }).click();

    await expect(page.getByRole('heading', { name: `TTA activity report R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
    await expect(page.getByText(/date approved/i)).toBeVisible();

    const recipients = await page.locator('span:near(div:text("Recipient names"))').first().textContent();
    const grants = getGrants(recipients || '');

    // navigate to the Recipient TTA Records page
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    // click on the previously extracted recipient
    await page.getByRole('link', { name: recipient }).click();
    // navigate to the 'Goals & Objectives page
    await page.getByRole('link', { name: 'RTTAPA' }).click();
    // check that previously created goals g1 and g2 are visible
    // Assert there are two instances of 'g1' and 'g2' on the page
    expect(page.getByText('g1', { exact: true }).first()).toBeTruthy();
    expect(page.getByText('g1', { exact: true }).nth(1)).toBeTruthy();


    expect(page.getByText('g2', { exact: true }).first()).toBeTruthy();
    expect(page.getByText('g2', { exact: true }).nth(1)).toBeTruthy();

    /* We have Two goals and Two Recipients this should result in 4 goals */
    // Expand objectives for G1.

    // Scroll until the button with the name 'View objectives for goal G-6' is visible.
    await page.getByRole('button', { name: 'View objectives for goal G-6' }).scrollIntoViewIfNeeded();

    await page.getByRole('button', { name: `View objectives for goal G-6` }).click();

    // Scroll until the button with the name 'View objectives for goal G-5' is visible.
    await page.getByRole('button', { name: 'View objectives for goal G-5' }).scrollIntoViewIfNeeded();

    await page.getByRole('button', { name: `View objectives for goal G-5` }).click();

    expect(page.getByText('g1o1', { exact: true }).first()).toBeTruthy();
    expect(page.getByText('g1o1', { exact: true }).nth(1)).toBeTruthy();
    // verify a link to the activity report is found in the objective section
    expect(page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first()).toBeTruthy();
    expect(page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).nth(1)).toBeTruthy();
    // Access parent with '..'
    expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText('Grant numbers').nth(0)).toBeTruthy();
    expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText('Grant numbers').nth(1)).toBeTruthy();
    // verify the grants are visible in the objective section
    await Promise.all(
      grants.map(async (grant) => expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText(grant)).toBeTruthy()),
    );
    // verify the reason is visible in the objective section
    const goalOneContentA = await page.getByText('g1o1', { exact: true }).first().locator('..').locator('..').textContent();
    expect(goalOneContentA).toContain('Change in Scope');
    expect(goalOneContentA).toContain('Behavioral / Mental Health / Trauma');
    const goalOneContentB = await page.getByText('g1o1', { exact: true }).nth(1).locator('..').locator('..').textContent();
    expect(goalOneContentB).toContain('Change in Scope');
    expect(goalOneContentB).toContain('Behavioral / Mental Health / Trauma');

    // verify the end date is visible in the objective section
    expect(page.getByText('g1o1', { exact: true }).first().locator('..').locator('..').getByText('12/01/2050')).toBeTruthy();
    expect(page.getByText('g1o1', { exact: true }).nth(1).locator('..').locator('..').getByText('12/01/2050')).toBeTruthy();
    // verify the correct status for the objective is visible
    expect(page.getByText('g1o1', { exact: true }).first().locator('..').locator('..').getByText('Not started')).toBeTruthy();
    expect(page.getByText('g1o1', { exact: true }).nth(1).locator('..').locator('..').getByText('Not started')).toBeTruthy();

    // Expand goals for G2.
    await page.getByRole('button', { name: `View objectives for goal G-7` }).click();
    await page.getByRole('button', { name: `View objectives for goal G-8` }).click();

    expect(page.getByText('g2o1', { exact: true }).first()).toBeTruthy();
    expect(page.getByText('g2o1', { exact: true }).nth(1)).toBeTruthy();
    // verify a link to the activity report is found in the objective section
    expect(page.getByText('g2o1', { exact: true }).first().locator('..').locator('..').getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeTruthy();
    expect(page.getByText('g2o1', { exact: true }).nth(1).locator('..').locator('..').getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeTruthy();
    expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText('Grant numbers').first()).toBeTruthy();
    expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText('Grant numbers').nth(1)).toBeTruthy();
    // verify the grants are visible in the objective section
    await Promise.all(
      grants.map(async (grant) => expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText(grant)).toBeTruthy()),
    );
    const goalTwoContentA = await page.getByText('g2o1', {exact: true}).first().locator('..').locator('..').textContent();
    expect(goalTwoContentA).toContain('Change in Scope');
    const goalTwoContentB = await page.getByText('g2o1', {exact: true}).nth(1).locator('..').locator('..').textContent();
    expect(goalTwoContentB).toContain('Change in Scope');
    // verify the end date is visible in the objective section
    expect(page.getByText('g2o1', { exact: true }).first().locator('..').locator('..').getByText('12/01/2050')).toBeTruthy();
    // verify the correct status for the objective is visible
    expect(page.getByText('g2o1', { exact: true }).nth(1).locator('..').locator('..').getByText('Not started')).toBeTruthy();

    // check g1
    await page.getByText('g1', { exact: true }).first().locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
      await page.getByText('g1', { exact: true }).nth(1).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('g1', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('g1', { exact: true })).toBeVisible();
    await expect(page.getByText('g1o1')).toBeVisible();

    await page.getByRole('link', { name: 'Back to RTTAPA' }).click();

    // Check g2
    await page.getByText('g2', { exact: true }).first().locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    await page.getByText('g2', { exact: true }).nth(1).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('g2', { exact: true })).toBeVisible();
    await expect(page.getByText('g2o1')).toBeVisible();
  });

  test('multi recipient goal used on an AR', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    const fullName = await getFullName(page);

    // navigate to the RTR, select a recipient, and click add new goal
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'RTTAPA' }).click();
    await page.getByRole('link', { name: 'Add new goals' }).click();

    await page.waitForTimeout(5000);

    // select recipients
    await page.getByLabel(/recipient grant numbers/i).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // enter goal name
    await page.getByLabel('Recipient\'s goal *').fill('This is a goal for multiple grants');
    await page.getByRole('button', { name: 'Save and continue' }).click();
  
    await page.waitForTimeout(5000);

    // select recipients
    await page.getByLabel(/recipient grant numbers/i).focus();
    // both of the top recipients
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // goal end date
    await page.getByLabel(/anticipated close date/i).fill('01/01/2023');

    // goal source
    await page.getByLabel(/Goal source/i).selectOption('Recipient request');

    // add new objective
    await page.getByRole('button', { name: 'Add new objective' }).click();

    // objective title
    await page.getByLabel('TTA objective *').fill('A new objective');

    // save goal
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Submit goal' }).click();

    // confirm goal is in RTR
    await expect(page.getByText('This is a goal for multiple grants').first()).toBeVisible();
    await expect(page.getByText('This is a goal for multiple grants').nth(1)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Goal G-(\d)/i }).last()).toBeVisible();

    // navigate to the AR page
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    await activitySummary(page, { recipients: 3, ttaType: 'Training' });

    const regionNumber = await getRegionNumber(page);

    await page.waitForTimeout(10000);
    await page.getByRole('button', { name: 'Save and continue' }).click();

    await blur(page);
    await page.waitForTimeout(10000);
    // fill out the goals page
    await page.getByLabel(/Select recipient's goal/i).focus();
    await page.keyboard.type('This is a goal for multiple grants');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(10000);
    await page.getByLabel(/select tta objective/i).focus();
    await page.keyboard.type('A new objective');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await blur(page);
    await page.waitForTimeout(5000);

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).focus();
    await page.keyboard.type('This is a TTA provided for objective');

    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');    
    await blur(page);
    
    const supportType = page.getByRole('combobox', { name: /Support type/i });
    await supportType.selectOption('Implementing');

    await page.getByRole('combobox', { name: 'Status for objective' }).selectOption('In Progress');

    await blur(page);
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // skip supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out next steps
    await nextSteps(page);
    await page.getByRole('button', { name: 'Save and continue' }).click();

    const approverDropdown = page.getByRole('group', { name: 'Review and submit report' }).getByTestId('label');
    await approverDropdown.click();

    // type our name into the dropdown to filter to just us
    await page.keyboard.type(fullName);
    // press Enter to select ourself
    await page.keyboard.press('Enter');

    await blur(page);

    const url = page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();
    await page.waitForTimeout(5000);

    // find the recently created AR in the table and navigate to it
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();

    // set status to approved
    await page.locator('select.usa-select').selectOption('approved');

    // submit approval
    await page.getByTestId('form').getByRole('button', { name: 'Submit' }).click();

    // check first recipient
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'RTTAPA' }).click();

    // confirm goal is in RTR
    await expect(page.getByText('This is a goal for multiple grants').first()).toBeVisible();

    // check second recipient
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 2 in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'RTTAPA' }).click();

    // check page title is updated (formerly TTAHUB-1322.spec.ts)
    expect(await page.title()).toBe('RTTAPA - Agency 2 in region 1, Inc. | TTA Hub');

    await expect(page.getByText('This is a goal for multiple grants').first()).toBeVisible();
    await page.getByRole('button', { name: /View objectives for goal G-(\d)/i }).click();
    await expect(page.getByText('A new objective')).toBeVisible();
    await expect(page.getByText(`Activity reports R01-AR-${arNumber}`)).toBeVisible();
  });


  test('create a report with two other entities and one objective', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // create a new report
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();
      
    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]); 

    await activitySummary(page, { recipients: 2, ttaType: 'Training' });
    
    // select two recipients
    await page.locator('label').filter({ hasText: 'Other entity' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0').click();
    await page.locator('#react-select-3-option-1').click();

    // cycle through the side nav
    await page.getByRole('button', { name: 'Goals and objectives Not started' }).click();
    await page.getByRole('button', { name: 'Supporting attachments Not started' }).click();
    await page.getByRole('button', { name: 'Next steps Not started' }).click();
    await page.getByRole('button', { name: 'Review and submit' }).click();    
    await page.getByRole('button', { name: 'Activity summary Complete' }).click();

    // select participants
    await page.getByLabel('Other entity participants  *- Select -').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // submit the activity summary
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out the objectives form
    await page.getByRole('button', { name: 'Add new objective' }).click();
    await page.getByTestId('form').getByTestId('textarea').fill('test');

    // fill in an invalid resource
    await page.getByTestId('textInput').fill('asdfasdf');

    // select a topic
    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // clear out the invalid resource
    await page.getByTestId('textInput').fill('');

    // add tta provided
    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('hello');

    await blur(page);

    const supportType = page.getByRole('combobox', { name: /Support type/i });
    await supportType.selectOption('Implementing');

    await blur(page);

    await page.getByRole('button', { name: 'Save objectives' }).click();

    await page.waitForTimeout(5000);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    // skip supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();
   
    // fill out next steps
    const isOtherEntity = true;
    await nextSteps(page, isOtherEntity);
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

  test('properly updates form state for other entity reports', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    await page.locator('label').filter({ hasText: 'Other entity' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0').click();
    await page.locator('#react-select-3-option-1').click();
    await page.getByRole('button', { name: 'Goals and objectives Not Started' }).click();
    await page.waitForTimeout(5000);
    await page.getByTestId('plusButton').click();
    await page.getByTestId('form').getByTestId('textarea').fill('Objective for testing. avery specific thing');
    await page.getByTestId('form').getByTestId('textarea').press('Tab');
    await page.getByRole('button', { name: 'Get help choosing topics' }).press('Tab');
    await page.getByLabel('Topics  *').press('ArrowDown');
    await page.getByLabel('Topics  *').press('Enter');
    await page.getByLabel('Topics  *').press('Tab');
  
    await blur(page);

    await page.getByText('TTA provided *Normal').click();
    await page.getByRole('textbox', { name: 'TTA provided for objective, required' }).press('Enter');
    await page.getByText('Support type *').click();
    await page.getByRole('combobox', { name: 'Support type' }).selectOption('Introducing');
  
    await page.getByRole('button', { name: 'Save objectives' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Goals and objectives Complete' }).click();
    await page.getByTestId('ellipsis-button').click();
    await page.getByTestId('menu').getByTestId('button').click();
    await page.getByRole('button', { name: 'Remove this objective' }).click();
    await page.getByRole('button', { name: 'This button will remove the objective from the activity report' }).click();
    await page.getByRole('button', { name: 'Supporting attachments Complete' }).click();
    await page.getByRole('button', { name: 'Goals and objectives In Progress' }).click();
  });

  test('can remove objective', async ({ page }) => {
    await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();
      const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    await activitySummary(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByRole('button', { name: 'Supporting attachments not started' }).click();
    await page.getByRole('button', { name: 'Goals and objectives not started' }).click();

    // create the goal
    await page.getByLabel(/Select recipient's goal/i).click();
    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g1');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // create first objective
    await page.getByText(/Select TTA objective/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    const supportType = page.getByRole('combobox', { name: /Support type/i });
    await supportType.selectOption('Implementing');
    await page.waitForTimeout(10000);

    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('g1 o1 title');

    // select a topic
    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('g1 o1 tta');
    await blur(page);

    // create second objective
    await page.getByRole('button', { name: 'Add new objective' }).click();
    await page.locator('[id="goalForEditing\\.objectives\\[1\\]\\.title"]').fill('g1 o2 title');
    await blur(page);
    await page.locator('[id="goalForEditing\\.objectives\\[1\\]\\.topics"]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);
    await page.waitForTimeout(10000);
    await page.locator('[id="goalForEditing\\.objectives\\[1\\]\\.supportType"]').selectOption('Implementing');
    await page.waitForTimeout(10000);
    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(4).click();
    await page.keyboard.type('g1 o2 tta');
    await blur(page);

    // First save goal
    await page.getByRole('button', { name: 'Save goal' }).click();

    // Verify we have both objectives
    await expect(page.getByText('Recipient TTA goal', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o1 title', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o2 title', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o2 tta', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o1 tta', { exact: true })).toBeVisible();

    // edit goals remove first objective
    await page.getByText('g1', { exact: true }).locator('..').locator('..').getByRole('button')
    .click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Remove this objective' }).first().click();
    await page.getByRole('button', { name: 'This button will remove the objective from the activity report' }).click();

    // Second save goal
    await page.getByRole('button', { name: 'Save goal' }).click();

    // Verify we only have one objective saved
    await expect(page.getByText('Recipient TTA goal', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o2 title', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o2 tta', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o1 tta', { exact: true })).not.toBeVisible();
    await expect(page.getByText('g1 o1 tta', { exact: true })).not.toBeVisible();

     // extract the AR number from the URL:
     const url = page.url();
     const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // Reload ar
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();
    await page.getByRole('button', { name: 'Goals and objectives' }).click();

    // Verify we only have one objective saved after reload
    await expect(page.getByText('Recipient TTA goal', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o2 title', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o2 tta', { exact: true })).toBeVisible();
    await expect(page.getByText('g1 o1 tta', { exact: true })).not.toBeVisible();
    await expect(page.getByText('g1 o1 tta', { exact: true })).not.toBeVisible();
  });

  test('allows preservation of objectives', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    // add a recipient
    await activitySummary(page);

    const p = page.waitForURL('**/goals-objectives');
 
    // visit the goals & objectives page
    await page.getByRole('button', { name: 'Goals and objectives Not Started' }).click();

    await p;    

    // create the goal
    await page.waitForTimeout(5000);
    await page.getByTestId('label').click();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    await page.getByTestId('textarea').fill('Test goal for preserving objectives');

    // create the objective
    await page.getByText('Select TTA objective *- Select -').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');  
    
    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('Test objective for preserving objectives');
    await blur(page);

    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');    

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('An unlikely statement');

    // save draft
    await blur(page);
    const p2 = page.waitForResponse('/api/activity-reports/goals');
    await page.getByRole('button', { name: 'Save draft' }).click();

    await p2;

    await page.getByText('Select recipient\'s goal *Test goal for preserving objectives').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Keep objective' }).click();
    await blur(page);

    expect(page.getByRole('textbox', { name: /TTA provided for objective/i }).getByText('An unlikely statement')).toBeVisible();
  });
});
