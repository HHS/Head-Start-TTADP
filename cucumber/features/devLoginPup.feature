Feature: TTA Smarthub HSES login
 
    Scenario: Welcome page is displayed
        # Given https://tta-smarthub-dev.app.cloud.gov
        Given the home page of tta-smarthub
        Then we should see "Welcome to the TTA Smart Hub!" message
    Scenario: Login is redirected to HSES
        Given the home page of tta-smarthub
        When pressing login
        Then we should see "Head Start Enterprise System" page
