#!/bin/bash

# workaround for missing feature
# https://github.com/yarnpkg/yarn/issues/6669

set -u


cmd="yarn audit --level low --json"
output=$($cmd)
result=$?

if [ $result -eq 0 ]; then
	echo No known vulnerabilities
	exit 0
fi

if [ -f yarn-audit-known-issues ] && echo "$output" | grep auditAdvisory | diff -q yarn-audit-known-issues - > /dev/null 2>&1; then
	echo
	echo Ignoring known vulnerabilities
	exit 0
fi


# we compare the json output to see if they are the same list of package names and version numbers
# if so, exit without error

curr=$(cat yarn-audit-known-issues | jq -s 'map({name: .data.advisory.module_name, version: .data.advisory.findings[0].version})| unique | sort_by(.data.advisory.module_name) | tostring')
new=$(yarn audit --level low --json --groups dependencies | jq -s 'map(select(.type == "auditAdvisory")) | map({name: .data.advisory.module_name, version: .data.advisory.findings[0].version})| unique | sort_by(.data.advisory.module_name) | tostring')

if [ "$curr" = "$new" ]; then
    echo
	echo Ignoring previously known and accepted vulnerabilitie
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
