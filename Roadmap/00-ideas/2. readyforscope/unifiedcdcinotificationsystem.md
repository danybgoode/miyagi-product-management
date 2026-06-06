Epic: Unified CI/CD and Git Event Notification System via Telegram
📋 Epic Overview
As a technical founder,
I want to centralize real-time repository updates and deployment pipeline statuses into my existing Telegram notification setup,
So that I can maintain absolute visibility over ecosystem health, shorten cycle feedback loops, and monitor code movement across both backend and frontend applications without checking separate dashboards.
🎯 Strategic Orientation & High-Level Guidance
The goal of this initiative is to eliminate blind spots across our fragmented delivery pipeline (GitHub, Vercel, and GCP Cloud Run). Instead of introducing an entirely new monitoring platform, we are scaling horizontally by reusing our established Telegram bot scaffolding.
When implementing this, the engineering agent should prioritize actionable minimalism. The messages must be designed for quick reading on mobile or desktop terminals. They should avoid wall-of-text noise while retaining enough contextual depth to allow for quick troubleshooting.
🧠 Product Best Practices
• Context Over Raw Data: A notification should immediately answer three questions: What happened? Where did it happen? Did it succeed or fail?
• Idempotency & Quiet Failures: Notification failures should never crash the underlying build or deploy pipelines. If Telegram is down, the deployment must still complete.
• Visual Hierarchy: Use consistent emoji indicators (e.g., 📦 for code, 🚀 for cloud infrastructure, ✅ for success, ❌ for failure) to establish an immediate mental map for the reader.
• Escape Hatches (Links): Every status message should ideally act as a gateway to deeper context, providing quick pathways back to the source when things break.
🛠️ Acceptance Criteria
1. Trigger Sources & Event Matrix
• AC 1.1: A notification must be dispatched to the existing Telegram channel immediately upon any successful git push event to the main branch of either repo: • danybgoode/medusa-bonsai-backend • danybgoode/miyagisanchezcommerce
• AC 1.2: A notification must be dispatched automatically when a Vercel deployment run finishes for the frontend repository.
• AC 1.3: A notification must be dispatched automatically when a Cloud Run build/deployment run finishes for the backend repository.
2. Core Payload & Data Requirements
• AC 2.1: Every notification message must explicitly contain the following minimum metadata fields: • Repository Name: Clear identification of the origin source. • Commit Identifier: The shortened Commit SHA. • Commit Description: The primary commit message/header. • Execution Status: Clear success or failure verification.
3. Agent Extensibility & Enrichment Framework
• AC 3.1: The implementation must leave room for the agent to safely enrich payloads with highly contextual metadata. Permitted enrichments include, but are not limited to: • Direct Markdown links to the specific GitHub commit diff, Vercel deployment URL, or GCP build log window. • The git actor/author profile handle. • The branch target (if expanding beyond main in the future). • Build duration timestamps.
• AC 3.2: Message formatting must handle markdown-safe escaping to ensure that special characters in commit descriptions (e.g., _, *, [, ], `) do not break the Telegram Message API layout.
🔒 Security & Operations
• Zero Hardcoding: All Telegram tokens, chat IDs, and access secrets must be derived securely from respective environment management providers (GitHub Secrets, Vercel Env Vars, and GCP Secret Manager).
• No Technical Over-Indexing: The implementing agent is expected to perform its own system auditing to select the exact execution mechanism (hooks, actions, or middleware), keeping code footprints inside the primary business apps as lean as possible.