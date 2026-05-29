# Comparison

`agent-cognicheck` complements existing tools instead of replacing them.

| Tool Category | What It Does | Remaining Gap |
| --- | --- | --- |
| Agent frameworks | Build and run agents. | Usually do not test tool trust before connection. |
| LLM observability | Trace prompts, tool calls, cost, and quality. | Visibility often starts after the tool is already used. |
| MCP checklists | Explain best practices. | Manual, not CI-enforced. |
| Static scanners | Catch secrets, dependencies, and config smells. | Often miss cognitive semantics and attack scenarios. |
| Governance engines | Enforce runtime policy. | Assume a curated tool set already exists. |
| `agent-cognicheck` | Tests tools and skills before use. | Does not do runtime enforcement or skill packaging. |

Use with:

- `agent-skillguard` for skill passports, locks, and admission.
- `agentops-watchtower` for runtime attack graphs and incident evidence.
