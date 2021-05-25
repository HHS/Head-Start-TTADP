#!/bin/bash

# workaround for missing feature
# https://github.com/yarnpkg/yarn/issues/6669

set -u


cmd="yarn audit --level low --json"
output=$($cmd)
result=$?

if [ $result -eq 0 ]; then
	# everything is fine
	exit 0
fi

if [ -f yarn-audit-known-issues ] && echo "$output" | grep auditAdvisory | diff -q yarn-audit-known-issues - > /dev/null 2>&1; then
	echo
	echo Ignorning known vulnerabilities
	exit 0
fi

echo
echo Security vulnerabilities were found that were not ignored:
echo "$output" | jq -s 'map(select(.type == "auditAdvisory")) | map({name: .data.advisory.module_name, version: .data.advisory.findings[0].version})| unique'
echo
if [ -f yarn-audit-known-issues ]; then
	echo Previously ignored:
	cat yarn-audit-known-issues | jq -s 'map({name: .data.advisory.module_name, version: .data.advisory.findings[0].version})| unique'
	echo
fi
echo Check to see if these vulnerabilities apply to production
echo and/or if they have fixes available. If they do not have
echo fixes and they do not apply to production, you may ignore them
echo
echo To ignore these vulnerabilities, run:
echo
echo "$cmd | grep auditAdvisory > yarn-audit-known-issues"
echo
echo and commit the yarn-audit-known-issues file

exit "$result"
