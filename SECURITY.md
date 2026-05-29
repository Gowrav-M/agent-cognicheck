# Security Policy

`agent-cognicheck` is a local security scanner and attack-test harness. It does not intentionally send scanned tool, skill, config, or report data to any external service.

## Reporting Vulnerabilities

Please open a GitHub security advisory or private issue if you find a vulnerability in the scanner itself.

Useful reports include:

- A minimal repro config, descriptor, or skill.
- Expected vs actual behavior.
- Whether the issue causes missed detection, false blocking, data exposure, or command execution.

## Scope

In scope:

- Scanner logic vulnerabilities.
- Unsafe report rendering.
- Path traversal or artifact-writing issues.
- Missed detections for documented attack fixtures.

Out of scope:

- Vulnerabilities in third-party MCP servers, skills, or agent frameworks unless they are needed to demonstrate a scanner issue.
