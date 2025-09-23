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
  const recipient = page.locator('[aria-label="Recipient 1"]');
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
  const { ttaType } = { ...defaultActivitySummaryConfig, ...config,  };

  // Recipient and grants.
  await page.getByText('Recipient *- Select -').click();
  await page.getByText('Agency 1.a in region 1, Inc.', { exact: true }).click();
  await page.getByText(/Agency 1.a in region 1, Inc. - 01HP044444/i).click();
  await page.getByText(/Agency 1.a in region 1, Inc. - 01HP044445/i).click();

  await blur(page);

  // Recipient participants.
  await page.getByText('Recipient participants *-').click();
  await page.getByText('Center Director / Site Director', { exact: true }).click();
  await page.getByText('Coach', { exact: true }).click();
  await blur(page);

  // Why as the activity requested?
  await page.getByText('Why was this activity requested? *Get help choosing an option- Select -').click();
  // await page.getByText('Why was this activity requested?').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Target  populations addressed.
  await page.getByText('Target populations addressed *- Select -').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  // Start and End Date.
  await page.getByLabel('Start date *mm/dd/yyyy').fill('12/01/2020');
  await page.getByLabel('End date *mm/dd/yyyy').fill('12/01/2050');

  // Duration.
  await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('5');

  // TTA type.
  await page.getByRole('group', { name: /What type of TTA was provided/i }).getByText(ttaType || 'Training').click();
  await page.getByText('Virtual').click();

  // Language.
  await page.getByText('Language used *- Select -').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  // Number of participants involved.
  await page.getByLabel('Number of participants  *').fill('5');
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
    test.setTimeout(120_000)
    const fullName = await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();

    await page.getByRole('link', { name: '+ New Activity Report' }).click();

    const regionNumber = await getRegionNumber(page);

    await activitySummary(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByRole('button', { name: 'Supporting attachments not started' }).click();
    await page.getByRole('button', { name: 'Goals and objectives not started' }).click();

    // Select a standard goal.
    await page.getByTestId('goal-selector').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('g1o1');

    // Topics.
    await page.getByText('Topics *').click();
    await page.getByLabel('Topics *').press('ArrowDown');
    await page.getByLabel('Topics *').press('Enter');
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

    // Select second standard goal.
    await page.getByTestId('goal-selector').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');


    // save goal 2.
    await page.getByRole('button', { name: 'Save goal' }).click();
    

    await blur(page);
    await page. locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('g2o1');
    await blur(page);
          
    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await blur(page);

    await page.getByRole('combobox', { name: /Support type/i }).selectOption('Implementing');
    await blur(page);

    await page.getByRole('button', { name: 'Save goal' }).click();

    await page.getByRole('button', { name: 'Save and continue' }).click();

    // assert the goals and objectives section is complete
    let sideNavTextContent = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();

    await page.waitForTimeout(10000);

    expect(sideNavTextContent?.match(/Complete/i)).toBeTruthy();

    await page.getByRole('button', { name: /Goals and objectives complete/i }).click();
    await page.waitForTimeout(2500);

    // edit the first goal
    await page.getByText('Child Safety').locator('..').locator('..').getByRole('button')
      .click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // navigate away from the activity report page
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // navigate back to the activity report page & the goals and objectives section
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();
    await page.waitForTimeout(2500);
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

    const approverDropdown = page.getByLabel("Approving manager");
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
    // await expect(page.getByTestId('accordionItem_activity-summary').getByText('Recipient').nth(2)).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Virtual', { exact: true })).toBeVisible();
    await expect(page.getByText('Recipient participants', { exact: true })).toBeVisible();
    await expect(page.getByText('Collaborating specialists', { exact: true })).toBeVisible();
    await expect(page.getByText('Target populations', { exact: true })).toBeVisible();
    await expect(page.getByText('Why activity requested', { exact: true })).toBeVisible();

    await expect(page.getByText('Goal summary').first()).toBeVisible();
    await expect(page.getByText('Goal summary').nth(1)).toBeVisible();
    await expect(page.getByText('Child Safety')).toBeVisible();
    await expect(page.getByText('g1o1', { exact: true })).toBeVisible();

    // Scroll to the bottom of the page.
    await expect(page.getByText('CQI and Data')).toBeVisible();
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

    const recipients = await page.locator('span:near(div:text("Recipient"))').first().textContent();
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
    // TODO: Update this portion of the test once we are connected to the usage of standard goals from the AR.
    /*
    // Scroll until the button with the name 'View objectives for goal G-6' is visible.
    await page.getByRole('button', { name: 'View objectives for goal G-16' }).scrollIntoViewIfNeeded();

    await page.getByRole('button', { name: `View objectives for goal G-16` }).click();

    // Scroll until the button with the name 'View objectives for goal G-5' is visible.
    await page.getByRole('button', { name: 'View objectives for goal G-15' }).scrollIntoViewIfNeeded();

    await page.getByRole('button', { name: `View objectives for goal G-15` }).click();

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
    expect(goalOneContentA).toContain('Behavioral / Mental Health / Trauma');
    const goalOneContentB = await page.getByText('g1o1', { exact: true }).nth(1).locator('..').locator('..').textContent();
    expect(goalOneContentB).toContain('Behavioral / Mental Health / Trauma');

    // verify the end date is visible in the objective section
    expect(page.getByText('g1o1', { exact: true }).first().locator('..').locator('..').getByText('12/01/2050')).toBeTruthy();
    expect(page.getByText('g1o1', { exact: true }).nth(1).locator('..').locator('..').getByText('12/01/2050')).toBeTruthy();
    // verify the correct status for the objective is visible
    expect(page.getByText('g1o1', { exact: true }).first().locator('..').locator('..').getByText('Not started')).toBeTruthy();
    expect(page.getByText('g1o1', { exact: true }).nth(1).locator('..').locator('..').getByText('Not started')).toBeTruthy();

    // Expand goals for G2.
    await page.getByRole('button', { name: `View objectives for goal G-17` }).click();
    await page.getByRole('button', { name: `View objectives for goal G-18` }).click();

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
    const goalTwoContentB = await page.getByText('g2o1', {exact: true}).nth(1).locator('..').locator('..').textContent();
    // verify the end date is visible in the objective section
    expect(page.getByText('g2o1', { exact: true }).first().locator('..').locator('..').getByText('12/01/2050')).toBeTruthy();
    // verify the correct status for the objective is visible
    expect(page.getByText('g2o1', { exact: true }).nth(1).locator('..').locator('..').getByText('Not started')).toBeTruthy();

    // check g1
    await page.getByText('Child Safety').first().locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
      await page.getByText('Child Safety').nth(1).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('Child Safety').locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('Child Safety')).toBeVisible();
    await expect(page.getByText('g1o1')).toBeVisible();

    await page.getByRole('link', { name: 'Back to RTTAPA' }).click();

    // Check g2
    await page.getByText('CQI and Data').first().locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    await page.getByText('CQI and Data').nth(1).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('CQI and Data').locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('CQI and Data')).toBeVisible();
    await expect(page.getByText('g2o1')).toBeVisible();
    */
  });

  test('can remove objective', async ({ page }) => {
    await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('link', { name: '+ New Activity Report' }).click();
    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    await activitySummary(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByRole('button', { name: 'Supporting attachments not started' }).click();
    await page.getByRole('button', { name: 'Goals and objectives not started' }).click();

    // Select a standard goal.
    await page.getByTestId('goal-selector').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    
    // Save goal.
    await page.getByRole('button', { name: 'Save goal' }).click();

    // create first objective
    await page.getByText(/Select TTA objective/i).fill('Create a new objective');
    // Arrow down then click enter.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    const supportType = page.getByRole('combobox', { name: /Support type/i });
    await supportType.selectOption('Implementing');
    await blur(page);
    await page.waitForTimeout(10000);

    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('g1 o1 title');

    // select a topic
    await page.locator('[id="goalForEditing\\.objectives\\[0\\]\\.topics"]').focus();
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
    await page.getByText('Child Safety').locator('..').locator('..').getByRole('button')
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
    await page.getByRole('link', { name: '+ New Activity Report' }).click();

    // add a recipient
    await activitySummary(page);

    const p = page.waitForURL('**/goals-objectives');

    // visit the goals & objectives page
    await page.getByRole('button', { name: 'Goals and objectives Not Started' }).click();

    await p;

    // Select a standard goal.
    await page.waitForTimeout(5000);
    await page.getByTestId('goal-selector').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // create the objective
    // await page.getByText('Select TTA objective *- Select -').click();
    // // Click the option 'Create a new objective'.
    // await page.getByText('Create a new objective', { exact: true }).click();

    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('Test objective for preserving objectives');
    await blur(page);

    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.getByRole('textbox', { name: /TTA provided for objective/i }).locator('div').nth(2).click();
    await page.keyboard.type('An unlikely statement');

    // save draft
    await blur(page);
    await page.getByRole('button', { name: 'Save draft' }).click();

    await page.waitForTimeout(2000);

    await page.getByTestId('goal-selector').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: 'Keep objective' }).click();
    await blur(page);

    expect(page.getByRole('textbox', { name: /TTA provided for objective/i }).getByText('An unlikely statement')).toBeVisible();
  });
});
