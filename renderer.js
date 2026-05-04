const statusBanner = document.querySelector("#statusBanner");
const licensePanel = document.querySelector("#licensePanel");
const appPanel = document.querySelector("#appPanel");
const trialText = document.querySelector("#trialText");
const licenseKeyInput = document.querySelector("#licenseKey");
const activateButton = document.querySelector("#activateButton");
const activationStatus = document.querySelector("#activationStatus");

const domainInput = document.querySelector("#freshdeskDomain");
const apiKeyInput = document.querySelector("#apiKey");
const agentNameInput = document.querySelector("#agentName");
const templateInput = document.querySelector("#messageTemplate");
const saveSettingsButton = document.querySelector("#saveSettingsButton");
const settingsStatus = document.querySelector("#settingsStatus");

const ticketIdInput = document.querySelector("#ticketId");
const replyMessageInput = document.querySelector("#replyMessage");
const useTemplateButton = document.querySelector("#useTemplateButton");
const sendReplyButton = document.querySelector("#sendReplyButton");
const replyStatus = document.querySelector("#replyStatus");

let currentState;

init();

async function init() {
  currentState = await window.freshdeskApp.getState();
  applyState(currentState);
  bindEvents();
}

function bindEvents() {
  saveSettingsButton.addEventListener("click", saveSettings);
  useTemplateButton.addEventListener("click", () => {
    replyMessageInput.value = templateInput.value;
    setMessage(replyStatus, "Template copied to the reply editor.", "neutral");
  });
  sendReplyButton.addEventListener("click", sendReply);
  activateButton.addEventListener("click", activateLicense);
  templateInput.addEventListener("input", () => {
    if (!replyMessageInput.value.trim()) {
      replyMessageInput.value = templateInput.value;
    }
  });
}

function applyState(state) {
  const { license, settings } = state;

  domainInput.value = settings.freshdeskDomain || "";
  apiKeyInput.value = settings.apiKey || "";
  agentNameInput.value = settings.agentName || "";
  templateInput.value = settings.messageTemplate || "";
  replyMessageInput.value = settings.messageTemplate || "";

  if (license.activated) {
    statusBanner.textContent = "Full version activated.";
    trialText.textContent = "License active";
  } else if (license.trialActive) {
    const dayLabel = license.remainingDays === 1 ? "day" : "days";
    statusBanner.textContent = `Free trial active: ${license.remainingDays} ${dayLabel} remaining.`;
    trialText.textContent = `${license.remainingDays} ${dayLabel} left`;
  } else {
    statusBanner.textContent = "Free trial expired. Activate a license to continue.";
    trialText.textContent = "Trial expired";
  }

  licensePanel.hidden = license.allowed;
  appPanel.hidden = !license.allowed;
}

async function saveSettings() {
  setBusy(saveSettingsButton, true);
  setMessage(settingsStatus, "Saving settings...", "neutral");

  const settings = {
    freshdeskDomain: domainInput.value,
    apiKey: apiKeyInput.value,
    agentName: agentNameInput.value,
    messageTemplate: templateInput.value
  };

  const result = await window.freshdeskApp.saveSettings(settings);
  setBusy(saveSettingsButton, false);

  if (result.ok) {
    currentState.settings = result.settings;
    replyMessageInput.value = result.settings.messageTemplate;
    setMessage(settingsStatus, "Settings saved locally.", "success");
  } else {
    setMessage(settingsStatus, result.message || "Could not save settings.", "error");
  }
}

async function activateLicense() {
  setBusy(activateButton, true);
  setMessage(activationStatus, "Checking license...", "neutral");

  const result = await window.freshdeskApp.activateLicense(licenseKeyInput.value);
  setBusy(activateButton, false);

  if (!result.ok) {
    setMessage(activationStatus, result.message, "error");
    return;
  }

  currentState.license = result.license;
  setMessage(activationStatus, "License activated. The app is unlocked.", "success");
  applyState(currentState);
}

async function sendReply() {
  setBusy(sendReplyButton, true);
  setMessage(replyStatus, "Sending reply to Freshdesk...", "neutral");

  const result = await window.freshdeskApp.sendReply({
    ticketId: ticketIdInput.value,
    body: replyMessageInput.value
  });

  setBusy(sendReplyButton, false);

  if (result.ok) {
    setMessage(replyStatus, result.message, "success");
    return;
  }

  const details = result.details ? ` ${result.details}` : "";
  setMessage(replyStatus, `${result.message}${details}`, "error");
}

function setBusy(button, isBusy) {
  button.disabled = isBusy;
  button.dataset.busy = isBusy ? "true" : "false";
}

function setMessage(element, message, tone) {
  element.textContent = message;
  element.dataset.tone = tone;
}
