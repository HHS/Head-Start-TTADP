/**
 * Page Object Model for Recipient Record pages
 * Handles navigation and interactions with recipient records
 */
import { Page, expect } from '@playwright/test';
import { blur } from '../../common';
import { waitForAutosave } from '../testHelpers';

export interface RecipientGoalData {
  isStandard: boolean;
  goalText: string;
  grants: string[];
  objectives?: Array<{
    title: string;
    ttaProvided?: string;
  }>;
}

export class RecipientRecordPage {
  constructor(private page: Page) {}

  /**
   * Searches for a recipient by name
   */
  async searchForRecipient(recipientName: string): Promise<void> {
    await this.page.goto('/recipient-tta-records');
    await this.page.waitForLoadState('networkidle');
    
    // Type in search field and search
    await this.page.getByRole('searchbox').fill(recipientName);
    await this.page.getByRole('button', { name: /search/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Opens a recipient record from search results
   */
  async openRecipient(recipientName: string): Promise<void> {
    await this.page.getByRole('link', { name: recipientName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigates to a specific tab on the recipient record
   */
  async navigateToTab(tabName: 'Profile' | 'TTA History' | 'RTTAPA' | 'Communication Log' | 'Monitoring'): Promise<void> {
    await this.page.getByRole('link', { name: tabName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigates to add new goals page
   */
  async navigateToAddGoals(): Promise<void> {
    await this.navigateToTab('RTTAPA');
    await this.page.getByRole('link', { name: 'Add new goals' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Creates a new goal on the recipient record
   */
  async createGoal(goalData: RecipientGoalData): Promise<void> {
    // Select grants
    await this.page.getByText('Recipient grant numbers *').click();
    
    for (const grant of goalData.grants) {
      await this.page.keyboard.press('Enter');
    }
    
    await blur(this.page);

    // Select goal
    await this.page.getByText('Recipient\'s goal *').click();
    
    if (goalData.isStandard) {
      await this.page.keyboard.type(goalData.goalText);
      await this.page.keyboard.press('Enter');
    }

    // Add objectives if provided
    if (goalData.objectives && goalData.objectives.length > 0) {
      for (let i = 0; i < goalData.objectives.length; i++) {
        if (i > 0) {
          await this.page.getByRole('button', { name: 'Add new objective' }).click();
        }
        
        const obj = goalData.objectives[i];
        await this.page.getByLabel('TTA objective *').fill(obj.title);
        
        if (obj.ttaProvided) {
          await this.page.getByLabel('TTA provided').fill(obj.ttaProvided);
        }
      }
    }

    // Save the goal
    await this.page.getByRole('button', { name: /Add goal/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Edits an existing goal
   */
  async editGoal(goalName: string): Promise<void> {
    const goalCard = this.page.getByTestId('goalCard').filter({ hasText: goalName });
    await goalCard.getByRole('button', { name: 'Actions for goal' }).click();
    await this.page.getByRole('button', { name: 'Edit' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Changes goal status
   */
  async changeGoalStatus(goalName: string, status: 'In Progress' | 'Closed' | 'Suspended'): Promise<void> {
    const goalCard = this.page.getByTestId('goalCard').filter({ hasText: goalName });
    await goalCard.getByLabel(/Change status for goal/i).click();
    await goalCard.getByText(status, { exact: true }).click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Closes a goal with a specific reason
   */
  async closeGoal(goalName: string, reason: string): Promise<void> {
    const goalCard = this.page.getByTestId('goalCard').filter({ hasText: goalName });
    
    // Change status to closed
    await goalCard.getByLabel(/Change status for goal/i).click();
    await goalCard.getByText(/closed/i).click();
    
    // Select reason
    await this.page.getByText(reason).click();
    await this.page.getByRole('button', { name: 'Change goal status' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Changes objective status
   */
  async changeObjectiveStatus(goalName: string, objectiveText: string, status: 'Complete' | 'In Progress' | 'Not Started' | 'Suspended'): Promise<void> {
    const goalCard = this.page.getByTestId('goalCard').filter({ hasText: goalName });
    
    // Expand goal if needed
    await goalCard.getByTestId('expander-button').click();
    
    const objective = goalCard.getByTestId('objectiveList').filter({ hasText: objectiveText });
    await objective.getByLabel(/Change status for objective/i).click();
    await objective.getByRole('button', { name: status }).click();
    await this.page.waitForTimeout(3000);
  }

  /**
   * Verifies a goal exists on the recipient record
   */
  async verifyGoalExists(goalName: string): Promise<void> {
    await expect(this.page.getByText(goalName)).toBeVisible();
  }

  /**
   * Applies filters on TTA History
   */
  async applyTTAHistoryFilter(filterType: string, value: string): Promise<void> {
    await this.navigateToTab('TTA History');
    
    await this.page.getByRole('button', { name: /open filters/i }).click();
    await this.page.getByLabel('topic').selectOption(filterType);
    await this.page.getByLabel('condition').selectOption('is');
    // Additional filter logic would go here
    await this.page.getByRole('button', { name: /apply filters/i }).click();
  }

  /**
   * Removes a filter from TTA History
   */
  async removeFilter(filterText: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`removes the filter.*${filterText}`, 'i') }).click();
  }

  /**
   * Views communication log
   */
  async viewCommunicationLog(): Promise<void> {
    await this.navigateToTab('Communication Log');
  }

  /**
   * Views monitoring information
   */
  async viewMonitoring(): Promise<void> {
    await this.navigateToTab('Monitoring');
  }

  /**
   * Verifies grant numbers are displayed
   */
  async verifyGrantsDisplayed(grantNumbers: string[]): Promise<void> {
    for (const grant of grantNumbers) {
      await expect(this.page.getByText(grant)).toBeVisible();
    }
  }

  /**
   * Verifies recipient profile information
   */
  async verifyProfileInformation(expectedData: {
    recipientName?: string;
    recipientType?: string;
    stateCode?: string;
  }): Promise<void> {
    await this.navigateToTab('Profile');
    
    if (expectedData.recipientName) {
      await expect(this.page.getByText(expectedData.recipientName)).toBeVisible();
    }
    
    if (expectedData.recipientType) {
      await expect(this.page.getByText(expectedData.recipientType)).toBeVisible();
    }
    
    if (expectedData.stateCode) {
      await expect(this.page.getByText(expectedData.stateCode)).toBeVisible();
    }
  }
}
