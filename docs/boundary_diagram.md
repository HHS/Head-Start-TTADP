System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/fLPVRnit37_tf-3oKBX04tT91XJ3CDI9tJH3t7evjtqf4CWwsXQgawuYPTSO-jqdAkUpBqQ73GEIMAR87yaV_oYlYLNWMDdUJyPf6qk45NDDlmu6GMtEbePNSHu9W_QEqV6PzjL0bS4ejxQnZeFhozEfLOu_JEu6LZ4I9z73TT9Mnc4ugmMR3Lk4sMm8HPNSmTiuXxcFhbHX2sk3czuK0tdNh_E7G_i2JlQg7mZ3IP8C7Q0hJoKSy0lWrHFCa-Sxd1BNQ7r2w-2CTjAJZdYTG7s0reP0kH9kPfE4vpmZA8Anqs5Ri_7kNPBqXjQ2ba2rY2ZPraOpbg020cPT-RP9zC7ihe2VpyuXEej4u5FOOMC8GR3Birxode-zguQHljgGPFkfW1k_lhO-bYVFuQyUGAkXHRZqwwIMZsVftEW055jYh1x6trYG7fIT7wg1zQeydIkhd6veJOw6TrSfswvrw-L1rQO3CPpU_eDsy94pyxyzisgBWNw7lUdZ9OdVd1cyaPp25ZYenS9e80nhex71ttF2VYwnQXsmDAo4z_QsJHsWxRp-PhD9WTUTEBej-0ddCAnhQtI6avZU-HB_A5x0-5iTa58Pxb5fbfkHeJh1F3Q7zjQYPig0fM9r1fDesTGMmJXYuPOWHEUCM-PKkh5fgoebrNjZaWLfbHKphvaOLGq_okdMCGQdBAXzcB3mOM-IXo7MKbGwTZIQPnfAeMxgYPS1Yp_lOAHOpHNXhlhteqAEZHb1C-nDgcvXbZ6qlhia_j0dNJJWnGNCe_w2VD8Av5Im3qX0KaeD2-514I7lilZUaz_llSSEwxyjnaMoaezidN9F5eLPEdZlFhl9co6iZOAPgV3qIX6MKbdm0QQt7q6hK7vEMeMFGQFiZfkW72Dc9fB3jisMf1v8APBIO7a_d4nF4_N1hnDWeLIHEwtJzWut0QtHqZouWNivxyWqBlf8CF7Ei0-v5L96IULmGHq0J9HJIuGaJZnNqaJm3AnVBfEfOERL33VZsM3wlaX_Fim6e_7TU3Q6_kNbnVE4BjXDutUG0zO-C06ZnGevR0METTqnFDY--yLHvPZQHlzlOKWJ7Exqqc-Sj6fJRsQbLnKwfWvi1wQDv7Y_rC5_Cp9d-3KYCVtxs8wmMix-1sYBqKwtJ2dbN5iO40JelthvwkMHNTFZ0JaON6FRf4Uy7xWzDbUHL-XOjWKInERjV3zCulFZGZT6QmnciGLJYYLlZvDkNLwPZjDslGHK9GqsmOXNYPYG8Q3seSp9r_JLGl-Noulp7w18hnoZx7QHGAnh3UZAsXl7XqFR39Cqqcvuhsy7roEOcXgjSNWyjVaV6mdxnh1iCLajRujJSHPajylUAn5aRCYmboUc2w1Dq1Qr4L_vU7txPEfbTo-RjLcqZzhH-BUHJEFS6bfbnmALBe3Iz_xvULFgDkf3vxwgakBA-o_WF9k5zEuk8c0lZn0yib6tR6ImFSYJTtw4jVNRpfEJVYXgZKIBQ1ku19oGxjJsOVHaSpnAxvkTdGMlqPMnidy3" alt="rendered boundary diagram">

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
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
    }
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/fLPVRnit37_tf-3oKBX04tT91XJ3CDI9tJH3t7evjtqf4CWwsXQgawuYPTSO-jqdAkUpBqQ73GEIMAR87yaV_oYlYLNWMDdUJyPf6qk45NDDlmu6GMtEbePNSHu9W_QEqV6PzjL0bS4ejxQnZeFhozEfLOu_JEu6LZ4I9z73TT9Mnc4ugmMR3Lk4sMm8HPNSmTiuXxcFhbHX2sk3czuK0tdNh_E7G_i2JlQg7mZ3IP8C7Q0hJoKSy0lWrHFCa-Sxd1BNQ7r2w-2CTjAJZdYTG7s0reP0kH9kPfE4vpmZA8Anqs5Ri_7kNPBqXjQ2ba2rY2ZPraOpbg020cPT-RP9zC7ihe2VpyuXEej4u5FOOMC8GR3Birxode-zguQHljgGPFkfW1k_lhO-bYVFuQyUGAkXHRZqwwIMZsVftEW055jYh1x6trYG7fIT7wg1zQeydIkhd6veJOw6TrSfswvrw-L1rQO3CPpU_eDsy94pyxyzisgBWNw7lUdZ9OdVd1cyaPp25ZYenS9e80nhex71ttF2VYwnQXsmDAo4z_QsJHsWxRp-PhD9WTUTEBej-0ddCAnhQtI6avZU-HB_A5x0-5iTa58Pxb5fbfkHeJh1F3Q7zjQYPig0fM9r1fDesTGMmJXYuPOWHEUCM-PKkh5fgoebrNjZaWLfbHKphvaOLGq_okdMCGQdBAXzcB3mOM-IXo7MKbGwTZIQPnfAeMxgYPS1Yp_lOAHOpHNXhlhteqAEZHb1C-nDgcvXbZ6qlhia_j0dNJJWnGNCe_w2VD8Av5Im3qX0KaeD2-514I7lilZUaz_llSSEwxyjnaMoaezidN9F5eLPEdZlFhl9co6iZOAPgV3qIX6MKbdm0QQt7q6hK7vEMeMFGQFiZfkW72Dc9fB3jisMf1v8APBIO7a_d4nF4_N1hnDWeLIHEwtJzWut0QtHqZouWNivxyWqBlf8CF7Ei0-v5L96IULmGHq0J9HJIuGaJZnNqaJm3AnVBfEfOERL33VZsM3wlaX_Fim6e_7TU3Q6_kNbnVE4BjXDutUG0zO-C06ZnGevR0METTqnFDY--yLHvPZQHlzlOKWJ7Exqqc-Sj6fJRsQbLnKwfWvi1wQDv7Y_rC5_Cp9d-3KYCVtxs8wmMix-1sYBqKwtJ2dbN5iO40JelthvwkMHNTFZ0JaON6FRf4Uy7xWzDbUHL-XOjWKInERjV3zCulFZGZT6QmnciGLJYYLlZvDkNLwPZjDslGHK9GqsmOXNYPYG8Q3seSp9r_JLGl-Noulp7w18hnoZx7QHGAnh3UZAsXl7XqFR39Cqqcvuhsy7roEOcXgjSNWyjVaV6mdxnh1iCLajRujJSHPajylUAn5aRCYmboUc2w1Dq1Qr4L_vU7txPEfbTo-RjLcqZzhH-BUHJEFS6bfbnmALBe3Iz_xvULFgDkf3vxwgakBA-o_WF9k5zEuk8c0lZn0yib6tR6ImFSYJTtw4jVNRpfEJVYXgZKIBQ1ku19oGxjJsOVHaSpnAxvkTdGMlqPMnidy3)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
