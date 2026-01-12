# GitHub Copilot Code Review Instructions

Guidelines for GitHub Copilot to perform code reviews.

## Code Review Philosophy
- Start with a brief summary of the modifications and context
- Focus on actionable and specific feedback, not pedantic stylistic issues
- Be concise: prefer one sentence when sufficient, add detail for non-obvious impacts
- Unless instructed otherwise, focus on correctness, security, operability and performance

## Code Review Focus Areas

### Correctness
- Typos
- Logic errors
- Race conditions
- Resource leaks
- Off-by-one errors
- Missing error handling
- Boundary conditions

### Security
- Check for hardcoded secrets, API keys, or credentials
- Look for SQL or data injection issues and XSS vulnerabilities
- Verify proper input validation and sanitization
- Review authentication and authorization logic
- Data privacy or PII leakage risks

### Performance
- Spot inefficient loops and algorithmic issues
- Check for memory leaks and resource cleanup
- Highlight significant performance improvement opportunities
