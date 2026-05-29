# Examples

The examples intentionally include safe and malicious fixtures.

```bash
node dist/cli.js discover examples
node dist/cli.js lint examples
node dist/cli.js unicode-scan examples
node dist/cli.js attack examples --fail-on high
node dist/cli.js report examples
```

Fixtures:

- `mcp/safe-tools.json`: public read-only documentation search.
- `mcp/poisoned-tools.json`: prompt injection and source-to-webhook exfiltration.
- `mcp/hidden-unicode-tools.json`: bidirectional Unicode payload.
- `mcp/mcp-config.json`: broad GitHub token and local shell server examples.
- `skills/safe-reviewer`: local-only reviewer skill.
- `skills/poisoned-publisher`: malicious skill with secret exfiltration language.
