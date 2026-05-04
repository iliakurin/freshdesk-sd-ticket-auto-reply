const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { LICENSE_HASHES } = loadLicenseHashes();

const TRIAL_DAYS = 7;
const DEFAULT_TEMPLATE = [
  "Thank you for contacting us. We have received your request and are already working on it.",
  "",
  "Best regards,",
  "Support Team"
].join("\n");

let mainWindow;

function loadLicenseHashes() {
  try {
    return require("./license-hashes");
  } catch {
    return { LICENSE_HASHES: [] };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 860,
    minHeight: 680,
    backgroundColor: "#f7f8fb",
    title: "Freshdesk Ticket Auto Reply",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(async () => {
  await ensureStore();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function getConfigPath() {
  return path.join(app.getPath("userData"), "config.json");
}

async function ensureStore() {
  const config = await readConfig();
  let changed = false;

  if (!config.firstLaunchDate) {
    config.firstLaunchDate = new Date().toISOString();
    changed = true;
  }

  if (!config.settings) {
    config.settings = {};
    changed = true;
  }

  if (!config.settings.messageTemplate) {
    config.settings.messageTemplate = DEFAULT_TEMPLATE;
    changed = true;
  }

  if (changed) {
    await writeConfig(config);
  }
}

async function readConfig() {
  try {
    const raw = await fs.readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeConfig(config) {
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fs.writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function registerIpcHandlers() {
  ipcMain.handle("app:get-state", async () => {
    const config = await readConfig();
    return {
      license: getLicenseState(config),
      settings: {
        freshdeskDomain: config.settings?.freshdeskDomain || "",
        apiKey: config.settings?.apiKey || "",
        agentName: config.settings?.agentName || "",
        messageTemplate: config.settings?.messageTemplate || DEFAULT_TEMPLATE
      }
    };
  });

  ipcMain.handle("settings:save", async (_event, settings) => {
    const config = await readConfig();
    config.settings = normalizeSettings(settings);
    await writeConfig(config);
    return { ok: true, settings: config.settings };
  });

  ipcMain.handle("license:activate", async (_event, licenseKey) => {
    const normalizedKey = normalizeLicenseKey(licenseKey);
    const hash = sha256(normalizedKey);

    if (!LICENSE_HASHES.includes(hash)) {
      return { ok: false, message: "License key is not valid. Please check it and try again." };
    }

    const config = await readConfig();
    config.license = {
      activated: true,
      activatedAt: new Date().toISOString(),
      licenseHash: hash
    };
    await writeConfig(config);

    return { ok: true, license: getLicenseState(config) };
  });

  ipcMain.handle("ticket:send-reply", async (_event, request) => {
    const config = await readConfig();
    const license = getLicenseState(config);

    if (!license.allowed) {
      return {
        ok: false,
        message: "Your trial has expired. Please activate a license to send replies."
      };
    }

    const settings = normalizeSettings(config.settings || {});
    const ticketId = String(request?.ticketId || "").trim();
    const body = String(request?.body || "").trim();

    if (!settings.freshdeskDomain || !settings.apiKey) {
      return { ok: false, message: "Please save your Freshdesk domain and API key first." };
    }

    if (!/^\d+$/.test(ticketId)) {
      return { ok: false, message: "Ticket ID must contain digits only." };
    }

    if (!body) {
      return { ok: false, message: "Reply message cannot be empty." };
    }

    try {
      const response = await sendFreshdeskReply({
        domain: settings.freshdeskDomain,
        apiKey: settings.apiKey,
        ticketId,
        body
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `Freshdesk returned ${response.status}.`,
          details: extractErrorMessage(response.data, response.rawText)
        };
      }

      return {
        ok: true,
        message: `Reply sent successfully to Freshdesk ticket #${ticketId}.`,
        details: response.data
      };
    } catch (error) {
      return {
        ok: false,
        message: "Could not send the reply.",
        details: error.message
      };
    }
  });
}

function normalizeSettings(settings) {
  return {
    freshdeskDomain: normalizeDomain(settings?.freshdeskDomain),
    apiKey: String(settings?.apiKey || "").trim(),
    agentName: String(settings?.agentName || "").trim(),
    messageTemplate: String(settings?.messageTemplate || DEFAULT_TEMPLATE).trim() || DEFAULT_TEMPLATE
  };
}

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

function getLicenseState(config) {
  const firstLaunchDate = config.firstLaunchDate || new Date().toISOString();
  const firstLaunchTime = new Date(firstLaunchDate).getTime();
  const trialEndsAt = firstLaunchTime + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const remainingMs = Math.max(0, trialEndsAt - now);
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const activated = Boolean(config.license?.activated && LICENSE_HASHES.includes(config.license.licenseHash));
  const trialActive = now < trialEndsAt;

  return {
    allowed: activated || trialActive,
    activated,
    trialActive,
    trialDays: TRIAL_DAYS,
    remainingDays,
    firstLaunchDate,
    trialEndsAt: new Date(trialEndsAt).toISOString()
  };
}

function normalizeLicenseKey(value) {
  return String(value || "").trim().toUpperCase();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function sendFreshdeskReply({ domain, apiKey, ticketId, body }) {
  const authToken = Buffer.from(`${apiKey}:X`, "utf8").toString("base64");
  const url = `https://${domain}/api/v2/tickets/${encodeURIComponent(ticketId)}/reply`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  const rawText = await response.text();
  const data = tryParseJson(rawText);

  return {
    ok: response.ok,
    status: response.status,
    rawText,
    data
  };
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractErrorMessage(data, rawText) {
  if (data && typeof data === "object") {
    if (typeof data.message === "string") {
      return data.message;
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((error) => error.message || JSON.stringify(error)).join("; ");
    }

    return JSON.stringify(data);
  }

  return rawText || "Unknown Freshdesk error.";
}
