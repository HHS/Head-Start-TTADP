/**
 * Test data builders for creating consistent test data
 * Follows the Builder pattern for flexible test data construction
 */

import { 
  ActivitySummaryData, 
  GoalData, 
  ObjectiveData, 
  NextStepsData 
} from '../helpers/pages/ActivityReportPage';

import { RecipientGoalData } from '../helpers/pages/RecipientRecordPage';

/**
 * Builder for Activity Summary data
 */
export class ActivitySummaryBuilder {
  private data: Partial<ActivitySummaryData> = {
    ttaType: 'Training',
    startDate: '01/01/2024',
    endDate: '01/31/2024',
    duration: '5',
  };

  withRecipients(recipients: string[]): this {
    this.data.recipients = recipients;
    return this;
  }

  withSingleRecipient(recipient: string): this {
    this.data.recipients = [recipient];
    return this;
  }

  withDefaultRecipient(): this {
    this.data.recipients = ['Agency 1.a in region 1, Inc.'];
    return this;
  }

  withRecipientParticipants(participants: string[]): this {
    this.data.recipientParticipants = participants;
    return this;
  }

  withDefaultParticipants(): this {
    this.data.recipientParticipants = [
      'Center Director / Site Director',
      'Coach'
    ];
    return this;
  }

  withDates(startDate: string, endDate: string): this {
    this.data.startDate = startDate;
    this.data.endDate = endDate;
    return this;
  }

  withDuration(hours: string): this {
    this.data.duration = hours;
    return this;
  }

  withTTAType(type: 'Training' | 'Technical Assistance' | 'Both'): this {
    this.data.ttaType = type;
    return this;
  }

  withDeliveryMethod(method: 'Virtual' | 'In Person' | 'Hybrid'): this {
    this.data.deliveryMethod = method;
    return this;
  }

  withVirtual(): this {
    this.data.deliveryMethod = 'Virtual';
    return this;
  }

  withInPerson(): this {
    this.data.deliveryMethod = 'In Person';
    return this;
  }

  withNumberOfParticipants(count: string): this {
    this.data.numberOfParticipants = count;
    return this;
  }

  build(): ActivitySummaryData {
    return this.data as ActivitySummaryData;
  }
}

/**
 * Builder for Objective data
 */
export class ObjectiveBuilder {
  private data: Partial<ObjectiveData> = {
    topics: [],
  };

  withTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  withTopics(topics: string[]): this {
    this.data.topics = topics;
    return this;
  }

  withSingleTopic(): this {
    this.data.topics = ['Behavioral / Mental Health / Trauma'];
    return this;
  }

  withTTAProvided(text: string): this {
    this.data.ttaProvided = text;
    return this;
  }

  withSupportType(type: string): this {
    this.data.supportType = type;
    return this;
  }

  withImplementing(): this {
    this.data.supportType = 'Implementing';
    return this;
  }

  withIntroducing(): this {
    this.data.supportType = 'Introducing';
    return this;
  }

  withResources(resources: string[]): this {
    this.data.resources = resources;
    return this;
  }

  build(): ObjectiveData {
    return this.data as ObjectiveData;
  }
}

/**
 * Builder for Goal data
 */
export class GoalBuilder {
  private data: Partial<GoalData> = {
    isStandard: true,
    objectives: [],
  };

  standard(goalText?: string): this {
    this.data.isStandard = true;
    this.data.goalText = goalText;
    return this;
  }

  custom(): this {
    this.data.isStandard = false;
    return this;
  }

  withGoalText(text: string): this {
    this.data.goalText = text;
    return this;
  }

  withChildSafety(): this {
    this.data.isStandard = true;
    this.data.goalText = 'Child Safety';
    return this;
  }

  withDevelopmentAndLearning(): this {
    this.data.isStandard = true;
    this.data.goalText = 'Development and Learning';
    return this;
  }

  withFiscalManagement(): this {
    this.data.isStandard = true;
    this.data.goalText = 'Fiscal Management';
    return this;
  }

  withObjective(objective: ObjectiveData): this {
    this.data.objectives!.push(objective);
    return this;
  }

  withObjectives(objectives: ObjectiveData[]): this {
    this.data.objectives = objectives;
    return this;
  }

  withSingleObjective(): this {
    const objective = new ObjectiveBuilder()
      .withTitle('Test objective')
      .withSingleTopic()
      .withTTAProvided('Test TTA provided')
      .withImplementing()
      .build();
    
    this.data.objectives = [objective];
    return this;
  }

  build(): GoalData {
    return this.data as GoalData;
  }
}

/**
 * Builder for Next Steps data
 */
export class NextStepsBuilder {
  private data: NextStepsData = {
    specialistSteps: [],
    recipientSteps: [],
  };

  addSpecialistStep(step: string, date: string): this {
    this.data.specialistSteps.push({ step, anticipatedDate: date });
    return this;
  }

  addRecipientStep(step: string, date: string): this {
    this.data.recipientSteps.push({ step, anticipatedDate: date });
    return this;
  }

  withDefaultSteps(): this {
    this.data.specialistSteps = [
      { step: 'Follow up with recipient', anticipatedDate: '12/01/2024' }
    ];
    this.data.recipientSteps = [
      { step: 'Implement new procedures', anticipatedDate: '12/15/2024' }
    ];
    return this;
  }

  build(): NextStepsData {
    return this.data;
  }
}

/**
 * Builder for Recipient Goal data
 */
export class RecipientGoalBuilder {
  private data: Partial<RecipientGoalData> = {
    isStandard: true,
    grants: [],
    objectives: [],
  };

  standard(): this {
    this.data.isStandard = true;
    return this;
  }

  withGoalText(text: string): this {
    this.data.goalText = text;
    return this;
  }

  withGrants(grants: string[]): this {
    this.data.grants = grants;
    return this;
  }

  withSingleGrant(): this {
    this.data.grants = ['01HP044444'];
    return this;
  }

  withObjective(title: string, ttaProvided?: string): this {
    this.data.objectives!.push({ title, ttaProvided });
    return this;
  }

  build(): RecipientGoalData {
    return this.data as RecipientGoalData;
  }
}

/**
 * Preset data for common test scenarios
 */
export const TestPresets = {
  /**
   * Standard training activity with single recipient
   */
  standardTrainingActivity(): ActivitySummaryData {
    return new ActivitySummaryBuilder()
      .withDefaultRecipient()
      .withDefaultParticipants()
      .withTTAType('Training')
      .withVirtual()
      .withDates('01/01/2024', '01/31/2024')
      .withDuration('5')
      .withNumberOfParticipants('10')
      .build();
  },

  /**
   * Technical assistance activity
   */
  technicalAssistanceActivity(): ActivitySummaryData {
    return new ActivitySummaryBuilder()
      .withDefaultRecipient()
      .withDefaultParticipants()
      .withTTAType('Technical Assistance')
      .withInPerson()
      .withDates('02/01/2024', '02/28/2024')
      .withDuration('8')
      .withNumberOfParticipants('5')
      .build();
  },

  /**
   * Standard goal with single objective
   */
  standardGoalWithObjective(): GoalData {
    return new GoalBuilder()
      .withChildSafety()
      .withSingleObjective()
      .build();
  },

  /**
   * Multiple goals scenario
   */
  multipleGoals(): GoalData[] {
    return [
      new GoalBuilder().withChildSafety().withSingleObjective().build(),
      new GoalBuilder().withDevelopmentAndLearning().withSingleObjective().build(),
    ];
  },

  /**
   * Default next steps
   */
  defaultNextSteps(): NextStepsData {
    return new NextStepsBuilder().withDefaultSteps().build();
  },
};
