const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("freshdeskApp", {
  getState: () => ipcRenderer.invoke("app:get-state"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  activateLicense: (licenseKey) => ipcRenderer.invoke("license:activate", licenseKey),
  sendReply: (payload) => ipcRenderer.invoke("ticket:send-reply", payload)
});
