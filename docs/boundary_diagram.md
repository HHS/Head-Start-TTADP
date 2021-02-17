System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/png/dLPHRnit37xFh-3oKAH04sDfNpOCGvtOJJCagvjpsvS2WQoZRIqwIHKfkyRG_pvHELzySJCKVKYiayIF7qNoaruJgyYfiGU_6ATjgX6Mp85-7moYMfyi32_JB156xHsZunFjcu6ger5kPLD8W_DNnnEh77-ulXfOnKYSfsxFlMDb7CQJ8DXis29CfqEe6XKPtgOPp7nojOeRM1bS7qmmadT7eVmuj2_Wy67h1y9uc6U63j3Lnq87_1nu-GZpyFaMfyOLMf_HUZYZxUnXRtgLGNs4peP0kHekfjSPxwnbUQJM90m-LN3XL-VMf_hmEVnx0D3jq3AvyAkyhGnFyhZT0r1jYB6v7NzbGRfLThQx3QnNzV5CMULqOLSS3Q_ECeE-TUVbLWNJWnXEBlzdT_I9osdyySog3KRw4nvCxnT9_9R8u8t453V0KStdHWDXN1cDBVx3cR2V2LUj8zQ65HllkjKkT82k6exMwtKc7dey-cNn2MSm3C4QNU24qz--nh-g5p3-6Y9IJiCDAisoCZ8KCinzmhIt5ZLJ0QmLgnEuJfPDi0Z64SlP4iJad76B7CeUDn_lCBRq7f4gIq_nEalMolS4uzp71cPAtosY70C8PY4dV214hv7e--wrLOsIudbZB09fLNYMj9Qyg6RuKKQNZZ4wPK4zi87izy6az4SAKbEqxsWqArcePyBO4oyYLk-lOAHOpHJXjlXkHfKCMpE2jl_RatPpiqYnyztFuPC-wMKBNhs4MT9to8VTH6b9zX49I2f9mrpEGH4XFns5r9tqvOtyxiKmjeeoajBBClK-OKBmyzq4_UDd1Epl4-LTw-ZRWVnzExZlfAEtrRZAzl9JQ1gti0YLMJXuvpwxwpT3M1a5KzFWyPaYhALIm4UON7u4hMBzEU-gV8gwkB-8oZ5YeRihCGjIjwGKIGrWVJEydXoh4A9VPS1AgQfqLA-z7QuZMgEb674DDpBUPisuv1F1jNU6VImrboFAMtR5SGVWMZcrG0ZtHIpD0i_0-iKYcmfckHRWOZmTJDvL-T-7wM0qlXfFnt3qwjNBvnbTiDi6xo5733uo0QF51Zbk18vrw1dkAF-3G3Q5KzVGFqR3UKQ8Ph5ay0wiSNS7Gsj12xgMYYMeCHZDM8EA2EXqt0JvMXjUmlIgWbzFJY4vYqJWUObnRGX1SEkJ0tHr6GhhhgftxwtQhvtqNbl0p4el6tHCFVgzuBk8z_KwHF_LY6xXbuJ4zEEfsCFgSlFpe3sHx1HBb8TAk3j8WW97lprXsxPKH8u6LzZrn5wQzwjhnrmbNgAJ5cUaedjY-swOfq_twwerMc4qymsOMYnvinzxv_BCz9nsiXbHrJHOHoDUXJ4XGqJjOqq25-YBxSoxg7yMeKz0gctVV2lFOhiA6j3LmHl7-on-5cQFo5PwqNqHNIMHKWWggWQtZucovIaA7K2DtmM0Pv129jLU2Ac7s6bcgsNINrljFBySd8zWOW9Qut1VDCkRLf9mOLXkAr7sjzMnX1wzjIZtMuqWgaM6lRna-W3QH6rH6_5LXkUNZqHNxkX5UprMtTjfJtqx9fCqiuQMnR50vGMW_7rqUjgMViTwrxbl6iEmzFvE5CdCfQMtZ80znEJW_ZH2Tne5x07aqNDoXC7wJUzfuHrGqXg9vicsS1au8rsfpUteaN3VpzwqLsQPU8skJetz3m00)

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
Lay_D(personnel, aws)
Lay_R(HSES, aws)
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dLPHRnit37xFh-3oKAH04sDfNpOCGvtOJJCagvjpsvS2WQoZRIqwIHKfkyRG_pvHELzySJCKVKYiayIF7qNoaruJgyYfiGU_6ATjgX6Mp85-7moYMfyi32_JB156xHsZunFjcu6ger5kPLD8W_DNnnEh77-ulXfOnKYSfsxFlMDb7CQJ8DXis29CfqEe6XKPtgOPp7nojOeRM1bS7qmmadT7eVmuj2_Wy67h1y9uc6U63j3Lnq87_1nu-GZpyFaMfyOLMf_HUZYZxUnXRtgLGNs4peP0kHekfjSPxwnbUQJM90m-LN3XL-VMf_hmEVnx0D3jq3AvyAkyhGnFyhZT0r1jYB6v7NzbGRfLThQx3QnNzV5CMULqOLSS3Q_ECeE-TUVbLWNJWnXEBlzdT_I9osdyySog3KRw4nvCxnT9_9R8u8t453V0KStdHWDXN1cDBVx3cR2V2LUj8zQ65HllkjKkT82k6exMwtKc7dey-cNn2MSm3C4QNU24qz--nh-g5p3-6Y9IJiCDAisoCZ8KCinzmhIt5ZLJ0QmLgnEuJfPDi0Z64SlP4iJad76B7CeUDn_lCBRq7f4gIq_nEalMolS4uzp71cPAtosY70C8PY4dV214hv7e--wrLOsIudbZB09fLNYMj9Qyg6RuKKQNZZ4wPK4zi87izy6az4SAKbEqxsWqArcePyBO4oyYLk-lOAHOpHJXjlXkHfKCMpE2jl_RatPpiqYnyztFuPC-wMKBNhs4MT9to8VTH6b9zX49I2f9mrpEGH4XFns5r9tqvOtyxiKmjeeoajBBClK-OKBmyzq4_UDd1Epl4-LTw-ZRWVnzExZlfAEtrRZAzl9JQ1gti0YLMJXuvpwxwpT3M1a5KzFWyPaYhALIm4UON7u4hMBzEU-gV8gwkB-8oZ5YeRihCGjIjwGKIGrWVJEydXoh4A9VPS1AgQfqLA-z7QuZMgEb674DDpBUPisuv1F1jNU6VImrboFAMtR5SGVWMZcrG0ZtHIpD0i_0-iKYcmfckHRWOZmTJDvL-T-7wM0qlXfFnt3qwjNBvnbTiDi6xo5733uo0QF51Zbk18vrw1dkAF-3G3Q5KzVGFqR3UKQ8Ph5ay0wiSNS7Gsj12xgMYYMeCHZDM8EA2EXqt0JvMXjUmlIgWbzFJY4vYqJWUObnRGX1SEkJ0tHr6GhhhgftxwtQhvtqNbl0p4el6tHCFVgzuBk8z_KwHF_LY6xXbuJ4zEEfsCFgSlFpe3sHx1HBb8TAk3j8WW97lprXsxPKH8u6LzZrn5wQzwjhnrmbNgAJ5cUaedjY-swOfq_twwerMc4qymsOMYnvinzxv_BCz9nsiXbHrJHOHoDUXJ4XGqJjOqq25-YBxSoxg7yMeKz0gctVV2lFOhiA6j3LmHl7-on-5cQFo5PwqNqHNIMHKWWggWQtZucovIaA7K2DtmM0Pv129jLU2Ac7s6bcgsNINrljFBySd8zWOW9Qut1VDCkRLf9mOLXkAr7sjzMnX1wzjIZtMuqWgaM6lRna-W3QH6rH6_5LXkUNZqHNxkX5UprMtTjfJtqx9fCqiuQMnR50vGMW_7rqUjgMViTwrxbl6iEmzFvE5CdCfQMtZ80znEJW_ZH2Tne5x07aqNDoXC7wJUzfuHrGqXg9vicsS1au8rsfpUteaN3VpzwqLsQPU8skJetz3m00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
