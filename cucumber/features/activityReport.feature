Feature: TTA Smarthub Activity Report
    Scenario: Report can be filled out
        Given I am logged in
        And I am on the landing page
        Then I see text containing "Activity report for Region"
