WITH
  filtered_activity_reports AS (
    SELECT
      a.id "activityReportIds"
    FROM "ActivityReports" a
    WHERE a."calculatedStatus" = 'approved'
    -- Filter for findingType if ssdi.reportId is defined
    AND (
      NULLIF(current_setting('ssdi.reportId', true), '') IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.reportId', true), '[]')::json, '[]'::json)
          ) AS value
          WHERE a."id" = value::int
        ) != (current_setting('ssdi.reportId.not', true) = 'true')
      )
    )
    -- Filter for startDate dates between two values if ssdi.startDate is defined
    AND (
      NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
      OR (
        a."startDate"::date <@ (
          SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
          )::daterange
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''), '[]')::json
          ) AS value
        ) != (current_setting('ssdi.startDate.not', true) = 'true')
      )
    )
    -- Filter for endDate dates between two values if ssdi.endDate is defined
    AND (
      NULLIF(current_setting('ssdi.endDate', true), '') IS NULL
      OR (
        a."endDate"::date <@ (
          SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
          )::daterange
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.endDate', true), ''), '[]')::json
          ) AS value
        ) != (current_setting('ssdi.endDate.not', true) = 'true')
      )
    )
    -- Filter for reason if ssdi.reason is defined, for array columns
    AND (
      NULLIF(current_setting('ssdi.reason', true), '') IS NULL
      OR (
        (a."reason"::text[] && ARRAY(
          SELECT value::text
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.reason', true), '[]')::json, '[]'::json)
          )
        )) != (current_setting('ssdi.reason.not', true) = 'true')
      )
    )
    -- Filter for regionIds if ssdi.regionIds is defined
    AND (
      NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
      OR (
        a."regionId" IN (
          SELECT
            value::integer
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.regionIds', true), '[]')::json, '[]'::json)
          )
        )
      )
    )
    -- Filter for targetPopulations if ssdi.targetPopulations is defined, for array columns
    AND (
      NULLIF(current_setting('ssdi.targetPopulations', true), '') IS NULL
      OR (
        (a."targetPopulations"::text[] && ARRAY(
          SELECT value::text
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.targetPopulations', true), '[]')::json, '[]'::json)
          )
        )) != (current_setting('ssdi.targetPopulations.not', true) = 'true')
      )
    )
    -- Filter for ttaType where both column and filter are jsonb arrays and compare them ignoring order
    AND (
      NULLIF(current_setting('ssdi.ttaType', true), '') IS NULL
      OR (
        (
          a."ttaType"::text[] @> ARRAY(
            SELECT value::text
            FROM json_array_elements_text(
              COALESCE(NULLIF(current_setting('ssdi.ttaType', true), '')::json, '[]'::json)
            )
          )
          AND a."ttaType"::text[] <@ ARRAY(
            SELECT value::text
            FROM json_array_elements_text(
              COALESCE(NULLIF(current_setting('ssdi.ttaType', true), '')::json, '[]'::json)
            )
          )
        ) != (current_setting('ssdi.ttaType.not', true) = 'true')
      )
    )
  ),
  filtered_grants AS (
    SELECT
      gr.id "grantId"
    FROM "Grants" gr
    JOIN "Recipients" r
    ON gr."recipientId" = r.id
    -- Filter for recipients if ssdi.recipients is defined
    AND (
      NULLIF(current_setting('ssdi.recipients', true), '') IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.recipients', true), '[]')::json, '[]'::json)
          ) AS value
          WHERE r.name ~* value::text
        ) != (current_setting('ssdi.recipients.not', true) = 'true')
      )
    )
    JOIN "Programs" p
    ON gr.id = p."grantId"
    -- Filter for programType if ssdi.programType is defined
    AND (
      NULLIF(current_setting('ssdi.programType', true), '') IS NULL
      OR (
        p."programType" IN (
          SELECT
            value::text
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.programType', true), '[]')::json, '[]'::json)
          )
        ) != (current_setting('ssdi.programType.not', true) = 'true')
      )
    )
    LEFT JOIN "GroupGrants" gg
    ON gr.id = gg."grantId"
    LEFT JOIN "Groups" g
    ON gg."groupId" = g.id
    -- Filter for group if ssdi.group is defined
    AND (
      NULLIF(current_setting('ssdi.group', true), '') IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.group', true), '[]')::json, '[]'::json)
          ) AS value
          WHERE g.name ~* value::text
        ) != (current_setting('ssdi.group.not', true) = 'true')
      )
    )
    LEFT JOIN "GroupCollaborators" gc
    ON g.id = gc."groupId"
    AND gc."deletedAt" IS NULL
    -- Filter for userId if ssdi.currentUserId is defined
    AND (
      NULLIF(current_setting('ssdi.currentUserId', true), '') IS NULL
      OR (
        gc."userId" IN (
          SELECT
            value::integer
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.currentUserId', true), '[]')::json, '[]'::json)
          )
        )
      )
    )
    WHERE gr."status" = 'Active'
    -- Filter for group if ssdi.group is defined from left joined table above
    AND (NULLIF(current_setting('ssdi.group', true), '') IS NULL OR (g.id IS NOT NULL AND gc.id IS NOT NULL))
    -- Filter for grantNumbers if ssdi.grantNumbers is defined
    AND (
      NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.grantNumbers', true), '[]')::json, '[]'::json)
          ) AS value
          WHERE gr.number ~* value::text
        ) != (current_setting('ssdi.grantNumbers.not', true) = 'true')
      )
    )
    -- Filter for stateCode if ssdi.stateCode is defined
    AND (
      NULLIF(current_setting('ssdi.stateCode', true), '') IS NULL
      OR (
        gr."stateCode" IN (
          SELECT value::text
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.stateCode', true), '[]')::json, '[]'::json)
          )
        ) != (current_setting('ssdi.stateCode.not', true) = 'true')
      )
    )
    -- Filter for regionIds if ssdi.regionIds is defined
    AND (
      NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
      OR (
        gr."regionId" IN (
          SELECT
            value::integer
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.regionIds', true), '[]')::json, '[]'::json)
          )
        )
      )
    )
  ),
  filtered_grants_monitoring_class AS (
    SELECT
      fg."grantId"
    FROM filtered_grants fg
    JOIN "Grants" gr
    ON fg."grantId" = gr.id
    LEFT JOIN "MonitoringClassSummaries" mcs
    ON gr.number = mcs."grantNumber"
    LEFT JOIN "MonitoringReviews" mr
    ON mcs."reviewId" = mr."reviewId"
    LEFT JOIN "MonitoringReviewStatuses" mrs
    ON mr."statusId" = mrs."statusId"
    AND mrs."name" = 'Complete'
    GROUP BY 1
    HAVING 1 = 1
    -- Conditional logic for domain support filters and mrs.id requirement
    AND (
      -- If any of the domain filters have a value, then mrs.id must not be NULL
      (
        COALESCE(
          NULLIF(current_setting('ssdi.domainEmotionalSupport', true), ''),
          NULLIF(current_setting('ssdi.domainClassroomOrganization', true), ''),
          NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '')
        ) IS NOT NULL
        AND (ARRAY_AGG(DISTINCT mrs.id))[0] IS NOT NULL
      )
      -- If all domain filters are NULL, then mrs.id can be anything
      OR (
        COALESCE(
          NULLIF(current_setting('ssdi.domainEmotionalSupport', true), ''),
          NULLIF(current_setting('ssdi.domainClassroomOrganization', true), ''),
          NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '')
        ) IS NULL
      )
    )
    -- Filter for domainEmotionalSupport if ssdi.domainEmotionalSupport is defined
    AND (
      NULLIF(current_setting('ssdi.domainEmotionalSupport', true), '') IS NULL
      OR (
        ((ARRAY_AGG(mcs."emotionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[0] >= (
          SELECT value::numeric
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.domainEmotionalSupport', true), '[]')::json, '[]'::json)
          ) LIMIT 1
        )) != (current_setting('ssdi.domainEmotionalSupport.not', true) = 'true')
      )
    )
    -- Filter for domainClassroomOrganization if ssdi.domainClassroomOrganization is defined
    AND (
      NULLIF(current_setting('ssdi.domainClassroomOrganization', true), '') IS NULL
      OR (
        ((ARRAY_AGG(mcs."classroomOrganization" ORDER BY mcs."reportDeliveryDate" DESC))[0] >= (
          SELECT value::numeric
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.domainClassroomOrganization', true), '[]')::json, '[]'::json)
          ) LIMIT 1
        )) != (current_setting('ssdi.domainClassroomOrganization.not', true) = 'true')
      )
    )
    -- Filter for domainInstructionalSupport if ssdi.domainInstructionalSupport is defined
    AND (
      NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '') IS NULL
      OR (
        ((ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[0] >= (
          SELECT value::numeric
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '[]')::json, '[]'::json)
          ) LIMIT 1
        )) != (current_setting('ssdi.domainInstructionalSupport.not', true) = 'true')
      )
    )
  ),
  filtered_goals AS (
    SELECT
    FROM filtered_grants_monitoring_class fgmc
    JOIN "Goals" g
    ON fgmc."grantId" = g."grantId"
    -- Filter for name if ssdi.goalName is defined
    AND (
      NULLIF(current_setting('ssdi.goalName', true), '') IS NULL
      OR (
        EXISTS (
          SELECT 1
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.goalName', true), '[]')::json, '[]'::json)
          ) AS value
          WHERE g.name ~* value::text
        ) != (current_setting('ssdi.goalName.not', true) = 'true')
      )
    )
    -- Filter for createDate dates between two values if ssdi.createDate is defined
    AND (
      NULLIF(current_setting('ssdi.createDate', true), '') IS NULL
      OR (
        g."createdAt"::date <@ (
          SELECT
            CONCAT(
              '[',
              MIN(value::timestamp),
              ',',
              COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
              ')'
            )::daterange AS my_array
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.createDate', true), '[]')::json, '[]'::json)
          ) AS value
        ) != (current_setting('ssdi.createDate.not', true) = 'true')
      )
    )
  ),
  no_tta AS (
    SELECT DISTINCT
      r.id,
      COUNT(DISTINCT a.id) != 0 has_tta
    FROM "Recipients" r
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    JOIN filtered_grants_monitoring_class fgmc
    ON gr.id = fgmc."grantId"
    LEFT JOIN "ActivityRecipients" ar
    ON gr.id = ar."grantId"
    LEFT JOIN "ActivityReports" a
    ON ar."activityReportId" = a.id
    AND a."calculatedStatus" = 'approved'
    AND a."startDate"::date > now() - INTERVAL '90 days'
    -- Filter for createdAt dates between two values if ssdi.createdbetween is defined
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
        OR a."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
        ))
    WHERE gr.status = 'Active'
    GROUP BY 1
  ),
  no_tta_widget AS (
    SELECT
      (((COUNT(*) FILTER (WHERE NOT has_tta))::decimal/COUNT(*))*100)::decimal(5,2) "% recipients without tta",
      COUNT(*) FILTER (WHERE not has_tta ) "recipients without tta",
      COUNT(*) total
    FROM no_tta
  ),
  with_fei AS (
    SELECT
      r.id,
      COUNT(DISTINCT g.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 19017) > 0 has_fei
    FROM "Recipients" r
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    LEFT JOIN "Goals" g
    ON gr.id = g."grantId"
    WHERE gr.status = 'Active'
    GROUP BY 1
  ),
  with_fei_widget AS (
    SELECT
      (((COUNT(DISTINCT wf.id) FILTER (WHERE has_fei)::decimal/
      COUNT(DISTINCT wf.id)))*100)::decimal(5,2) "% recipients with fei",
      COUNT(DISTINCT wf.id) FILTER (WHERE wf.has_fei) "recipients with fei",
      COUNT(DISTINCT wf.id) total
    FROM with_fei wf
  ),
  with_fei_graph AS (
    SELECT
      gfrr.response,
        COUNT(*) AS response_count,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ())::decimal(5,2) AS percentage
    FROM with_fei wf
    JOIN "Recipients" r
    ON wf.id = r.id
    AND has_fei
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    JOIN "Goals" g
    ON gr.id = g."grantId"
    AND g."goalTemplateId" = 19017
    LEFT JOIN "GoalFieldResponses" gfr
    ON g.id = gfr."goalId"
    CROSS JOIN UNNEST(gfr.response) gfrr(response)
    GROUP BY 1
  ),
  with_class AS (
    SELECT
      r.id,
      COUNT(DISTINCT g.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 18172) > 0 has_class,
      COUNT(DISTINCT mcs.id) > 0 has_scores
    FROM "Recipients" r
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    LEFT JOIN "Goals" g
    ON gr.id = g."grantId"
    LEFT JOIN "MonitoringReviewGrantees" mrg
    ON gr.number = mrg."grantNumber"
    LEFT JOIN "MonitoringReviews" mr
    ON mrg."reviewId" = mr."reviewId"
    AND mr."reviewType" in ('CLASS', 'PR-CLASS', 'AIAN CLASS Self-Observations', 'AIAN-CLASS', 'VP-CLASS', 'CLASS-Video')
    LEFT JOIN "MonitoringReviewStatuses" mrs
    ON mr."statusId" = mrs."statusId"
    LEFT JOIN "MonitoringClassSummaries" mcs
    ON mr."reviewId" = mcs."reviewId"
    WHERE gr.status = 'Active'
    GROUP BY 1
  ),
  with_class_widget AS (
    SELECT
      (((COUNT(DISTINCT wc.id) FILTER (WHERE has_class)::decimal/
      COUNT(DISTINCT wc.id)))*100)::decimal(5,2) "% recipients with class",
      COUNT(DISTINCT wc.id) FILTER (WHERE wc.has_class) "recipients with class",
      COUNT(DISTINCT wc.id) total
    FROM with_class wc
  ),
  delivery_method_graph AS (
    SELECT
        DATE_TRUNC('month', "startDate")::DATE AS month,
        COUNT(*) FILTER (WHERE a."deliveryMethod" IN ('In person', 'in-person', 'In-person')) AS in_person_count,
        COUNT(*) FILTER (WHERE a."deliveryMethod" IN ('Virtual', 'virtual')) AS virtual_count,
        COUNT(*) FILTER (WHERE a."deliveryMethod" IN ('Hybrid', 'hybrid')) AS hybrid_count,
      ((COUNT(*) FILTER (WHERE a."deliveryMethod" IN ('In person', 'in-person', 'In-person')) * 100.0) / COUNT(*))::decimal(5,2) AS in_person_percentage,
        ((COUNT(*) FILTER (WHERE a."deliveryMethod" IN ('Virtual', 'virtual')) * 100.0) / COUNT(*))::decimal(5,2) AS virtual_percentage,
        ((COUNT(*) FILTER (WHERE a."deliveryMethod" IN ('Hybrid', 'hybrid')) * 100.0) / COUNT(*))::decimal(5,2) AS hybrid_percentage
    FROM "ActivityReports" a
    WHERE a."calculatedStatus" = 'approved'
    GROUP BY DATE_TRUNC('month', "startDate")
    ORDER BY 1
  ),
  role_graph AS (
    SELECT
        COALESCE(r.name, a."creatorRole"::text) AS role_name,
        COUNT(*) AS role_count,
        ((COUNT(*) * 100.0) / SUM(COUNT(*)) OVER ())::decimal(5,2) AS percentage
    FROM "ActivityReports" a
    LEFT JOIN "Roles" r
    ON a."creatorRole"::text = r."fullName"
    WHERE a."calculatedStatus" = 'approved'
    AND a."creatorRole" IS NOT NULL
    GROUP BY COALESCE(r.name, a."creatorRole"::text)
    ORDER BY 1 DESC
  )
  SELECT
    'no_tta_widget' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      '% recipients without tta', "% recipients without tta",
      'recipients without tta', "recipients without tta",
      'total', total
    ))
  FROM no_tta_widget
  UNION
  SELECT
    'with_fei_widget' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      '% recipients with fei', "% recipients with fei",
      'recipients with fei', "recipients with fei",
      'total', total
    ))
  FROM with_fei_widget
  UNION
  SELECT
    'with_fei_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      'rootCause', "response",
      'response_count', "response_count",
      'percentage', "percentage"
    ))
  FROM with_fei_graph
  UNION
  SELECT
    'with_class_widget' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      '% recipients with class', "% recipients with class",
      'recipients with class', "recipients with class",
      'total', total
    ))
  FROM with_class_widget
  UNION
  SELECT
    'delivery_method_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
        'month', month,
        'in_person_count', in_person_count,
        'virtual_count', virtual_count,
        'hybrid_count', hybrid_count,
      'in_person_percentage', in_person_percentage,
        'virtual_percentage', virtual_percentage,
        'hybrid_percentage', hybrid_percentage
    ))
  FROM delivery_method_graph
  UNION
  SELECT
    'role_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
        'role_name', role_name,
        'role_count', role_count,
        'percentage', percentage
    ))
  FROM role_graph;
