/**
 * Page Object Model for Activity Report pages
 * Encapsulates all interactions with Activity Reports
 */
import { Page, expect } from '@playwright/test';
import { blur } from '../../common';
import { 
  fillDateInput, 
  fillRichTextEditor, 
  clickAndWaitForNavigation,
  waitForAutosave,
  extractReportIdFromUrl
} from '../testHelpers';

export interface ActivitySummaryData {
  recipients?: string[];
  recipientParticipants?: string[];
  reason?: string;
  targetPopulations?: string[];
  startDate: string;
  endDate: string;
  duration: string;
  ttaType: 'Training' | 'Technical Assistance' | 'Both';
  deliveryMethod?: 'Virtual' | 'In Person' | 'Hybrid';
  language?: string;
  numberOfParticipants?: string;
}

export interface ObjectiveData {
  title: string;
  topics: string[];
  ttaProvided: string;
  supportType?: string;
  resources?: string[];
}

export interface GoalData {
  isStandard: boolean;
  goalText?: string; // For standard goals, this is the selection
  objectives: ObjectiveData[];
}

export interface NextStepsData {
  specialistSteps: Array<{ step: string; anticipatedDate: string }>;
  recipientSteps: Array<{ step: string; anticipatedDate: string }>;
}

export class ActivityReportPage {
  constructor(private page: Page) {}

