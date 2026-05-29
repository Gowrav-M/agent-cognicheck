# Architecture

`agent-cognicheck` is built as a local-first CLI with deterministic analysis engines.

## Pipeline

```mermaid
flowchart LR
  A["MCP descriptors"] --> D["Discover"]
  B["MCP configs"] --> D
  C["SKILL.md files"] --> D
  D --> E["ToolBOM"]
  E --> F["Cognitive lint"]
  E --> G["Unicode scan"]
  E --> H["Attack harness"]
  F --> I["Policy gate"]
  G --> I
  H --> I
  I --> J["Reports"]
```

## Core Modules

- `schemas.ts`: Zod schemas and TypeScript types for all evidence artifacts.
- `discover.ts`: MCP/tool/skill inventory and capability inference.
- `lint.ts`: static cognitive-risk rules.
- `unicode.ts`: hidden Unicode and bidirectional control detection.
- `attack.ts`: deterministic attack scenario evaluation.
- `policy.ts`: local policy gate.
- `report.ts`: JSON, Markdown, and HTML artifact generation.

## Non-Goals for v0.1

- No SaaS dashboard.
- No paid API dependency.
- No live exploitation of real services.
- No runtime proxy. Runtime enforcement belongs in `agentops-watchtower`.
