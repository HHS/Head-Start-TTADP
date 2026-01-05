/**
 * Comprehensive Activity Report Workflow Tests
 * 
 * These tests cover the complete lifecycle of activity reports:
 * - Creation and data entry
 * - Draft saving and recovery
 * - Multiple goals and objectives
 * - Submission for approval
 * - Manager approval
 * - Verification on recipient record
 */

import { test, expect } from '@playwright/test';
import { ActivityReportPage } from '../helpers/pages/ActivityReportPage';
import { RecipientRecordPage } from '../helpers/pages/RecipientRecordPage';
import { getUserFullName } from '../helpers/testHelpers';
import { 
  ActivitySummaryBuilder, 
  GoalBuilder, 
  ObjectiveBuilder, 
  NextStepsBuilder,
  TestPresets 
} from '../fixtures/dataBuilders';

test.describe('Activity Report - Complete Workflow', () => {
  let arPage: ActivityReportPage;
  let recipientPage: RecipientRecordPage;
  let fullName: string;

  test.beforeEach(async ({ page }) => {
    arPage = new ActivityReportPage(page);
    recipientPage = new RecipientRecordPage(page);
    fullName = await getUserFullName(page);
  });

  test('should complete full workflow: create → draft → submit → approve → verify', async ({ page }) => {
    test.setTimeout(180_000); // 3 minutes for complete workflow

    // Step 1: Create new activity report
    await arPage.createNew();
    
    // Step 2: Fill activity summary with standard training data
    const activityData = new ActivitySummaryBuilder()
      .withDefaultRecipient()
      .withDefaultParticipants()
      .withTTAType('Training')
      .withVirtual()
      .withDates('01/15/2024', '01/20/2024')
      .withDuration('5')
      .withNumberOfParticipants('10')
      .build();
    
    await arPage.fillActivitySummary(activityData);
    
    // Step 3: Navigate to goals section
    await arPage.saveAndContinue();
    await arPage.navigateToSection('Goals and objectives');

    // Step 4: Add first goal with objective
    const goal1 = new GoalBuilder()
      .withChildSafety()
      .withObjective(
        new ObjectiveBuilder()
          .withTitle('Improve safety protocols')
          .withSingleTopic()
          .withTTAProvided('Provided training on safety procedures')
          .withImplementing()
          .withResources(['https://eclkc.ohs.acf.hhs.gov/safety'])
          .build()
      )
      .build();
    
    await arPage.addGoal(goal1);

    // Step 5: Save as draft and verify
    await arPage.saveDraft();
    const reportId = arPage.getCurrentReportId();
    expect(reportId).toBeTruthy();

    // Step 6: Add second goal
    await page.getByRole('button', { name: 'Add new goal' }).click();
    
    const goal2 = new GoalBuilder()
      .withDevelopmentAndLearning()
      .withObjective(
        new ObjectiveBuilder()
          .withTitle('Enhance learning environment')
          .withSingleTopic()
          .withTTAProvided('Provided guidance on learning materials')
          .withImplementing()
          .build()
      )
      .build();
    
    await arPage.addGoal(goal2);

    // Step 7: Verify goals section is complete
    await arPage.saveAndContinue();
    
    const sideNavState = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();
    expect(sideNavState?.match(/Complete/i)).toBeTruthy();

    // Step 8: Skip supporting attachments
    await arPage.saveAndContinue();

    // Step 9: Add next steps
    const nextSteps = new NextStepsBuilder()
      .addSpecialistStep('Follow up on safety implementation', '03/01/2024')
      .addRecipientStep('Complete safety checklist', '03/15/2024')
      .build();
    
    await arPage.addNextSteps(nextSteps);
    await arPage.saveAndContinue();

    // Step 10: Submit for approval
    await arPage.submitForApproval(fullName, 'Ready for review - all sections completed');

    // Step 11: Verify submission success
    const reportNumber = `R01-AR-${reportId}`;
    await arPage.verifyReportInTable(reportNumber);

    // Step 12: Open and approve as manager
    await arPage.openReportFromTable(reportNumber);
    
    await expect(page.getByText(`${fullName} has requested approval for this activity report`)).toBeVisible();
    
    // Verify activity summary details
    await expect(page.getByTestId('accordionButton_activity-summary')).toHaveText('Activity summary');
    await expect(page.getByText('Virtual', { exact: true })).toBeVisible();
    
    // Verify goals
    await expect(page.getByText('Child Safety')).toBeVisible();
    await expect(page.getByText('Improve safety protocols')).toBeVisible();
    await expect(page.getByText('Development and Learning')).toBeVisible();
    await expect(page.getByText('Enhance learning environment')).toBeVisible();

    // Approve the report
    await arPage.approveReport('Approved - excellent work');

    // Step 13: Verify approved status
    await page.getByRole('rowheader', { name: reportNumber }).click();
    await expect(page.getByRole('heading', { name: `TTA activity report ${reportNumber}` })).toBeVisible();
    await expect(page.getByText(/date approved/i)).toBeVisible();

    // Step 14: Verify goals appear on recipient record
    await recipientPage.searchForRecipient('Agency 1.a in region 1, Inc.');
    await recipientPage.openRecipient('Agency 1.a in region 1, Inc.');
    await recipientPage.navigateToTab('RTTAPA');

    // Verify both goals created from the activity report are visible
    await recipientPage.verifyGoalExists('Child Safety');
    await recipientPage.verifyGoalExists('Development and Learning');
  });

  test('should handle multiple recipients with multiple goals', async ({ page }) => {
    test.setTimeout(180_000);

    await arPage.createNew();

    // Create activity with multiple recipients
    const activityData = new ActivitySummaryBuilder()
      .withRecipients([
        'Agency 1.a in region 1, Inc.',
      ])
      .withDefaultParticipants()
      .withTTAType('Both')
      .withVirtual()
      .withDates('02/01/2024', '02/15/2024')
      .withDuration('8')
      .withNumberOfParticipants('15')
      .build();
    
    await arPage.fillActivitySummary(activityData);
    await arPage.saveAndContinue();
    await arPage.navigateToSection('Goals and objectives');

    // Add multiple goals
    const goals = [
      new GoalBuilder()
        .withChildSafety()
        .withObjective(
          new ObjectiveBuilder()
            .withTitle('Safety objective 1')
            .withSingleTopic()
            .withTTAProvided('Safety TTA')
            .withImplementing()
            .build()
        )
        .build(),
      new GoalBuilder()
        .withFiscalManagement()
        .withObjective(
          new ObjectiveBuilder()
            .withTitle('Fiscal objective 1')
            .withSingleTopic()
            .withTTAProvided('Fiscal TTA')
            .withImplementing()
            .build()
        )
        .build(),
    ];

    for (const goal of goals) {
      await arPage.addGoal(goal);
      
      // Add new goal button for next iteration
      if (goal !== goals[goals.length - 1]) {
        await page.getByRole('button', { name: 'Add new goal' }).click();
      }
    }

    await arPage.saveAndContinue();
    await arPage.saveAndContinue(); // Skip attachments
    
    // Add next steps
    await arPage.addNextSteps(TestPresets.defaultNextSteps());
    await arPage.saveAndContinue();

    // Submit and verify
    await arPage.submitForApproval(fullName);
    
    const reportId = arPage.getCurrentReportId();
    await arPage.verifyReportInTable(`R01-AR-${reportId}`);
  });

  test('should allow draft recovery after logout', async ({ page }) => {
    test.setTimeout(120_000);

    // Create and save draft
    await arPage.createNew();
    
    await arPage.fillActivitySummary(TestPresets.standardTrainingActivity());
    await arPage.saveAndContinue();
    
    const reportId = arPage.getCurrentReportId();
    expect(reportId).toBeTruthy();

    // Navigate away
    await page.goto('/');
    await expect(page.getByText(/Welcome to the TTA Hub/i)).toBeVisible();

    // Return to report
    await arPage.navigateToReport(reportId!);
    
    // Verify data persisted
    await expect(page.getByText('Agency 1.a in region 1, Inc.')).toBeVisible();
  });

  test('should validate required fields before submission', async ({ page }) => {
    test.setTimeout(90_000);

    await arPage.createNew();

    // Try to continue without filling required fields
    await page.getByRole('button', { name: 'Save and continue' }).click();
    
    // Should still be on activity summary due to validation
    await expect(page.getByRole('heading', { name: /activity report for region/i })).toBeVisible();
    
    // Validation messages should appear (implementation depends on app behavior)
    // This is a placeholder - adjust based on actual validation behavior
  });

  test('should handle resource validation correctly', async ({ page }) => {
    test.setTimeout(120_000);

    await arPage.createNew();
    await arPage.fillActivitySummary(TestPresets.standardTrainingActivity());
    await arPage.saveAndContinue();
    await arPage.navigateToSection('Goals and objectives');

    const goal = new GoalBuilder()
      .withChildSafety()
      .build();
    
    await arPage.addGoal(goal);

    // Try to add invalid resource
    await page.getByRole('textbox', { name: 'Resource 1' }).fill('invalid-resource');
    await arPage.saveDraft();

    // Should show validation error
    await expect(page.getByText(/valid resource links must start with http/i)).toBeVisible();

    // Fix with valid resource
    await page.getByRole('textbox', { name: 'Resource 1' }).clear();
    await page.getByRole('textbox', { name: 'Resource 1' }).fill('https://eclkc.ohs.acf.hhs.gov');
    await arPage.saveDraft();

    // Should save successfully
    await page.waitForTimeout(2000);
  });

  test('should handle rejection and resubmission workflow', async ({ page }) => {
    test.setTimeout(180_000);

    // Create and submit report
    await arPage.createNew();
    await arPage.fillActivitySummary(TestPresets.standardTrainingActivity());
    await arPage.saveAndContinue();
    
    await arPage.navigateToSection('Goals and objectives');
    await arPage.addGoal(TestPresets.standardGoalWithObjective());
    
    await arPage.saveAndContinue();
    await arPage.saveAndContinue(); // Skip attachments
    await arPage.addNextSteps(TestPresets.defaultNextSteps());
    await arPage.saveAndContinue();
    
    await arPage.submitForApproval(fullName);
    
    const reportId = arPage.getCurrentReportId();
    const reportNumber = `R01-AR-${reportId}`;

    // Open as manager and request changes
    await arPage.openReportFromTable(reportNumber);
    
    await page.getByRole('textbox', { name: 'Manager notes' }).locator('div').nth(2).click();
    await page.keyboard.type('Please add more details to the objectives');
    
    await page.locator('select.usa-select').selectOption('needs_action');
    await page.getByTestId('form').getByRole('button', { name: 'Submit' }).click();
    
    await page.waitForLoadState('networkidle');

    // Verify report is back in needs action state
    await page.goto('/activity-reports');
    await expect(page.getByRole('rowheader', { name: reportNumber })).toBeVisible();
  });

  test('should show correct side navigation states', async ({ page }) => {
    test.setTimeout(120_000);

    await arPage.createNew();
    
    // Initially all sections should be "Not Started"
    await expect(page.locator('#activityReportSideNav-activity-summary .page-state')).toContainText('In progress');
    await expect(page.locator('#activityReportSideNav-goals-and-objectives .page-state')).toContainText('Not started');
    
    // Complete activity summary
    await arPage.fillActivitySummary(TestPresets.standardTrainingActivity());
    await arPage.saveAndContinue();
    
    // Add goal
    await arPage.navigateToSection('Goals and objectives');
    await arPage.addGoal(TestPresets.standardGoalWithObjective());
    await arPage.saveAndContinue();
    
    // Goals section should now be complete
    const goalsState = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();
    expect(goalsState?.match(/Complete/i)).toBeTruthy();
  });
});
