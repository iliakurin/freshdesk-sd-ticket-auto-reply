# Freshdesk Ticket Auto Reply

A small Electron desktop app for quickly sending first replies to Freshdesk tickets. It is designed for support teams that want a simple local tool for improving response speed and first-response KPI performance.

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
```

## Build

```bash
npm run build
```

## License Files

The public repository intentionally does not include private license files:

- `license-hashes.js`
- `generated-license-keys.txt`

For a private commercial build, create `license-hashes.js` locally with this shape:

```js
const LICENSE_HASHES = [
  "sha256-hash-goes-here"
];

module.exports = { LICENSE_HASHES };
```

Keep plain license keys outside the public repository.

## Security Notes

- Do not commit Freshdesk API keys.
- Do not commit plain license keys.
- Do not commit `license-hashes.js` to the public repository if you want to keep the license list private.
- Settings are stored locally in Electron app data.
