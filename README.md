# n8n-nodes-timelinesai

This is an n8n community node package for **[TimelinesAI](https://timelines.ai)**, a shared WhatsApp inbox for teams.

Use it to automate the TimelinesAI service from n8n:

- **WhatsApp numbers linked by QR code:** chats, messages, files, voice notes, labels, notes and reactions.
- **The shared inbox:** assign chats, close and reopen them, mark them read, label them and add internal notes.
- **Many numbers under one credential:** a single workspace token covers every number in the workspace.
- **WhatsApp Business Platform (WABA) through TimelinesAI, with no Meta app of your own:** chats, free-text and template messages, reactions, templates and account analytics.
- **Events:** start workflows on TimelinesAI events such as new messages, chat changes, account status and template approvals.

The package has two nodes:

| Node | What it does |
| --- | --- |
| **TimelinesAI** | Actions over the [TimelinesAI Public API](https://timelines.ai/docs/public-api-reference/overview). It can also be used as a tool by n8n AI Agents. |
| **TimelinesAI Trigger** | Starts a workflow on [TimelinesAI webhook events](https://timelines.ai/docs/webhook-reference/overview). |

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Usage notes](#usage-notes) · [Example workflows](#example-workflows) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

On self-hosted n8n, go to **Settings → Community Nodes → Install** and enter:

```
@timelinesai/n8n-nodes-timelinesai
```

Once the node is verified by n8n, you can also find it by searching for "TimelinesAI" in the nodes panel.

For details, see n8n's [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

The nodes use a **TimelinesAI API** credential with a workspace Public API token.

1. Sign in to [app.timelines.ai](https://app.timelines.ai).
2. Go to **Integrations → Public API** and copy the token.
3. In n8n, create a **TimelinesAI API** credential and paste the token into **API Token**.
4. Keep the default **Base URL**, `https://app.timelines.ai/integrations/api`.

When you save the credential, n8n checks the token with your TimelinesAI workspace.

> **Regenerating the token breaks every credential that uses it.** The token belongs to the workspace. If anyone regenerates it in TimelinesAI, every n8n credential holding the old token fails with "TimelinesAI rejected the API token". Paste the new token to fix it.

The node supports API tokens only, not OAuth. TimelinesAI's OAuth needs fixed redirect URLs, and each self-hosted n8n instance has its own.

## Operations

### WhatsApp (QR-linked numbers)

| Resource | Operations |
| --- | --- |
| **Chat** | Get, Get Many (filters: labels, accounts, contact phone, responsible, read, closed, group, created date; Return All), Update (name, responsible, closed, read, AI Agent on/off) |
| **Chat Label** | Get Many, Add (keeps existing labels), Replace (an empty list removes all labels) |
| **Chat Note** | Create (private or team-visible internal note) |
| **Message** | Send to Chat (with optional reply-to), Send to Phone, Send to JID (contact or group), Send Voice Message (OGG/OGA from binary data or URL), Get, Get Many (direction, date range, sort order; Return All), Get Status History |
| **Message Reaction** | Get, Set (set or clear your emoji) |
| **File** | Upload (from binary data or a public URL), Get (includes a download URL valid for 15 minutes), Get Many, Delete |
| **WhatsApp Account** | Get Many, Start Phone Pairing, Get Pairing Status |
| **Workspace** | Get (plan, seats, quotas), Get Teammates, Invite Teammate, Revoke Invitation |

### WhatsApp Business Platform (WABA)

| Resource | Operations |
| --- | --- |
| **WABA Chat** | Get, Get Many (filters: WABA account, contact phone, responsible, closed; Return All), Update (name, responsible, closed, read) |
| **WABA Chat Label** | Get Many, Add, Replace |
| **WABA Message** | Send in Chat, Send to Phone, Get, Get Many, Get Status History. **Message Type** is Text, File (an uploaded file with an optional caption) or Template (an approved template, with header and body variables). |
| **WABA Message Reaction** | Get, Set |
| **WABA Account** | Get, Get Many, Request Analytics, Get Analytics Result |
| **WABA Template** | Get, Get Many |

Fields that point at a chat, a WhatsApp or WABA account, or a template can be filled **From List**, **By ID** or, for chats, **By URL**: paste a TimelinesAI chat link.

## Trigger

**TimelinesAI Trigger** subscribes to the events you choose when the workflow is activated, and removes those subscriptions when it is deactivated. You don't copy webhook URLs into TimelinesAI yourself.

- **Events:** messages (new, incoming, outgoing, reaction, delivered, read, edited, deleted), chats (new, incoming, outgoing, assigned, unassigned, renamed), calls, WhatsApp account status, and the matching WABA message, chat, account and template events.
- **Filters:** only start the workflow for one WhatsApp account phone, or one WABA account ID. Events that don't match are acknowledged and ignored.
- **The output** is the TimelinesAI event payload, as is.

Things to know:

- **Each selected event uses one webhook of the workspace.** Workspaces have 10 by default; contact TimelinesAI support to raise the limit. If a subscription fails during activation, the trigger removes the ones it just created.
- **Webhook requests are not signed.** TimelinesAI does not support authentication or custom headers on webhook requests. Anyone who knows the workflow's webhook URL can send it fake events, so keep the URL private.
- **Subscriptions of other integrations are never touched.** The trigger only deletes subscriptions that point at its own URL.

## Usage notes

### Sending rate and quotas

- The API allows about 30 requests per second.
- WhatsApp sending should be spaced out by about 2 seconds per message. For bulk sends, use **Loop Over Items** with a **Wait** node between items.
- Text messages use 1 messaging quota credit and attachments use 2. When the quota is used up, the node says so.
- "Return All" fetches page after page. If TimelinesAI rate limits a page, the node waits and retries, up to 4 times, instead of failing the whole run.

### WABA service window

Free text and files can only be sent within **24 hours** of the contact's last message. Outside that window, send an **approved template** (Message Type: Template). If you send free text outside the window, the node fails with "The 24-hour WhatsApp service window is closed".

For group messages and on some WABA accounts, the delivery status can stay at "Sent" even after the message arrives. Don't build workflows that wait for "Delivered" on groups.

### Inviting teammates

The TimelinesAI API does not refuse an invitation for an email that already belongs to a teammate. Instead, it **changes that teammate's role and team**. So by default, **Invite Teammate** checks the teammate list first and fails for an existing email. Turn on **Update Existing Teammate** only when you want to change an existing teammate.

**Revoke Invitation deletes the invited user.** Use it only on invitations that the workflow created.

### Errors

Errors say what went wrong and how to fix it, and include TimelinesAI's own message and error code. For example:

- *TimelinesAI rejected the API token:* paste the current token into the credential.
- *The 24-hour WhatsApp service window is closed:* send an approved template instead.
- *TimelinesAI rejected the request. Fields: name: Chat name must be unique.*

Turn on **Continue On Fail** in the node settings to keep a workflow running and handle errors per item.

## Example workflows

Import these from [`examples/`](examples/) (**Workflow menu → Import from File**), then select your credentials:

| File | What it does |
| --- | --- |
| [`ai-agent-auto-reply.json`](examples/ai-agent-auto-reply.json) | An incoming WhatsApp message starts an AI Agent, which looks up the chat with the TimelinesAI tool, then replies in the chat. |
| [`waba-template-from-form.json`](examples/waba-template-from-form.json) | A new lead from an n8n form gets a WABA template message, with their name filled into the template variable. |
| [`waba-chat-closed-to-sheet.json`](examples/waba-chat-closed-to-sheet.json) | Each closed WABA chat is appended to a Google Sheet. |
| [`account-disconnected-alert.json`](examples/account-disconnected-alert.json) | A WhatsApp account disconnecting posts an alert to Slack. |

## Compatibility

- Built for **n8n 2.x** (developed against n8n 2.46).
- Uses n8n's community node API version 1.
- No runtime dependencies.

## Resources

- [TimelinesAI Public API reference](https://timelines.ai/docs/public-api-reference/overview)
- [TimelinesAI webhook reference](https://timelines.ai/docs/webhook-reference/overview)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [TimelinesAI](https://timelines.ai)

## License

[MIT](LICENSE)