  /**
   * Navigates to create a new activity report
   */
  async createNew(): Promise<void> {
    await this.page.goto('/');
    await this.page.getByRole('link', { name: 'Activity Reports' }).click();
    await this.page.getByRole('link', { name: '+ New Activity Report' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigates to an existing activity report by ID
   */
  async navigateToReport(reportId: string): Promise<void> {
    await this.page.goto(`/activity-reports/${reportId}/activity-summary`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Gets the current report ID from the URL
   */
  getCurrentReportId(): string | undefined {
    return extractReportIdFromUrl(this.page.url());
  }

  /**
   * Fills out the Activity Summary section
   */
  async fillActivitySummary(data: ActivitySummaryData): Promise<void> {
    // Recipients
    if (data.recipients && data.recipients.length > 0) {
      await this.page.getByText('Recipient *- Select -').click();
      
      for (const recipient of data.recipients) {
        await this.page.getByText(recipient, { exact: true }).click();
      }
      
      // Select specific grants if needed
      // This is simplified - in reality you'd need to handle grant selection
      await blur(this.page);
    }

    // Recipient participants
    if (data.recipientParticipants && data.recipientParticipants.length > 0) {
      await this.page.getByText('Recipient participants *-').click();
      
      for (const participant of data.recipientParticipants) {
        await this.page.getByText(participant, { exact: true }).click();
      }
      
      await blur(this.page);
    }

    // Reason
    if (data.reason) {
      await this.page.getByText('Why was this activity requested? *Get help choosing an option- Select -').click();
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
    }

    // Target populations
    if (data.targetPopulations && data.targetPopulations.length > 0) {
      await this.page.getByText('Target populations addressed *- Select -').click();
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
      await blur(this.page);
    }

    // Dates
    await fillDateInput(this.page, 'Start date *mm/dd/yyyy', data.startDate);
    await fillDateInput(this.page, 'End date *mm/dd/yyyy', data.endDate);

    // Duration
    await this.page.getByLabel('Duration in hours (round to the nearest half hour) *').fill(data.duration);

    // TTA Type
    await this.page.getByRole('group', { name: /What type of TTA was provided/i })
      .getByText(data.ttaType)
      .click();

    // Delivery method
    if (data.deliveryMethod) {
      await this.page.getByText(data.deliveryMethod).click();
    }

    // Language
    if (data.language) {
      await this.page.getByText('Language used *- Select -').click();
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
      await blur(this.page);
    }

    // Number of participants
    if (data.numberOfParticipants) {
      await this.page.getByLabel('Number of participants  *').fill(data.numberOfParticipants);
    }

    await waitForAutosave(this.page);
  }

  /**
   * Navigates to a specific section of the report
   */
  async navigateToSection(section: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(section, 'i') }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Saves and continues to the next section
   */
  async saveAndContinue(): Promise<void> {
    await clickAndWaitForNavigation(this.page, 'Save and continue');
  }

  /**
   * Saves as draft
   */
  async saveDraft(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save draft' }).click();
    await waitForAutosave(this.page);
  }

  /**
   * Adds a goal to the report
   */
  async addGoal(goalData: GoalData): Promise<void> {
    // Navigate to goals section if not already there
    if (!this.page.url().includes('goals-objectives')) {
      await this.navigateToSection('Goals and objectives');
    }

    // Select goal type
    if (goalData.isStandard) {
      await this.page.getByTestId('goal-selector').click();
      await this.page.waitForTimeout(2000);
      
      if (goalData.goalText) {
        await this.page.keyboard.type(goalData.goalText);
      }
      
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(2000);
    }

    // Add objectives
    for (let i = 0; i < goalData.objectives.length; i++) {
      if (i > 0) {
        await this.page.getByRole('button', { name: 'Add new objective' }).click();
      }
      
      await this.addObjective(goalData.objectives[i], i);
    }

    await this.saveGoal();
  }

  /**
   * Adds an objective to the current goal
   */
  async addObjective(objectiveData: ObjectiveData, index: number = 0): Promise<void> {
    // Fill objective title
    await this.page.locator(`[id="goalForEditing\\.objectives\\[${index}\\]\\.title"]`)
      .fill(objectiveData.title);
    await blur(this.page);

    // Select topics
    await this.page.locator(`[id="goalForEditing\\.objectives\\[${index}\\]\\.topics"]`).focus();
    
    for (const topic of objectiveData.topics) {
      await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
    }
    
    await blur(this.page);

    // Fill TTA provided
    const ttaEditor = this.page.getByRole('textbox', { name: /TTA provided for objective/i });
    await ttaEditor.locator('div').nth(index * 2 + 2).click();
    await this.page.keyboard.type(objectiveData.ttaProvided);
    await blur(this.page);

    // Select support type
    if (objectiveData.supportType) {
      const supportTypeSelect = this.page.locator(`[id="goalForEditing\\.objectives\\[${index}\\]\\.supportType"]`);
      await supportTypeSelect.selectOption(objectiveData.supportType);
      await blur(this.page);
    }

    // Add resources
    if (objectiveData.resources && objectiveData.resources.length > 0) {
      for (let i = 0; i < objectiveData.resources.length; i++) {
        await this.page.getByRole('textbox', { name: `Resource ${i + 1}` })
          .fill(objectiveData.resources[i]);
      }
    }

    await waitForAutosave(this.page);
  }

  /**
   * Saves the current goal
   */
  async saveGoal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save goal' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Adds next steps for specialist and recipient
   */
  async addNextSteps(data: NextStepsData): Promise<void> {
    // Navigate to next steps if not there
    if (!this.page.url().includes('next-steps')) {
      await this.navigateToSection('Next steps');
    }

    // Add specialist steps
    for (let i = 0; i < data.specialistSteps.length; i++) {
      const step = data.specialistSteps[i];
      
      if (i > 0) {
        await this.page.getByRole('button', { name: 'Add new step' }).first().click();
      }
      
      await this.page.getByTestId('specialistNextSteps-input').fill(step.step);
      await this.page.getByLabel(`When do you anticipate completing step ${i + 1}? *`)
        .fill(step.anticipatedDate);
    }

    // Add recipient steps
    for (let i = 0; i < data.recipientSteps.length; i++) {
      const step = data.recipientSteps[i];
      
      if (i > 0) {
        await this.page.getByRole('button', { name: 'Add new step' }).last().click();
      }
      
      await this.page.getByTestId('recipientNextSteps-input').fill(step.step);
      await this.page.getByLabel(/When does the recipient anticipate completing step/i)
        .fill(step.anticipatedDate);
    }

    await waitForAutosave(this.page);
  }

  /**
   * Submits the report for approval
   */
  async submitForApproval(approverName: string, creatorNotes?: string): Promise<void> {
    // Navigate to review section
    if (!this.page.url().includes('review')) {
      await this.navigateToSection('Review and submit');
    }

    // Add creator notes if provided
    if (creatorNotes) {
      const notesEditor = this.page.getByRole('textbox', { name: 'Additional notes' });
      await notesEditor.locator('div').nth(2).click();
      await this.page.keyboard.type(creatorNotes);
    }

    // Select approver
    const approverDropdown = this.page.getByLabel('Approving manager');
    await approverDropdown.click();
    await this.page.keyboard.type(approverName);
    await this.page.keyboard.press('Enter');
    await blur(this.page);

    // Submit
    await this.page.getByRole('button', { name: 'Submit for approval' }).click();
    await this.page.waitForTimeout(5000); // Wait for submission
  }

  /**
   * Approves the report as a manager
   */
  async approveReport(managerNotes?: string): Promise<void> {
    // Add manager notes if provided
    if (managerNotes) {
      const notesEditor = this.page.getByRole('textbox', { name: 'Manager notes' });
      await notesEditor.locator('div').nth(2).click();
      await this.page.keyboard.type(managerNotes);
    }

    // Set status to approved
    await this.page.locator('select.usa-select').selectOption('approved');

    // Submit approval
    await this.page.getByTestId('form').getByRole('button', { name: 'Submit' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verifies the report appears in the activity reports table
   */
  async verifyReportInTable(reportNumber: string): Promise<void> {
    await this.page.goto('/activity-reports');
    await expect(this.page.getByRole('rowheader', { name: reportNumber })).toBeVisible();
  }

  /**
   * Opens an activity report from the table
   */
  async openReportFromTable(reportNumber: string): Promise<void> {
    await this.page.getByRole('link', { name: reportNumber }).first().click();
    await this.page.waitForLoadState('networkidle');
  }
}
