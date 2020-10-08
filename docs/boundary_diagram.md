System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/dLHHRzis47xNhxZbON22niBgxAKeYhgnbcnmaono40pRO53asI56a-hToOenzB-FL5GvRZfWs8Cj-dZVTz_TT_9x5aNIR5psdVNQDGRXGQJcDtbEgXslhJmqLSD8EdX1BsCTDhaoP9NVkgPkylEpqnkdlDnzdESRnO8KGylpcAsiHnhNYNi-_UtwRh6y_tbnkPmN5yNLR7ISYHM7i5XCeTme4hXiAgX2uusY7MmjjjaD4WS_ghk7H_SAZlQfTunq52DJ3-ZDQT88OGNoy1NdqN7cWo0eXi9hsjLYWx-AaMpg7EX4h5E8mM1jjQ01HGZOvQPVRPm1BEOb_31-3Orto0mXbg7MCaBYDkCiIkYEsOU-Wv5gEQcxB-4YRCzTQCpHCVoT0GmPEWNNOHlJkkCudliSW7B7WfjbyIY9QQbSzJmDN53cj59EUTsF8HQQpZ_4RW_HGvKbXKQGOkhRxvtQ8V4xsFCzNN9YwhJ2JqbbD498hLPM0oDjhSQUVz-bX2fLrvhGM55faiFjq0p0i12ZjcsNgguFT1mkmJrMCArhPtL7bpHT1OE_bA-WUAm9EGxs5fMMT3EpN4SQ1kKDwE0SQk6Eq2XHIUvX_LdLAJ19zKrWMHEMlyvX5fChnVXbbBUpCXrx64E__dqLlxBhXfwQNGKwrF-lDNdIavSJg1hz5yhH44YdKW8X0wSfQbXPXw2OKNXW_9obp-VioTxHPLcK4PSU7LCZ3-Yb7njC6HIKWss3PMjMIrQAdmR0jd88fL9bvzR1wdXi2QCDoG1iuJQTKw6FmLi9PFsw1qP9yN9lxJCWOHr860GTRb1ebmX4rp0wEviSHsW2Fdl3zyk-KLwjSR0ouRg_9hWe5ldDTHc_xXRvh9WNY-A0RQ1ukVerXKUB38IV6cJX_qxwWcjezd-IzdXuU_eEaeFm1avErDv2v9CJ-CFd-U_NoTZNV-RvrxFg_TyYsTKEh4b8sRqiFzGyC6bu3GYLuRmbAyZTg1a527KWq_LIyoS7en_F9g-_oS6JRt5yUMCYuZrwqspSFm00" alt="boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/master/C4_Container.puml
LAYOUT_WITH_LEGEND()
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
note as EncryptionNote
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Smart Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      }
  }
}
System(HSES, "HSES", "Authentication As a Service")
Boundary(gsa_saas, "Possible SaaS") {
  System_Ext(newrelic, "New Relic", "Monitoring SaaS")
}
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
www_app <-> HSES : **authenticates** \n//[OAuth2]//
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
Rel(www_app, www_s3, "reads/writes data content")
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dLHHRzis47xNhxZbON22niBgxAKeYhgnbcnmaono40pRO53asI56a-hToOenzB-FL5GvRZfWs8Cj-dZVTz_TT_9x5aNIR5psdVNQDGRXGQJcDtbEgXslhJmqLSD8EdX1BsCTDhaoP9NVkgPkylEpqnkdlDnzdESRnO8KGylpcAsiHnhNYNi-_UtwRh6y_tbnkPmN5yNLR7ISYHM7i5XCeTme4hXiAgX2uusY7MmjjjaD4WS_ghk7H_SAZlQfTunq52DJ3-ZDQT88OGNoy1NdqN7cWo0eXi9hsjLYWx-AaMpg7EX4h5E8mM1jjQ01HGZOvQPVRPm1BEOb_31-3Orto0mXbg7MCaBYDkCiIkYEsOU-Wv5gEQcxB-4YRCzTQCpHCVoT0GmPEWNNOHlJkkCudliSW7B7WfjbyIY9QQbSzJmDN53cj59EUTsF8HQQpZ_4RW_HGvKbXKQGOkhRxvtQ8V4xsFCzNN9YwhJ2JqbbD498hLPM0oDjhSQUVz-bX2fLrvhGM55faiFjq0p0i12ZjcsNgguFT1mkmJrMCArhPtL7bpHT1OE_bA-WUAm9EGxs5fMMT3EpN4SQ1kKDwE0SQk6Eq2XHIUvX_LdLAJ19zKrWMHEMlyvX5fChnVXbbBUpCXrx64E__dqLlxBhXfwQNGKwrF-lDNdIavSJg1hz5yhH44YdKW8X0wSfQbXPXw2OKNXW_9obp-VioTxHPLcK4PSU7LCZ3-Yb7njC6HIKWss3PMjMIrQAdmR0jd88fL9bvzR1wdXi2QCDoG1iuJQTKw6FmLi9PFsw1qP9yN9lxJCWOHr860GTRb1ebmX4rp0wEviSHsW2Fdl3zyk-KLwjSR0ouRg_9hWe5ldDTHc_xXRvh9WNY-A0RQ1ukVerXKUB38IV6cJX_qxwWcjezd-IzdXuU_eEaeFm1avErDv2v9CJ-CFd-U_NoTZNV-RvrxFg_TyYsTKEh4b8sRqiFzGyC6bu3GYLuRmbAyZTg1a527KWq_LIyoS7en_F9g-_oS6JRt5yUMCYuZrwqspSFm00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
