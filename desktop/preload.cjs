/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("oshiTodoDesktop", {
  isDesktop: true,
  getActiveWindow: () => ipcRenderer.invoke("desktop:get-active-window"),
  getOpenWindows: () => ipcRenderer.invoke("desktop:get-open-windows"),
  getAppInfo: () => ipcRenderer.invoke("desktop:get-app-info")
});
