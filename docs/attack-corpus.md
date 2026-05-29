# Attack Corpus

The v0.1 attack harness is deterministic and local-only. It does not execute external tools or exfiltrate data.

| ID | Scenario | Severity | Purpose |
| --- | --- | --- | --- |
| `MCP-TP-001` | Tool poisoning instruction override | Critical | Detects tool text that tells agents to ignore higher-priority instructions. |
| `MCP-EXFIL-001` | Private source to external sink | Critical | Detects stacks that combine private/local data sources with network posting. |
| `MCP-UNI-001` | Invisible Unicode payload | Critical | Detects hidden Unicode controls in tool or skill text. |
| `MCP-RCE-001` | Ungated shell execution | High | Detects shell-capable tools without approval boundaries. |
| `MCP-SSRF-001` | Open URL fetch without allowlist | High | Detects open-world network tools with arbitrary URL surfaces. |

Future versions should add scenario IDs mapped to public MCP CVEs, OWASP Agentic guidance, and blue-team function-calling research.
