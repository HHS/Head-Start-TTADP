Feature: TTA Smarthub Activity Report
    Scenario: Report can be filled out
        Given I am logged in
        And I am on the landing page
        Then I see "Activity report for Region 1" message
        When I select "Other entity"
        Then I see "QRIS System" as an option in the "Other entities" multiselect
