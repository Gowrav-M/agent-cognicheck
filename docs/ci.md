# CI Usage

Use Cognicheck as a pre-merge gate for agent tool stacks.

```yaml
name: cognicheck
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx agent-cognicheck attack ./agent-tools --fail-on high
```

Recommended gates:

- `unicode-scan --fail-on high` for any repo accepting third-party tool descriptors or skills.
- `lint --fail-on critical` for early adoption.
- `attack --fail-on high` for production-bound agent stacks.
- `report` as a non-blocking artifact generator for security review.
