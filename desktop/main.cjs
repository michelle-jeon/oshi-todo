/* eslint-disable @typescript-eslint/no-require-imports */

const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, shell } = require("electron");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const http = require("node:http");
const path = require("node:path");

const execFileAsync = promisify(execFile);

const DESKTOP_PORT = Number(process.env.OSHITODO_DESKTOP_PORT || 32145);
const DESKTOP_HOST = "127.0.0.1";
const DESKTOP_URL = process.env.OSHITODO_DESKTOP_URL || `http://${DESKTOP_HOST}:${DESKTOP_PORT}`;
const GOOGLE_AUTH_HOSTS = new Set([
  "accounts.google.com",
  "accounts.google.co.kr",
  "oauth2.googleapis.com"
]);

let mainWindow = null;
let bundledServer = null;

function toWindowInfo({ id, title, ownerName, ownerProcessId }) {
  return {
    id: String(id || `${ownerProcessId || "unknown"}:${title || ownerName || "window"}`),
    title: title || "",
    ownerName: ownerName || "",
    ownerBundleId: null,
    ownerProcessId: ownerProcessId ? Number(ownerProcessId) : null
  };
}

async function getMacActiveWindow() {
  const script = [
    'tell application "System Events"',
    "set activeProcess to first application process whose frontmost is true",
    "set processName to name of activeProcess",
    "set processId to unix id of activeProcess",
    'set windowTitle to ""',
    "try",
    "set windowTitle to name of front window of activeProcess",
    "end try",
    'return (processId as text) & tab & processName & tab & windowTitle',
    "end tell"
  ];
  const { stdout } = await execFileAsync("osascript", script.flatMap((line) => ["-e", line]));
  const [ownerProcessId, ownerName, title] = stdout.trim().split("\t");

  return toWindowInfo({ ownerProcessId, ownerName, title });
}

async function getWindowsActiveWindow() {
  const script = [
    "Add-Type @'",
    "using System;",
    "using System.Runtime.InteropServices;",
    "using System.Text;",
    "public class ActiveWindow {",
    "  [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();",
    "  [DllImport(\"user32.dll\")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);",
    "  [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);",
    "}",
    "'@",
    "$handle = [ActiveWindow]::GetForegroundWindow()",
    "$title = New-Object Text.StringBuilder 1024",
    "[void][ActiveWindow]::GetWindowText($handle, $title, $title.Capacity)",
    "$processId = 0",
    "[void][ActiveWindow]::GetWindowThreadProcessId($handle, [ref]$processId)",
    "$process = Get-Process -Id $processId -ErrorAction SilentlyContinue",
    "[PSCustomObject]@{ id = $handle.ToInt64(); title = $title.ToString(); ownerName = $process.ProcessName; ownerProcessId = $processId } | ConvertTo-Json -Compress"
  ].join("\n");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script
  ]);

  return toWindowInfo(JSON.parse(stdout.trim()));
}

async function getLinuxActiveWindow() {
  const { stdout: idOutput } = await execFileAsync("xdotool", ["getactivewindow"]);
  const id = idOutput.trim();
  const [{ stdout: titleOutput }, { stdout: pidOutput }] = await Promise.all([
    execFileAsync("xdotool", ["getwindowname", id]),
    execFileAsync("xdotool", ["getwindowpid", id])
  ]);
  const ownerProcessId = pidOutput.trim();
  let ownerName = "";

  try {
    const { stdout } = await execFileAsync("ps", ["-p", ownerProcessId, "-o", "comm="]);
    ownerName = stdout.trim();
  } catch {
    ownerName = "";
  }

  return toWindowInfo({
    id,
    title: titleOutput.trim(),
    ownerName,
    ownerProcessId
  });
}

async function getActiveWindow() {
  if (process.platform === "darwin") {
    return getMacActiveWindow();
  }

  if (process.platform === "win32") {
    return getWindowsActiveWindow();
  }

  if (process.platform === "linux") {
    return getLinuxActiveWindow();
  }

  return null;
}

function registerDesktopIpc() {
  ipcMain.handle("desktop:get-active-window", async () => {
    try {
      return await getActiveWindow();
    } catch (error) {
      console.error("활성 작업창을 확인하지 못했습니다.", error);
      return null;
    }
  });

  ipcMain.handle("desktop:get-open-windows", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 0, height: 0 },
      fetchWindowIcons: false
    });

    return sources
      .filter((source) => source.name.trim().length > 0 && source.name.trim() !== app.name)
      .map((source) => ({
        id: source.id,
        title: source.name,
        ownerName: "",
        ownerBundleId: null,
        ownerProcessId: null
      }));
  });

  ipcMain.handle("desktop:get-app-info", () => ({
    version: app.getVersion(),
    platform: process.platform
  }));
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (remaining <= 0) {
          reject(new Error(`OshiTodo 서버를 시작하지 못했습니다: ${url}`));
          return;
        }

        setTimeout(() => check(remaining - 1), 250);
      });
      request.setTimeout(1000, () => request.destroy());
    };

    check(attempts);
  });
}

async function startBundledServer() {
  if (process.env.OSHITODO_DESKTOP_URL) {
    return DESKTOP_URL;
  }

  const serverRoot = app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(app.getAppPath(), ".desktop", "standalone");
  const serverEntry = path.join(serverRoot, "server.js");

  bundledServer = spawn(process.execPath, [serverEntry], {
    cwd: serverRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: DESKTOP_HOST,
      NODE_PATH: path.join(serverRoot, "server_modules"),
      PORT: String(DESKTOP_PORT)
    },
    stdio: app.isPackaged ? "ignore" : "inherit"
  });

  bundledServer.once("exit", (code) => {
    if (code && !app.isQuitting) {
      console.error(`OshiTodo standalone 서버가 종료되었습니다. 종료 코드: ${code}`);
    }
  });

  await waitForServer(DESKTOP_URL);
  return DESKTOP_URL;
}

function isAllowedAppNavigation(targetUrl, appUrl) {
  try {
    const target = new URL(targetUrl);
    const appOrigin = new URL(appUrl).origin;

    return target.origin === appOrigin || GOOGLE_AUTH_HOSTS.has(target.hostname);
  } catch {
    return false;
  }
}

async function createMainWindow() {
  const appUrl = await startBundledServer();
  const preloadPath = path.join(__dirname, "preload.cjs");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: "#f7f4ed",
    title: "OshiTodo",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAppNavigation(url, appUrl)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          parent: mainWindow,
          width: 520,
          height: 720,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        }
      };
    }

    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedAppNavigation(url, appUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(appUrl);
}

function stopBundledServer() {
  if (bundledServer && !bundledServer.killed) {
    bundledServer.kill();
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(async () => {
      registerDesktopIpc();
      await createMainWindow();

      app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          await createMainWindow();
        }
      });
    })
    .catch((error) => {
      console.error(error);
      dialog.showErrorBox(
        "OshiTodo를 시작하지 못했습니다",
        "내장 서버를 시작하지 못했습니다. 앱을 종료한 뒤 다시 실행해 주세요."
      );
      app.quit();
    });
}

app.on("before-quit", () => {
  app.isQuitting = true;
  stopBundledServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
