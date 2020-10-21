Feature: TTA Smarthub HSES login
 
    Scenario: Welcome page is displayed
        Given I am on the Smart Hub home page
        Then I see "Welcome to the TTA Smart Hub!" message
    Scenario: Login is redirected to HSES
        Given I am on the Smart Hub home page
        When I press login
        Then I see "Head Start Enterprise System" on the page
