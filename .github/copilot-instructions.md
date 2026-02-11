---
description: Guidelines for GitHub Copilot when evaluating code changes.
---
# General Guidance
- Refer to [AGENTS.md](../AGENTS.md) for comprehensive project context.

# Code Review Instructions:

- Start with a brief summary of the changes and their purpose, along with relevant context
- Provide an assessment on the impact of the changes, rating benefits and risks as low, medium, or high 
- Limit additional comments and suggestions to high-confidence issues in focus areas
- Unless instructed otherwise, focus on correctness, security, and performance
- Do not raise stylistic issues or minor nits
- Highlight problems in order of severity, and include a (high, medium, low) severity rating for each issue
- Be concise, add detail only when necessary for more complex issues
- Group multiple comments about the same topic together
- When reviewing a PR you have already reviewed or seen before, avoid commenting on the same issues again.  Focus on what has changed since your last review and avoid raising new issues unless they are of the highest severity.
- Cleanup old comments to keep the review focused on current issues.  Resolve comments about issues that have been resolved in the latest changes, even if they were not resolved in the way you recommended.

# Code Review Focus Areas & Examples

## Correctness

- Typos
- Logic errors
- Race conditions
- Resource leaks
- Data corruption risks
- Off-by-one errors
- Missing error handling
- Boundary conditions
- Similar issues

## Security

- Hardcoded secrets, API keys, or credentials
- Critical vulnerabilities like SQL injection, XSS, CSRF
- Proper authentication and authorization checks
- Proper input validation and sanitization
- Data privacy or PII leakage risks

## Performance

- Significant performance bottlenecks
- Highly inefficient loops and algorithmic issues
- Memory leaks and similar resource issues

