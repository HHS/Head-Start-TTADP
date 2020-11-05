Feature: Not Found Page
    Scenario: User is shown a 404 page if route is not found
        Given I am logged in
        And I go to an unknown page
        Then I see the "Not Found" alert message
