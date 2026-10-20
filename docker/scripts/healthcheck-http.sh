#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: healthcheck-http.sh <url>" >&2
  exit 1
fi

url="$1"

# Keep this script single-attempt; Docker healthcheck handles retries.
node -e "
  const http = require('http');
  const target = process.argv[1];
  const req = http.get(target, (res) => process.exit(res.statusCode === 200 ? 0 : 1));
  req.on('error', () => process.exit(1));
  req.setTimeout(3000, () => { req.destroy(); process.exit(1); });
" "$url"
