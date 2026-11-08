# Changelog

All notable changes to this package are documented in this file.

## [Unreleased]

First version of the TimelinesAI nodes for n8n.

### Added

- **TimelinesAI API credential**: Public API token and base URL, checked against the workspace when saved.
- **TimelinesAI node**, covering the TimelinesAI Public API:
  - WhatsApp (QR-linked numbers): Chat, Chat Label, Chat Note, Message (send to chat, phone or JID, and voice notes), Message Reaction, File, WhatsApp Account and Workspace.
  - WhatsApp Business Platform: WABA Chat, WABA Chat Label, WABA Message (text, file or template), WABA Message Reaction, WABA Account (including analytics) and WABA Template.
  - Pick-from-list fields for chats, accounts and templates. Chats can also be picked by pasting their URL.
  - Simplified output for chats and messages, and usable as a tool by AI Agents.
  - "Return All" pagination that keeps filters and retries when rate limited.
  - Error messages that say how to fix the problem, and include TimelinesAI's message and error code.
  - Invite Teammate refuses an email that already belongs to a teammate, unless "Update Existing Teammate" is turned on.
- **TimelinesAI Trigger node**: subscribes to the selected events on activation and removes the subscriptions on deactivation. It has optional filters by WhatsApp account phone and by WABA account.
- Example workflows in `examples/`.
