Feature: TTA Smarthub Home Page
 
    Scenario: Welcome page is displayed
        Given I am logged in
        And I am on the Smart Hub home page
        Then I see "Welcome to the TTA Smart Hub" message
        And I see "Activity Reports" link
