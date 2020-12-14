System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/fPPVRnf74C3V-HHJFrHOYa6DtPUgga8CiLtXXFfmeagHqB8tu5NsTZSxin1KvRjtvpWEC6vLgP8DgxsPt_oVumsnYfmgs_d1E6rJYV347EYNVZ-gTMzf-2dD4s7KtZ4wxcbVzLKPZN8hcqBgNrzTJAno_7W_xbl5I9olPjTPMXc7iHU4FHxy-U5nEljqDxsTZKSte_V3xdc73Lk4wNG0HQKYmssQmzmdLwguWPN1TMU2aRphXlhBeNq5PtlHHy9ubcy63j2L5-8Z-0NmqpFcsVcEK-8AhS-q8yvmTtjsTBtAK1-XrI5GheIRwNtcESy8Yc3aTDm4DjwzppUTWRMWnL4jLvHrWz6C9QY8W5jPB66TSmhJSG4_zLv3SXQ9m6UtuzeGWh3BNYTR1oVGjqr6kcfD4ksd0cxywjhwL9wTmryTW5P2o-NIhx9OVUpbSoC3K6o8iPgDlh6GPihE3yN0UbLUp9LLJZTfpOO6uxSvscFjrifC1NE464pk_aKw-iHrvd_zqQeDHleDzghRXoHswyZWdSGKDy1HBHP60s5S6OqDVvyJzXB6GEk8fM4bUM-Vjg43jEtONQ_NsV5mvCTn2tx2EGn2i4RNEF7flI_nz-8LZBw5Y9JBy81AipmP6WePisqExQr5pLG3IyMg1_V9iWaMmJXYoIr1JCuPjvHGdlcchQgKLE-ToHgaLIqeUTqcHbM3ZtAwSupHAGjgxoOiVDohrCEGWXILJWqDvtKQIadTn1Cl8nP_Z66eMCqLuQxw3yD2ZeqQGRC1cb3TmYnJR6sVpDpBDkcoWHUNC4_w2_9PUo6dWdr40f9IQbX87XGHyZwAxntv_zxPzbZtjXWLMK--QbBY9tIyIyg0G46nxPtFxlxT05P6mTHKUF5M4PPIQF0H9dSVGQjOVdQVNU5Jr2Yhv2OgnuXrOhBzjkkMf6Qa54cbi7mOt4ykL0ZHhpAmKAfe6kzW2Xok8rgZfPTm3GzotkNMkEGJmRrtXdtSTiRtJXRPz-g1UiJW8nCmMgoGuqOmh0DqhwukpxEgA1uipFsiLygf9RQzANhrfeURqRG_-L3aZyTfVpWQZwQZ8rgBE9tb7FGt8psDNnCIqt-7dh3QOFy7j6MqaoGJGNKV7M04yR9UqqrgtqL8a9eNpGTfhjV_e1AHey4LjarpakENAzG2LXZDOWEc5CEyEGtwPO_RGOweIkglen6NnJWXGqJjOqa22_JLGlVdgylNBpBeyYN6RkO5i0eQq9N16yU7qz2y8QiijfkAwxl-zH0c9g0r3a_7OVkh8WlU69Pj8GDyMro8iIWxLFPBYI2zJeQzhF9ZW3PHMzH6RDN7wxjduoGxSjcifsO1j7Dry3kWzMIIvjRGKssuoS_ksQ4nNrM6uSdxB-0ycuNqwSu3O2_B7RRHXoRw1hQ7F7j_3Z5OlpbQvVcFajP8j4YsmMLm9hr1LwRA_Wq0" alt="rendered boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
LAYOUT_WITH_LEGEND()
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
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      }
  }
}
System(HSES, "HSES", "Authentication As a Service\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, clamav, "scans files", "https POST (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(www_app, HSES, "retrieve Grantee data", "https GET (443)")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
Rel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/fPPVRnf74C3V-HHJFrHOYa6DtPUgga8CiLtXXFfmeagHqB8tu5NsTZSxin1KvRjtvpWEC6vLgP8DgxsPt_oVumsnYfmgs_d1E6rJYV347EYNVZ-gTMzf-2dD4s7KtZ4wxcbVzLKPZN8hcqBgNrzTJAno_7W_xbl5I9olPjTPMXc7iHU4FHxy-U5nEljqDxsTZKSte_V3xdc73Lk4wNG0HQKYmssQmzmdLwguWPN1TMU2aRphXlhBeNq5PtlHHy9ubcy63j2L5-8Z-0NmqpFcsVcEK-8AhS-q8yvmTtjsTBtAK1-XrI5GheIRwNtcESy8Yc3aTDm4DjwzppUTWRMWnL4jLvHrWz6C9QY8W5jPB66TSmhJSG4_zLv3SXQ9m6UtuzeGWh3BNYTR1oVGjqr6kcfD4ksd0cxywjhwL9wTmryTW5P2o-NIhx9OVUpbSoC3K6o8iPgDlh6GPihE3yN0UbLUp9LLJZTfpOO6uxSvscFjrifC1NE464pk_aKw-iHrvd_zqQeDHleDzghRXoHswyZWdSGKDy1HBHP60s5S6OqDVvyJzXB6GEk8fM4bUM-Vjg43jEtONQ_NsV5mvCTn2tx2EGn2i4RNEF7flI_nz-8LZBw5Y9JBy81AipmP6WePisqExQr5pLG3IyMg1_V9iWaMmJXYoIr1JCuPjvHGdlcchQgKLE-ToHgaLIqeUTqcHbM3ZtAwSupHAGjgxoOiVDohrCEGWXILJWqDvtKQIadTn1Cl8nP_Z66eMCqLuQxw3yD2ZeqQGRC1cb3TmYnJR6sVpDpBDkcoWHUNC4_w2_9PUo6dWdr40f9IQbX87XGHyZwAxntv_zxPzbZtjXWLMK--QbBY9tIyIyg0G46nxPtFxlxT05P6mTHKUF5M4PPIQF0H9dSVGQjOVdQVNU5Jr2Yhv2OgnuXrOhBzjkkMf6Qa54cbi7mOt4ykL0ZHhpAmKAfe6kzW2Xok8rgZfPTm3GzotkNMkEGJmRrtXdtSTiRtJXRPz-g1UiJW8nCmMgoGuqOmh0DqhwukpxEgA1uipFsiLygf9RQzANhrfeURqRG_-L3aZyTfVpWQZwQZ8rgBE9tb7FGt8psDNnCIqt-7dh3QOFy7j6MqaoGJGNKV7M04yR9UqqrgtqL8a9eNpGTfhjV_e1AHey4LjarpakENAzG2LXZDOWEc5CEyEGtwPO_RGOweIkglen6NnJWXGqJjOqa22_JLGlVdgylNBpBeyYN6RkO5i0eQq9N16yU7qz2y8QiijfkAwxl-zH0c9g0r3a_7OVkh8WlU69Pj8GDyMro8iIWxLFPBYI2zJeQzhF9ZW3PHMzH6RDN7wxjduoGxSjcifsO1j7Dry3kWzMIIvjRGKssuoS_ksQ4nNrM6uSdxB-0ycuNqwSu3O2_B7RRHXoRw1hQ7F7j_3Z5OlpbQvVcFajP8j4YsmMLm9hr1LwRA_Wq0)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
