Feature: Activity Report Stepper
 
    Scenario: Activity Summary
        Given I am logged in
        And I am on the activity reports page
        Then I see the Stepper
        And the first step is the Activity Summary
    Scenario: Navigation buttons
        Given I am logged in
        And I am on the activity reports page
        Then I see two navigation buttons
        And the "Previous" button is disabled
        When I click the "Next" button
        Then the "Previous" button is no longer disabled
     Scenario: Progress
        Given I am logged in
        And I am on the activity reports page
        When I click the "Next" button
        Then I moved past the "Activity Summary" step
        And I am on the "Participants" step
        When I click the "Next" button again
        Then the "Participants" step is still current, but I am on page 2
        And I have not advanced to the "Goals & Objectives" step yet
        When I click the "Previous" button
        Then the "Participants" step is still current, but I am on page 1
        When I click the "Previous" button again
        Then I am no longer on the "Participants" step
        And I am on the "Activity Summary" step
