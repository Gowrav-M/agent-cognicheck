# Launch Notes

Use this when posting `agent-cognicheck` to X, LinkedIn, dev.to, or Hacker News.

## Title

```text
Show HN: agent-cognicheck - Security and cognitive-risk scanner for MCP tools and agent skills
```

## Short Post

```text
Agents now ship with dozens of MCP servers, tools, and skills, but most teams still plug them in and hope governance catches problems later.

I built agent-cognicheck: a local-first TypeScript CLI that discovers, scans, and stress-tests agent tools before they enter production.

It builds a ToolBOM, scans for prompt injection and hidden Unicode, runs a deterministic attack harness, and writes CI-ready evidence.

Quickstart:
npx agent-cognicheck demo
npx agent-cognicheck attack ./examples --fail-on high

Repo: https://github.com/Gowrav-M/agent-cognicheck
```

## Profile Narrative

```text
I build local-first tools for AgentOps and AgentSec: securing MCP tools, agent skills, and coding agents without SaaS lock-in.

- agent-cognicheck: security and cognitive-risk scanner for MCP tools and skills.
- agent-skillguard: policy-as-code admission controller and SkillBOM manager.
- agentops-watchtower: AgentOps flight recorder and capability firewall with OpenTelemetry.
```
