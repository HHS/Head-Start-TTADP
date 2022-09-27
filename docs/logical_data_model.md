Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/pLXBRnit4Bxlh-2j3pH6qQ8z144Gnr42eubjMCwfw85QZbTqkHnsEAj4iFtVAovbTkbTsMj9TNkniT-yP_ZneJUU9N5JcyANqe3uyU3NNuhY6o4Ng9LmX3C3jHTVDC-5j9K19Kh2BrvS0d3X_zJMIPArCDe2Bnq899vZKPH6UYy-Uo1nNGZnlT1Al1JQCbGhwDMh2YoGP52lNxVYkGSVj8-3ccVIjifmAsleIW9-sAn2aMODVYMIH7BvAYe4d_Sjt1mjd3Jr3AWBGosrwGAisS1B0RQfGnoiuHmgZVQuKy2tF__qdJYVl9-SJqwE9bFXcfdHvK5Kz0TQjRaRwVaZLjgk35dNu5dMhfMK1A7sG-v96gS69BTt3OqHnhKqRq1oCItHmJOUX53WIzAEDTg4xbJE6L2jlHzTKkE1HimXB9Wq1TfoUZxqQOHPsyzWjUja_sfMs8G8oO_f1hhmeT5s9zIGxdxMm7FC64Knp5jKonps3gs7JVWHAX3xcVadgGtGYXVZHdw5itjxGgJi1Qx0toFwHmlBCdOZKZSWlfbTGScvTL1RQ5wUWqDY7xoiemStlYbBy06T8HgGDZQXCS7BbKSxst7CQ8R8zn1XBz3fShnD2XFjHZMPq8nPwi5hMkaSt1-hnspQB7QdnmUKPbmFXF0ikV5T93Yyf7jgshydhAUr9FPp0BvWUMQapKQ_VSPnR0-bNQra8veUNFn7JJ-1hpnbS3wLa5UGK-dnj0up_RlqB39a30t0nTB1y7wpiOODssgfdGRBOnUF47Hd4dBOqwRtWUG3AVGk9TkUMIdrKQPhtMZS8qr0YDz9Xdl5WbK3QAbqnfnTcnMPCshpsgRerBAAv2ZBa5IqsfAxs_VZbET04ykQbrlSstQBdLDsJ7W3bIoNnweJVtBqyRUZS_3OKDbUvzNGVHrjNw-l9fNIuPoNvWGPiWKRUNHwUIQ9TQbT65X6DGL6Bu2MdthN8jMakvI2KjVIP0izj2Wn8eFI5fXj6lqBLyvlHrYHh8FkqDE59LN0P-WQqsOrfBFGn8qqxzObzSDAZtR0pcNDwOdR0sP8KA9b-CfP5RA2AKk6zTLe1Q5HdwHTuTIRJdiTMz_sfxtDffIc3DM2YhAEY5d6wlASOhH3vmWNg-yOzgclWorU54Pw_Xn9ytRvBpz6WjaUwHkRDUv9tZ_TnTEEzoqwt3s9khn6tjTsTje-2FG2HhJWQTjyp9qrctzo_I6kthEmGXMe38zLPj0UvjpP-fvno4ywGwC9fZDj38Sw9-2UAN64niWPacJyNzDYG_fXvJrRsbimOaFQYORFcZlUHHtX8MMumteBinCtDo_mMiJjF2At-EB5pNNdjwyCpbClugzrVPFeS4Y09kctpy2Y_IjkRree3AP8bvKxnNJZBiAV7XgT7Xo8yB_hT12AOPEtXEIXGsDIa7KvEPPt8hZPJDtOmeTL-lxI-_QnMB4B6HGBmEiDHsmn3CVMteYGRkfEFrGKhKUMYwCehggqI8iDz8hXdg2OYpjBk2VAFpETx1Wgsc46-R2uixLlLde3LZMr-Hi0" alt="logical data model diagram">

UML Source
----------

