System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/dLP1Rnkz4RtxLqnz26JWiuKwkRGeYiYMuhYm6yMh99S01iKThLXpoGrdA4Kjyj_BeLPhhHH_27AmnIKvRzvmPXxvbbW5ZhKz-OjnsiOIOSdSqD-7mw3M5vNXPPn7mg2zOtHyeNqzL6KmogriREBm-itvr2h7d-xlXbOn4gUfnsllM1c7uQ8HR3Pi4MQp4HIr2WplunpcFhfIXGsi3AvFfXZ8kq6JVnpQF-3qUUidmd2QPaOEq9NdGWVy0dXvW7bwjiCfSONM9xGUpdWtUzgRNYLG7w2p8L2kX9lPVSAxQbaEr9g4mPS2RlpgslfOdfx1_qwWYtI0jJBsaJ2iijjHhVxh7HIcRYp2H1QXo8imA2R5cN2OBOEFrH9c8HB9X8GZbFBkBLGY0T3HqEAvygkqDmylqdXB102A3J7MZvFlB7GVbPtlRmFhLNa-LrOvdM3RQ4PtL-AXPzrvULIDwK6CfhT_iZluo3dsVxooQeE1_WdFfjl576K-FdWdCOKDS52BXT4vNAEnnNy-UFPpuQfrmDAmOkDTjzg53dk9MA_NYNZJuz6llIyuXr7JMACpd73wjo_nNyKVCFdU1AIKwmTKccLbRAX9CDkgqDvQr4mPi5IiBk0-MZQIO-E8vMm9GdJEk4f2EUJcmnE6bju1gRpq4g-hQAryJp4iVAXXhlHJ5UGOG325NEO3JV0QYNxkNbjLAocUTyOYa5QPPqvhpekgHvzbTEiOWrCMr3CRI7wVJN8JnaPgYeuTZUSv2-LS67lYAc3nyGx6YjLS4UwAxs5SoB0r8sX5fZrfjp1L39tlVWvVz4clM_3YDSoZVa8-xIPotxCFI41IIHeMSWwA2FdbAAJkfFaVvFSeXebLb92KNkQfZn4ZWb_i9-W_Vax0Vfiexrf7FqxaxyV9jfC6xvCe97lvoJIDgon2OIe77znNT_zk12kZO6PgFBzIXALK2lW0qzlFe5KelwPTXOz1P_StGJb6p7JtTQmYzKXAaTG0bW-Z--cvQfhWLmcmKAh87TLhRuVhWDPeAKPSmuECTrapBlf8SE-TOHzopQM8qfPz1Tu3k5TELGZDjeYbMU0LM5zLoLGmyzq3DvFPSFgXIFy-pORZoTraDe71cpUlpnAwOBSDtaCEsFZ018mMQ-Im4JZMJSzmxtfv5iWwS-eQ-jTeECy8mLHB1k_06lTqCh8MjA1hgLY24XkZ6KjG0G6T3fj6ljQ6a-3V5V3NYqk8pY8HU5vYM1j24DpouWHTcOV2kglg_Sknz6idlTSMCBFIoneTKuz-B_WkucEzReB_RaIty5j4OlhrL1nXTRdvVT2UI7QA9Sf3ETmz9461mTzUi6rRAY07WoliUk8epOVLrJDNaPVefCKPAUkUs7uOfUdBmxhgZ5OOp683fXHBtXp7thcyCZsddMm6L2KDry68Ls5Co11G-r2Im3NqpNRcNTI_Yz0d8DLsRBwJPx5TDHhGbOqtZWzP_3xC8P5EUj5z4rqbaL9eL50rxXuJUSi1XME04dyA0AyWDebKUo747cAdcQsMIN_jjFFwTdWzXgbfq1g7nwAP7ywIX1l3Sbk9ihylpYNquAr5kTzA154jCkpb9TC7q2PeYzg8hpoylZqGNRcZg_PwBBgtqv7wTaocSMuDBRDZWKeBGEbxS7dPbdx7Uj-vhsl3iFJ-IHJ9BAIbTuo0FOJeO7iQJNSQ6UmPvE0vESR6-atlQU4TKDGQYHRHRk44-B0a3fxO1Rgo1vC9jX_K6lTjkaxz5VCxjNaS7rmQszc7V5st4syJJgpj_m40)

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
Person(developer, "Smart Hub Developer", "Smart Hub vendor developers and GTM")
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Smart Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
      Container(worker_app, "TTA Smart Hub Worker Application", "NodeJS, Bull", "Perform background work and data processing")
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      ContainerDb(www_redis, "Redis Database", "AWS Elasticache", "Queue of background jobs to work on")
    }
  }
 Container(email_server, "Amazon Simple Email Server (SES)", "Through Truss", "TTA Hub mail server")
}
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Rel(developer, newrelic, "Manage performance & logging", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
note right on link
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(worker_app, clamav, "scans files", "https POST (9443)")
Rel(worker_app, HSES, "retrieve Grantee data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
BiRel(www_app, www_db, "reads/writes dataset records", "psql")
BiRel(worker_app, www_db, "reads/writes dataset records", "psql")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
BiRel(worker_app, www_s3, "reads/writes data content", "vpc endpoint")
Rel(www_app, www_redis, "enqueues job parameters", "redis")
BiRel(worker_app, www_redis, "dequeues job parameters & updates status", "redis")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code", "git ssh (22)")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
Rel(www_app, email_server, "Send application notifications")
Rel(email_server, personnel, "Send application notifications")
Lay_D(personnel, aws)
Lay_R(HSES, aws)
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/dLRVRnk_3N_FNy7beN20Rs8ixSk6OQWJksc6P7LpRljI891rz5cBJhgAb5rlwFy-KJvVV7RpHL6WZNKI-U67uW_gBR4A76jxyXVZj8qbmfAveRyFXq6jBoh3opYFX45xn-ZuGljwgCfWb5lPsCJXzPlpgLMEFztV3QrY94vRZzT9MXc7uQ8HR3Pi4MQp4HIr2WplunpcFhfIXGsi3AvFfXZ8kq6JVnpQF-3qMVGJOJXDEoC7wCfpeGD-0Rmym3mzs-6Kk4Bh4reFPxpRFUrjhnAe3z3f42XNmitiFk5TjIm7Qat2u4i1DtvrRNqiJy_WVoS0dOIMpSglabXUNgHrAmDGR8YnVfnyPq5wL7Q-BmRMg_9yhgnoEhFBXaPtLub1NxkpygWQquCOJM__H3huoFas_l7AgWq6-YSygsuFIUncp-2T-1Gsm44j5aO3OLWPZIt-yvsmdmjNhGEMXXKRxxhJpdM0BXi6w_Kw4MzwFFffyGNdC6eQQtI64qx_zYN-g_W39j-RW9J2y81AivoC3JK9PXimxQr5pPG1IyNg0kwZPTDO1EE8vMu9GdJEk4fSEUJcmnE6bju1gNpq4g-hQAryJp4iVAXXhlHJ5UGQG30pEU43JV0QYNvkNbjLAqcUTyOYa5QPPmvhZekgHvzbTUiOWrCMr3CRI7QVLN9zn4PoYeuDZUSv2kLS67lYAc3nyGx6YjLS4UwIxs5SoB9L8sZhlxrfjp1L39tjVWnVj4clM_3YDSoZVa8-xJPoIR8FI42IIHeMSW-A2FbbBoJlf2uVvFV8XubLb92KNkQjZn4ZWb_i1-W_Vax0VXiexrf3Fqxa_rvmi5R6FaePO13mMltNEoXCBSaraKCeyY4CYabn9jPcosIXMi8iHABJDgKacRBq5YgP-t6oBTV1-wIOfEGdtuLnbSLaedBmmNrrz-z6i38APgR6yoj5M4ewWWymlVqCMeNoQv8gV0mw-tWJb6F4V2VxVQmYzKXAaIGQbW-Z--cvQfhWLmcmKAh8PTlh8GxN0QtHal6uXWTPxrB3kEWZmRrtXdr8bBD7IMI_0-y1t2kdAeHcMobIaV0AhA-gf2gOUVR0pMGsd7ueqfzFi-5uSZUPJM3mvithiuGks6qNwI47R7nW0aQBDNBO21phfgUuDrwUkt2TENLTuzTeECy8mLHB1k_06lTqCh8MjA1hAGk24XkZ6KjG0G6T3fj6ljQ6KrBS5V3NYqk8pY8HU5vYM1j24DpouWHTcPV2kYkT_U5O-hMJ0c-hX3abUOsEgKU_vtpdyV5GQ8B_RgGvuhU8nFJheJZ2wcBp-w2zJjorHMblbDtTGn8K6Fpj1Tssf09oCBZ2hYQEmdoONJrr5Nc9Jle88q5ito8VHcdxyZYlMgKL1hFOW2b5apV7ldSchqpFQDUR0wgIXkjWnAem9cG8g7qeIU0Q-cOxzSxhtqNe4v1iErRVpG3HNJKQq9MDDuwFMVmkp26Hhh-ZIpaKaQHVGwE2gd7tOiaYXnIE04hyAG2yWjWaKktKYJt4hcUslKpgQzSxhs-7rsEOcWQjSNZSDBSFvoHuOrX6edJszyMvk1wyjIX3j4IGhaM6lJoN-W3Q16rH6x6LbzUt1qrN7W9LEuEBxe5sr7qx9jCujuQMsR10fGEWz3sul6nJlsEzRzpNjM5OUlya7SaifAHtZ80zXEXWUnjDTniPx1dauCqwniRwJU_zalvHr1g95j6sS0duC2KEnd21hkp1P8Bj1xNAVPskKdz5_Kvj7iS7GsEx-z2EwxpnDk74sluV)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
