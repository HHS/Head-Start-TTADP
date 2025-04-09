#!/bin/bash

set -e

cf connect-to-service ${1} ${2} << EOF
SELECT LEFT(r.name,35) recipient, "regionId" region, \
    COUNT(*) cnt FROM "Goals" g \
    JOIN "Grants" gr ON g."grantId" = gr.id \
    JOIN "Recipients" r ON gr."recipientId" = r.id \
    WHERE "createdVia" = 'monitoring' \
    AND g."createdAt" > (NOW() - INTERVAL '72 hours') \
    GROUP BY 1,2 \
    ORDER BY 2,1;
EOF