```
@startuml
scale 0.65

' avoid problems with angled crows feet
skinparam linetype ortho

class User {
  * id : integer <<generated>>
  * hsesUserId : string
  * hsesUsername : string
  hsesAuthorities : array<string>
  name : string
  phoneNumber : string
  email : string
  title: enum
  homeRegionId : integer(32) REFERENCES public.Regions.id
  * lastLogin : timestamp
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Region {
  * id : integer <<generated>>
  * name : string
}

class Scope {
  * id : integer <<generated>>
  * name : string
  description: string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Permission {
  * id : integer <<generated>>
  * userId : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Regions.id
  * scopeId : integer(32) REFERENCES public.Scopes.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class RequestErrors {
  * id : integer <<generated>>
  operation : string
  uri : string
  method : string
  requestBody : string
  responseBody : string
  responseCode : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class MailerLog {
  * id : integer <<generated>>
  * jobId : string
  * emailTo : [string]
  * action : enum
  * subject : string
  * activityReports : [integer]
  success : boolean
  result : jsonb
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Role {
  * id : integer
  * name : string
}

class Topic {
  * id : integer
  * name : string
}

class RoleTopic {
  * id : integer <<generated>>
  * roleId : integer(32) REFERENCES public.Roles.id
  * topicId: integer(32) REFERENCES public.Topics.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Goal {
  * id : integer
  * name : string
  status : string
  timeframe : string
  isFromSmartsheetTtaPlan : boolean
  * createdAt : timestamp
  * updatedAt : timestamp
}

class TopicGoal {
  * id : integer
  * goalId : integer(32) REFERENCES public.Goals.id
  * topicId: integer(32) REFERENCES public.Topics.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class NextSteps {
  * id: integer
  * activityReportId: integer(32) REFERENCES public.ActivityReport.id
  * note: string
  * noteType: string
  * createdAt: timestamp
  * updatedAt: timestamp
}

class Recipient {
  * id : integer
  * name : string
    recipientType : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Grant {
  * id : integer
  * number : string
  regionId : integer(32) REFERENCES public.Regions.id
  * recipientId : integer(32) REFERENCES public.Recipient.id
  status : string
  startDate : timestamp
  endDate : timestamp
  cdi : boolean
  * createdAt : timestamp
  * updatedAt : timestamp
}

class GrantGoal {
  * id : integer <<generated>>
  * recipientId : integer(32) REFERENCES public.Recipients.id
  * grantId : integer(32) REFERENCES public.Grants.id
  * goalId : integer(32) REFERENCES public.Goals.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class OtherEntity {
  * id : integer <<generated>>
  * name : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReport {
  * id : integer <<generated>>
  legacyId: string
  ECLKCResourcesUsed : array<string>
  nonECLKCResourcesUsed: array<string>
  additionalNotes : string
  numberOfParticipants : integer
  deliveryMethod : string
  duration : decimal
  endDate : date
  startDate : date
  activityRecipientType : string
  requester : string
  programTypes : array<string>
  targetPopulations : array<string>
  virtualDeliveryType : string
  reason : array<string>
  participants : array<string>
  topics : array<string>
  context : string
  pageState : json
  oldManagerNotes : string
  * submissionStatus : string
  calculatedStatus: string
  ttaType : array<string>
  oldApprovingManagerId : integer(32) REFERENCES public.Users.id
  * userId : integer(32) REFERENCES public.Users.id
  lastUpdatedById : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Region.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReportApprover {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * userId : integer(32) REFERENCES public.User.id
  status: string
  note : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Objective {
  * id : integer <<generated>>
  * goalId : integer(32) REFERENCES public.Goal.id
  title : string,
  ttaProvided : string,
  status : string,
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityParticipant {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  grantId : integer(32) REFERENCES public.Grant.id
  otherEntityId : integer(32) REFERENCES public.OtherEntity.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReportCollaborator {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * userId : integer(32) REFERENCES public.User.id
}

class ActivityReportGoal {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * goalId : integer(32) REFERENCES public.Goal.id
}

class ActivityReportObjective {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * objectiveId : integer(32) REFERENCES public.Objective.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

User ||-o{ Region
User }o--|{ Permission
User }o--|{ ActivityReport
Scope }o--|{ Permission
Region }o--|{ Permission
Role }o--|{ Topic
Topic }|--|{ Goal
Recipient }o--|{ GrantGoal
Goal }o--|{ GrantGoal
Role .. RoleTopic
Topic .. RoleTopic
Topic .. TopicGoal
Goal .. TopicGoal
Recipient ||--|{ Grant
Region ||--|{ Grant
ActivityReport .. ActivityReportCollaborator
User .. ActivityReportCollaborator
ActivityReport .. NextSteps
ActivityReport .. ActivityReportGoal
ActivityReport ||--o{ ActivityReportApprover
ActivityReportApprover }o--|| User
Goal .. ActivityReportGoal
Goal }|--|{ ActivityReport
Goal ||-o{ Objective
ActivityReportObjective }o--|{ Objective
ActivityReportObjective }o--|{ ActivityReport

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
OtherEntity ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](//www.plantuml.com/plantuml/png/pLXBRnit4Bxlh-2j3pH6qQ8z144Gnr42eubjMCwfw85QZbTqkHnsEAj4iFtVAovbTkbTsMj9TNkniT-yP_ZneJUU9N5JcyANqe3uyU3NNuhY6o4Ng9LmX3C3jHTVDC-5j9K19Kh2BrvS0d3X_zJMIPArCDe2Bnq899vZKPH6UYy-Uo1nNGZnlT1Al1JQCbGhwDMh2YoGP52lNxVYkGSVj8-3ccVIjifmAsleIW9-sAn2aMODVYMIH7BvAYe4d_Sjt1mjd3Jr3AWBGosrwGAisS1B0RQfGnoiuHmgZVQuKy2tF__qdJYVl9-SJqwE9bFXcfdHvK5Kz0TQjRaRwVaZLjgk35dNu5dMhfMK1A7sG-v96gS69BTt3OqHnhKqRq1oCItHmJOUX53WIzAEDTg4xbJE6L2jlHzTKkE1HimXB9Wq1TfoUZxqQOHPsyzWjUja_sfMs8G8oO_f1hhmeT5s9zIGxdxMm7FC64Knp5jKonps3gs7JVWHAX3xcVadgGtGYXVZHdw5itjxGgJi1Qx0toFwHmlBCdOZKZSWlfbTGScvTL1RQ5wUWqDY7xoiemStlYbBy06T8HgGDZQXCS7BbKSxst7CQ8R8zn1XBz3fShnD2XFjHZMPq8nPwi5hMkaSt1-hnspQB7QdnmUKPbmFXF0ikV5T93Yyf7jgshydhAUr9FPp0BvWUMQapKQ_VSPnR0-bNQra8veUNFn7JJ-1hpnbS3wLa5UGK-dnj0up_RlqB39a30t0nTB1y7wpiOODssgfdGRBOnUF47Hd4dBOqwRtWUG3AVGk9TkUMIdrKQPhtMZS8qr0YDz9Xdl5WbK3QAbqnfnTcnMPCshpsgRerBAAv2ZBa5IqsfAxs_VZbET04ykQbrlSstQBdLDsJ7W3bIoNnweJVtBqyRUZS_3OKDbUvzNGVHrjNw-l9fNIuPoNvWGPiWKRUNHwUIQ9TQbT65X6DGL6Bu2MdthN8jMakvI2KjVIP0izj2Wn8eFI5fXj6lqBLyvlHrYHh8FkqDE59LN0P-WQqsOrfBFGn8qqxzObzSDAZtR0pcNDwOdR0sP8KA9b-CfP5RA2AKk6zTLe1Q5HdwHTuTIRJdiTMz_sfxtDffIc3DM2YhAEY5d6wlASOhH3vmWNg-yOzgclWorU54Pw_Xn9ytRvBpz6WjaUwHkRDUv9tZ_TnTEEzoqwt3s9khn6tjTsTje-2FG2HhJWQTjyp9qrctzo_I6kthEmGXMe38zLPj0UvjpP-fvno4ywGwC9fZDj38Sw9-2UAN64niWPacJyNzDYG_fXvJrRsbimOaFQYORFcZlUHHtX8MMumteBinCtDo_mMiJjF2At-EB5pNNdjwyCpbClugzrVPFeS4Y09kctpy2Y_IjkRree3AP8bvKxnNJZBiAV7XgT7Xo8yB_hT12AOPEtXEIXGsDIa7KvEPPt8hZPJDtOmeTL-lxI-_QnMB4B6HGBmEiDHsmn3CVMteYGRkfEFrGKhKUMYwCehggqI8iDz8hXdg2OYpjBk2VAFpETx1Wgsc46-R2uixLlLde3LZMr-Hi0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
