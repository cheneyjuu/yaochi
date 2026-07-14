# Agent Instructions

## Agent Operating Rules

- Confirm business facts before implementation: inspect existing data models, permissions, state machines, external API constraints, and project docs before deriving a solution from a local API or isolated code path.
- Separate technical feasibility from business correctness: a runnable API, page, or passing test is not enough; verify the solution fits the real workflow, roles, compliance boundaries, and system responsibilities.
- Minimize new inputs, state, files, and transitional code. Do not add user inputs, persisted fields, temporary files, hardcoded fallbacks, mocks, or intermediate implementations unless explicitly accepted or existing trusted sources cannot support the requirement.
- Verify or ask when uncertain. For external platforms, legal or compliance topics, real-world business flows, sensitive data, payment, SMS, authentication, government-like workflows, voting, or auditability, do not rely on memory or assumptions.
- Stop on contradictions. If API requirements, business docs, existing data, or user statements conflict, surface the conflict and ask or verify before coding.
- Do not present a workaround as the target solution. Mocks, placeholders, manual bypasses, and frontend-only fallbacks are acceptable only when explicitly requested.
- Put sensitive and high-risk truth on the backend. Identity, permissions, authentication, funds, votes, audit, legal-effect workflows, and personal information should default to trusted backend data and server-side validation; frontend handles presentation and interaction.
- Generalize repeated mistakes. When an error repeats or exposes a pattern, document the higher-level cause and the pre-implementation checks needed to avoid recurrence.
