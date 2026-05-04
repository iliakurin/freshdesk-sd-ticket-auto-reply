# Freshdesk Ticket Auto Reply

A small Electron desktop app for quickly sending first replies to Freshdesk tickets. It is designed for support teams that want a simple local tool for improving response speed and first-response KPI performance.
## Find full version is here 
[Code + .exe](https://kurinova.gumroad.com/l/yajpt)
## Features

- Freshdesk domain and API key settings
- Optional agent/user name field
- Editable reply message template
- Ticket ID input and reply preview
- Freshdesk reply request using Basic Auth
- Local settings storage on the user's computer
- 7-day local free trial
- Local license activation using SHA-256 license hashes

## Freshdesk Request

When a user sends a reply, the app posts to:

```text
https://[freshdesk-domain]/api/v2/tickets/[ticket-id]/reply
```

The JSON body is:

```json
{
  "body": "message text"
}
```

## Install

```bash
npm install
```

## Run

```bash
npm start


## Security Notes

- Do not commit Freshdesk API keys.
- Do not commit plain license keys.
- Do not commit `license-hashes.js` to the public repository if you want to keep the license list private.
- Settings are stored locally in Electron app data.
