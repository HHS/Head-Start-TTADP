System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/fLPlRnit3t_lJy4dBmeNQE8-IGOKmp3KYTqqGznwERTzKo2GTRGjL2TTHSgkCVIxJrJEPr_S3Hi61B5CaJ-IF_wHNnEhmB6olVyPfsqi4LRCDVqy60IrELiQNiLv90pQEqR7PzfN0rK6ezpQnZeEhYzFfrOv_Z2v6rZ5I9n43zT9Mnc7uQmMR3Pi4MQp8HHLSWTlunpcFhfIXIsi3MvwKmpaNR_E7mxj2pZPgtuW32T9CdI0hZoLSC0lW5TFC4-Uxt1ANAFr2Qs3Czf9JphYTGBr0LeR0kLAk9bD4fxpZA08naw7RSt6ktT9qXjQ2re2rIAYP5iRpLY22WYOTUNR9j47ixi2_dzs3j5P90AVmWuRGmY2NPxralTyx5qrZFJLXYJRJmNS-FMrzR4yUGv_z01Q3It2fLydjNmyI-T61w3O4cFrCFx6WlIWxFnG3QnNvUbSMULqOg9nDBoxIjbshLil3wes7OZXzFPlj8EFd9d_vPbLMmpqA-nD7oz9_ERCu8ta5BR0GIqMHWDXM1kD3VwU4_QInb3hWALX9Rotjstg06tdzJURJGgyxiJHRS5FE8TXNLkZCvp4zCwN-5ln0iRVwe2Kod2FIhFSZ0pL2UQnERIt5ZLJ1YmLgpEOHCkcjWZ64Gkt124wPzmofzADJLjLAQdU6vCiIAkic7dDnAXg-55EjuunE6L1xSE4XGzxapmCiPQYKkFeUw_ZR3JFL9H2tzGJBmCMlz_1IB6QAy9T1zoF2ZasPWJDm3VfkeLPnj3wFvgx7tcaYmQwk81vr5-GJrg1d0hs0Gb8YgbX8Kme8cJ9GxButdlihlxRObmaVVd8TYdlf5kOfOFtxhERl1d2sYYOcGfFhnHXALK57s1w-n6q2kNdf5Nu63JAthW9oZ5YPY2vQbjiIUg1b28f2vRtmydqDD4U_3e15aeLkSiwBUzm4z0QBOs36xYNyuv4uwAF11Fl3FkGso1bb5GEbzC1m4GvjKH8uiHl9Gq4py3wvJAP2cPUot0pdWscxulqxyDiC1hVZMTZw5zUNZnFw8BTD7q7EM3j0nCmMgoGmrRWMDSTmuFDkryQLOwfRV9_5uQK_t2VbtxZf4sRIZChlQhGCNLWEp1j9CUxfGx-cv4PmwyHYUcVntQ4rNBs7q1RZ7QoPK8fvzh2W210_zNBLo-Fx9eU3yZ1u1hR9ZtY_S3jiRcAl4B7iYcG83RlvljX4fyV5xenMcCmYosOKYnvUvnqw_BAT9osQoMWAccm2KQyIiI4306r3sLElgQl5le_NLwS_mKANVm8PRU3169TQtdyQsyS7mvjCqpIIBlXlRuTN8zWQcgqnk7nrEOVDHBsZM7PNh9QtXQduYp8NfTzLoB8s91XByzB5q2Re2rg8xxoyVhsoTJBtbuswx9e7xIZyMyZcSQvDRJAZWKgNG2bx_tpywRKRTI7pdrL9SMLzr_0UJOBwTrTHC1U7Y1uPADksSXWUv0dR_m8Q-ktdUSc_L7K6eaMqJPm2JWXtQdjm-Z9vdYKtZSxEmjUeojZPVy4" alt="rendered boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
Person(developer, "Smart Hub Developer", "Smart Hub vendor developers and GTM")
note as EncryptionNote
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Smart Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
    }
    ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
    ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
  }
}
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Rel(developer, newrelic, "Manage performance & logging", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, clamav, "scans files", "http POST (8080)")
Rel(www_app, HSES, "retrieve Grantee data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
BiRel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code", "git ssh (22)")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
Lay_D(personnel, aws)
Lay_R(HSES, aws)
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/fLPlRnit3t_lJy4dBmeNQE8-IGOKmp3KYTqqGznwERTzKo2GTRGjL2TTHSgkCVIxJrJEPr_S3Hi61B5CaJ-IF_wHNnEhmB6olVyPfsqi4LRCDVqy60IrELiQNiLv90pQEqR7PzfN0rK6ezpQnZeEhYzFfrOv_Z2v6rZ5I9n43zT9Mnc7uQmMR3Pi4MQp8HHLSWTlunpcFhfIXIsi3MvwKmpaNR_E7mxj2pZPgtuW32T9CdI0hZoLSC0lW5TFC4-Uxt1ANAFr2Qs3Czf9JphYTGBr0LeR0kLAk9bD4fxpZA08naw7RSt6ktT9qXjQ2re2rIAYP5iRpLY22WYOTUNR9j47ixi2_dzs3j5P90AVmWuRGmY2NPxralTyx5qrZFJLXYJRJmNS-FMrzR4yUGv_z01Q3It2fLydjNmyI-T61w3O4cFrCFx6WlIWxFnG3QnNvUbSMULqOg9nDBoxIjbshLil3wes7OZXzFPlj8EFd9d_vPbLMmpqA-nD7oz9_ERCu8ta5BR0GIqMHWDXM1kD3VwU4_QInb3hWALX9Rotjstg06tdzJURJGgyxiJHRS5FE8TXNLkZCvp4zCwN-5ln0iRVwe2Kod2FIhFSZ0pL2UQnERIt5ZLJ1YmLgpEOHCkcjWZ64Gkt124wPzmofzADJLjLAQdU6vCiIAkic7dDnAXg-55EjuunE6L1xSE4XGzxapmCiPQYKkFeUw_ZR3JFL9H2tzGJBmCMlz_1IB6QAy9T1zoF2ZasPWJDm3VfkeLPnj3wFvgx7tcaYmQwk81vr5-GJrg1d0hs0Gb8YgbX8Kme8cJ9GxButdlihlxRObmaVVd8TYdlf5kOfOFtxhERl1d2sYYOcGfFhnHXALK57s1w-n6q2kNdf5Nu63JAthW9oZ5YPY2vQbjiIUg1b28f2vRtmydqDD4U_3e15aeLkSiwBUzm4z0QBOs36xYNyuv4uwAF11Fl3FkGso1bb5GEbzC1m4GvjKH8uiHl9Gq4py3wvJAP2cPUot0pdWscxulqxyDiC1hVZMTZw5zUNZnFw8BTD7q7EM3j0nCmMgoGmrRWMDSTmuFDkryQLOwfRV9_5uQK_t2VbtxZf4sRIZChlQhGCNLWEp1j9CUxfGx-cv4PmwyHYUcVntQ4rNBs7q1RZ7QoPK8fvzh2W210_zNBLo-Fx9eU3yZ1u1hR9ZtY_S3jiRcAl4B7iYcG83RlvljX4fyV5xenMcCmYosOKYnvUvnqw_BAT9osQoMWAccm2KQyIiI4306r3sLElgQl5le_NLwS_mKANVm8PRU3169TQtdyQsyS7mvjCqpIIBlXlRuTN8zWQcgqnk7nrEOVDHBsZM7PNh9QtXQduYp8NfTzLoB8s91XByzB5q2Re2rg8xxoyVhsoTJBtbuswx9e7xIZyMyZcSQvDRJAZWKgNG2bx_tpywRKRTI7pdrL9SMLzr_0UJOBwTrTHC1U7Y1uPADksSXWUv0dR_m8Q-ktdUSc_L7K6eaMqJPm2JWXtQdjm-Z9vdYKtZSxEmjUeojZPVy4)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
