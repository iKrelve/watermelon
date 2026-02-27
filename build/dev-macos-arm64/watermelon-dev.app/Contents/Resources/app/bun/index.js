// @bun
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __promiseAll = (args) => Promise.all(args);

// node_modules/electrobun/dist/api/bun/events/event.ts
class ElectrobunEvent {
  name;
  data;
  _response;
  responseWasSet = false;
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }
  get response() {
    return this._response;
  }
  set response(value) {
    this._response = value;
    this.responseWasSet = true;
  }
  clearResponse() {
    this._response = undefined;
    this.responseWasSet = false;
  }
}

// node_modules/electrobun/dist/api/bun/events/windowEvents.ts
var windowEvents_default;
var init_windowEvents = __esm(() => {
  windowEvents_default = {
    close: (data) => new ElectrobunEvent("close", data),
    resize: (data) => new ElectrobunEvent("resize", data),
    move: (data) => new ElectrobunEvent("move", data),
    focus: (data) => new ElectrobunEvent("focus", data)
  };
});

// node_modules/electrobun/dist/api/bun/events/webviewEvents.ts
var webviewEvents_default;
var init_webviewEvents = __esm(() => {
  webviewEvents_default = {
    willNavigate: (data) => new ElectrobunEvent("will-navigate", data),
    didNavigate: (data) => new ElectrobunEvent("did-navigate", data),
    didNavigateInPage: (data) => new ElectrobunEvent("did-navigate-in-page", data),
    didCommitNavigation: (data) => new ElectrobunEvent("did-commit-navigation", data),
    domReady: (data) => new ElectrobunEvent("dom-ready", data),
    newWindowOpen: (data) => new ElectrobunEvent("new-window-open", data),
    hostMessage: (data) => new ElectrobunEvent("host-message", data),
    downloadStarted: (data) => new ElectrobunEvent("download-started", data),
    downloadProgress: (data) => new ElectrobunEvent("download-progress", data),
    downloadCompleted: (data) => new ElectrobunEvent("download-completed", data),
    downloadFailed: (data) => new ElectrobunEvent("download-failed", data)
  };
});

// node_modules/electrobun/dist/api/bun/events/trayEvents.ts
var trayEvents_default;
var init_trayEvents = __esm(() => {
  trayEvents_default = {
    trayClicked: (data) => new ElectrobunEvent("tray-clicked", data)
  };
});

// node_modules/electrobun/dist/api/bun/events/ApplicationEvents.ts
var ApplicationEvents_default;
var init_ApplicationEvents = __esm(() => {
  ApplicationEvents_default = {
    applicationMenuClicked: (data) => new ElectrobunEvent("application-menu-clicked", data),
    contextMenuClicked: (data) => new ElectrobunEvent("context-menu-clicked", data),
    openUrl: (data) => new ElectrobunEvent("open-url", data),
    beforeQuit: (data) => new ElectrobunEvent("before-quit", data)
  };
});

// node_modules/electrobun/dist/api/bun/events/eventEmitter.ts
import EventEmitter from "events";
var ElectrobunEventEmitter, electrobunEventEmitter, eventEmitter_default;
var init_eventEmitter = __esm(() => {
  init_windowEvents();
  init_webviewEvents();
  init_trayEvents();
  init_ApplicationEvents();
  ElectrobunEventEmitter = class ElectrobunEventEmitter extends EventEmitter {
    constructor() {
      super();
    }
    emitEvent(ElectrobunEvent2, specifier) {
      if (specifier) {
        this.emit(`${ElectrobunEvent2.name}-${specifier}`, ElectrobunEvent2);
      } else {
        this.emit(ElectrobunEvent2.name, ElectrobunEvent2);
      }
    }
    events = {
      window: {
        ...windowEvents_default
      },
      webview: {
        ...webviewEvents_default
      },
      tray: {
        ...trayEvents_default
      },
      app: {
        ...ApplicationEvents_default
      }
    };
  };
  electrobunEventEmitter = new ElectrobunEventEmitter;
  eventEmitter_default = electrobunEventEmitter;
});

// node_modules/electrobun/dist/api/shared/rpc.ts
function missingTransportMethodError(methods, action) {
  const methodsString = methods.map((m) => `"${m}"`).join(", ");
  return new Error(`This RPC instance cannot ${action} because the transport did not provide one or more of these methods: ${methodsString}`);
}
function createRPC(options = {}) {
  let debugHooks = {};
  let transport = {};
  let requestHandler = undefined;
  function setTransport(newTransport) {
    if (transport.unregisterHandler)
      transport.unregisterHandler();
    transport = newTransport;
    transport.registerHandler?.(handler);
  }
  function setRequestHandler(h) {
    if (typeof h === "function") {
      requestHandler = h;
      return;
    }
    requestHandler = (method, params) => {
      const handlerFn = h[method];
      if (handlerFn)
        return handlerFn(params);
      const fallbackHandler = h._;
      if (!fallbackHandler)
        throw new Error(`The requested method has no handler: ${String(method)}`);
      return fallbackHandler(method, params);
    };
  }
  const { maxRequestTime = DEFAULT_MAX_REQUEST_TIME } = options;
  if (options.transport)
    setTransport(options.transport);
  if (options.requestHandler)
    setRequestHandler(options.requestHandler);
  if (options._debugHooks)
    debugHooks = options._debugHooks;
  let lastRequestId = 0;
  function getRequestId() {
    if (lastRequestId <= MAX_ID)
      return ++lastRequestId;
    return lastRequestId = 0;
  }
  const requestListeners = new Map;
  const requestTimeouts = new Map;
  function requestFn(method, ...args) {
    const params = args[0];
    return new Promise((resolve, reject) => {
      if (!transport.send)
        throw missingTransportMethodError(["send"], "make requests");
      const requestId = getRequestId();
      const request2 = {
        type: "request",
        id: requestId,
        method,
        params
      };
      requestListeners.set(requestId, { resolve, reject });
      if (maxRequestTime !== Infinity)
        requestTimeouts.set(requestId, setTimeout(() => {
          requestTimeouts.delete(requestId);
          reject(new Error("RPC request timed out."));
        }, maxRequestTime));
      debugHooks.onSend?.(request2);
      transport.send(request2);
    });
  }
  const request = new Proxy(requestFn, {
    get: (target, prop, receiver) => {
      if (prop in target)
        return Reflect.get(target, prop, receiver);
      return (params) => requestFn(prop, params);
    }
  });
  const requestProxy = request;
  function sendFn(message, ...args) {
    const payload = args[0];
    if (!transport.send)
      throw missingTransportMethodError(["send"], "send messages");
    const rpcMessage = {
      type: "message",
      id: message,
      payload
    };
    debugHooks.onSend?.(rpcMessage);
    transport.send(rpcMessage);
  }
  const send = new Proxy(sendFn, {
    get: (target, prop, receiver) => {
      if (prop in target)
        return Reflect.get(target, prop, receiver);
      return (payload) => sendFn(prop, payload);
    }
  });
  const sendProxy = send;
  const messageListeners = new Map;
  const wildcardMessageListeners = new Set;
  function addMessageListener(message, listener) {
    if (!transport.registerHandler)
      throw missingTransportMethodError(["registerHandler"], "register message listeners");
    if (message === "*") {
      wildcardMessageListeners.add(listener);
      return;
    }
    if (!messageListeners.has(message))
      messageListeners.set(message, new Set);
    messageListeners.get(message).add(listener);
  }
  function removeMessageListener(message, listener) {
    if (message === "*") {
      wildcardMessageListeners.delete(listener);
      return;
    }
    messageListeners.get(message)?.delete(listener);
    if (messageListeners.get(message)?.size === 0)
      messageListeners.delete(message);
  }
  async function handler(message) {
    debugHooks.onReceive?.(message);
    if (!("type" in message))
      throw new Error("Message does not contain a type.");
    if (message.type === "request") {
      if (!transport.send || !requestHandler)
        throw missingTransportMethodError(["send", "requestHandler"], "handle requests");
      const { id, method, params } = message;
      let response;
      try {
        response = {
          type: "response",
          id,
          success: true,
          payload: await requestHandler(method, params)
        };
      } catch (error) {
        if (!(error instanceof Error))
          throw error;
        response = {
          type: "response",
          id,
          success: false,
          error: error.message
        };
      }
      debugHooks.onSend?.(response);
      transport.send(response);
      return;
    }
    if (message.type === "response") {
      const timeout = requestTimeouts.get(message.id);
      if (timeout != null)
        clearTimeout(timeout);
      const { resolve, reject } = requestListeners.get(message.id) ?? {};
      if (!message.success)
        reject?.(new Error(message.error));
      else
        resolve?.(message.payload);
      return;
    }
    if (message.type === "message") {
      for (const listener of wildcardMessageListeners)
        listener(message.id, message.payload);
      const listeners = messageListeners.get(message.id);
      if (!listeners)
        return;
      for (const listener of listeners)
        listener(message.payload);
      return;
    }
    throw new Error(`Unexpected RPC message type: ${message.type}`);
  }
  const proxy = { send: sendProxy, request: requestProxy };
  return {
    setTransport,
    setRequestHandler,
    request,
    requestProxy,
    send,
    sendProxy,
    addMessageListener,
    removeMessageListener,
    proxy
  };
}
function defineElectrobunRPC(_side, config) {
  const rpcOptions = {
    maxRequestTime: config.maxRequestTime,
    requestHandler: {
      ...config.handlers.requests,
      ...config.extraRequestHandlers
    },
    transport: {
      registerHandler: () => {}
    }
  };
  const rpc = createRPC(rpcOptions);
  const messageHandlers = config.handlers.messages;
  if (messageHandlers) {
    rpc.addMessageListener("*", (messageName, payload) => {
      const globalHandler = messageHandlers["*"];
      if (globalHandler) {
        globalHandler(messageName, payload);
      }
      const messageHandler = messageHandlers[messageName];
      if (messageHandler) {
        messageHandler(payload);
      }
    });
  }
  return rpc;
}
var MAX_ID = 10000000000, DEFAULT_MAX_REQUEST_TIME = 1000;

// node_modules/electrobun/dist/api/shared/platform.ts
import { platform, arch } from "os";
var platformName, archName, OS, ARCH;
var init_platform = __esm(() => {
  platformName = platform();
  archName = arch();
  OS = (() => {
    switch (platformName) {
      case "win32":
        return "win";
      case "darwin":
        return "macos";
      case "linux":
        return "linux";
      default:
        throw new Error(`Unsupported platform: ${platformName}`);
    }
  })();
  ARCH = (() => {
    if (OS === "win") {
      return "x64";
    }
    switch (archName) {
      case "arm64":
        return "arm64";
      case "x64":
        return "x64";
      default:
        throw new Error(`Unsupported architecture: ${archName}`);
    }
  })();
});

// node_modules/electrobun/dist/api/shared/naming.ts
function sanitizeAppName(appName) {
  return appName.replace(/ /g, "");
}
function getAppFileName(appName, buildEnvironment) {
  const sanitized = sanitizeAppName(appName);
  return buildEnvironment === "stable" ? sanitized : `${sanitized}-${buildEnvironment}`;
}
function getPlatformPrefix(buildEnvironment, os, arch2) {
  return `${buildEnvironment}-${os}-${arch2}`;
}
function getTarballFileName(appFileName, os) {
  return os === "macos" ? `${appFileName}.app.tar.zst` : `${appFileName}.tar.zst`;
}

// node_modules/electrobun/dist/api/bun/core/Utils.ts
var exports_Utils = {};
__export(exports_Utils, {
  showNotification: () => showNotification,
  showMessageBox: () => showMessageBox,
  showItemInFolder: () => showItemInFolder,
  quit: () => quit,
  paths: () => paths,
  openPath: () => openPath,
  openFileDialog: () => openFileDialog,
  openExternal: () => openExternal,
  moveToTrash: () => moveToTrash,
  clipboardWriteText: () => clipboardWriteText,
  clipboardWriteImage: () => clipboardWriteImage,
  clipboardReadText: () => clipboardReadText,
  clipboardReadImage: () => clipboardReadImage,
  clipboardClear: () => clipboardClear,
  clipboardAvailableFormats: () => clipboardAvailableFormats
});
import { homedir, tmpdir } from "os";
import { join } from "path";
import { readFileSync } from "fs";
function getLinuxXdgUserDirs() {
  try {
    const content = readFileSync(join(home, ".config", "user-dirs.dirs"), "utf-8");
    const dirs = {};
    for (const line of content.split(`
`)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("="))
        continue;
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, eqIdx);
      let value = trimmed.slice(eqIdx + 1);
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\$HOME/g, home);
      dirs[key] = value;
    }
    return dirs;
  } catch {
    return {};
  }
}
function xdgUserDir(key, fallbackName) {
  if (OS !== "linux")
    return "";
  if (!_xdgUserDirs)
    _xdgUserDirs = getLinuxXdgUserDirs();
  return _xdgUserDirs[key] || join(home, fallbackName);
}
function getVersionInfo() {
  if (_versionInfo)
    return _versionInfo;
  try {
    const resourcesDir = "Resources";
    const raw = readFileSync(join("..", resourcesDir, "version.json"), "utf-8");
    const parsed = JSON.parse(raw);
    _versionInfo = { identifier: parsed.identifier, channel: parsed.channel };
    return _versionInfo;
  } catch (error) {
    console.error("Failed to read version.json", error);
    throw error;
  }
}
function getAppDataDir() {
  switch (OS) {
    case "macos":
      return join(home, "Library", "Application Support");
    case "win":
      return process.env["LOCALAPPDATA"] || join(home, "AppData", "Local");
    case "linux":
      return process.env["XDG_DATA_HOME"] || join(home, ".local", "share");
  }
}
function getCacheDir() {
  switch (OS) {
    case "macos":
      return join(home, "Library", "Caches");
    case "win":
      return process.env["LOCALAPPDATA"] || join(home, "AppData", "Local");
    case "linux":
      return process.env["XDG_CACHE_HOME"] || join(home, ".cache");
  }
}
function getLogsDir() {
  switch (OS) {
    case "macos":
      return join(home, "Library", "Logs");
    case "win":
      return process.env["LOCALAPPDATA"] || join(home, "AppData", "Local");
    case "linux":
      return process.env["XDG_STATE_HOME"] || join(home, ".local", "state");
  }
}
function getConfigDir() {
  switch (OS) {
    case "macos":
      return join(home, "Library", "Application Support");
    case "win":
      return process.env["APPDATA"] || join(home, "AppData", "Roaming");
    case "linux":
      return process.env["XDG_CONFIG_HOME"] || join(home, ".config");
  }
}
function getUserDir(macName, winName, xdgKey, fallbackName) {
  switch (OS) {
    case "macos":
      return join(home, macName);
    case "win": {
      const userProfile = process.env["USERPROFILE"] || home;
      return join(userProfile, winName);
    }
    case "linux":
      return xdgUserDir(xdgKey, fallbackName);
  }
}
var moveToTrash = (path) => {
  return ffi.request.moveToTrash({ path });
}, showItemInFolder = (path) => {
  return ffi.request.showItemInFolder({ path });
}, openExternal = (url) => {
  return ffi.request.openExternal({ url });
}, openPath = (path) => {
  return ffi.request.openPath({ path });
}, showNotification = (options) => {
  const { title, body, subtitle, silent } = options;
  ffi.request.showNotification({ title, body, subtitle, silent });
}, isQuitting = false, quit = () => {
  if (isQuitting)
    return;
  isQuitting = true;
  const beforeQuitEvent = electrobunEventEmitter.events.app.beforeQuit({});
  electrobunEventEmitter.emitEvent(beforeQuitEvent);
  if (beforeQuitEvent.responseWasSet && beforeQuitEvent.response?.allow === false) {
    isQuitting = false;
    return;
  }
  native.symbols.stopEventLoop();
  native.symbols.waitForShutdownComplete(5000);
  native.symbols.forceExit(0);
}, openFileDialog = async (opts = {}) => {
  const optsWithDefault = {
    ...{
      startingFolder: "~/",
      allowedFileTypes: "*",
      canChooseFiles: true,
      canChooseDirectory: true,
      allowsMultipleSelection: true
    },
    ...opts
  };
  const result = await ffi.request.openFileDialog({
    startingFolder: optsWithDefault.startingFolder,
    allowedFileTypes: optsWithDefault.allowedFileTypes,
    canChooseFiles: optsWithDefault.canChooseFiles,
    canChooseDirectory: optsWithDefault.canChooseDirectory,
    allowsMultipleSelection: optsWithDefault.allowsMultipleSelection
  });
  const filePaths = result.split(",");
  return filePaths;
}, showMessageBox = async (opts = {}) => {
  const {
    type = "info",
    title = "",
    message = "",
    detail = "",
    buttons = ["OK"],
    defaultId = 0,
    cancelId = -1
  } = opts;
  const response = ffi.request.showMessageBox({
    type,
    title,
    message,
    detail,
    buttons,
    defaultId,
    cancelId
  });
  return { response };
}, clipboardReadText = () => {
  return ffi.request.clipboardReadText();
}, clipboardWriteText = (text) => {
  ffi.request.clipboardWriteText({ text });
}, clipboardReadImage = () => {
  return ffi.request.clipboardReadImage();
}, clipboardWriteImage = (pngData) => {
  ffi.request.clipboardWriteImage({ pngData });
}, clipboardClear = () => {
  ffi.request.clipboardClear();
}, clipboardAvailableFormats = () => {
  return ffi.request.clipboardAvailableFormats();
}, home, _xdgUserDirs, _versionInfo, paths;
var init_Utils = __esm(async () => {
  init_eventEmitter();
  init_platform();
  await init_native();
  process.exit = (code) => {
    if (isQuitting) {
      native.symbols.forceExit(code ?? 0);
      return;
    }
    quit();
  };
  home = homedir();
  paths = {
    get home() {
      return home;
    },
    get appData() {
      return getAppDataDir();
    },
    get config() {
      return getConfigDir();
    },
    get cache() {
      return getCacheDir();
    },
    get temp() {
      return tmpdir();
    },
    get logs() {
      return getLogsDir();
    },
    get documents() {
      return getUserDir("Documents", "Documents", "XDG_DOCUMENTS_DIR", "Documents");
    },
    get downloads() {
      return getUserDir("Downloads", "Downloads", "XDG_DOWNLOAD_DIR", "Downloads");
    },
    get desktop() {
      return getUserDir("Desktop", "Desktop", "XDG_DESKTOP_DIR", "Desktop");
    },
    get pictures() {
      return getUserDir("Pictures", "Pictures", "XDG_PICTURES_DIR", "Pictures");
    },
    get music() {
      return getUserDir("Music", "Music", "XDG_MUSIC_DIR", "Music");
    },
    get videos() {
      return getUserDir("Movies", "Videos", "XDG_VIDEOS_DIR", "Videos");
    },
    get userData() {
      const { identifier, channel } = getVersionInfo();
      return join(getAppDataDir(), identifier, channel);
    },
    get userCache() {
      const { identifier, channel } = getVersionInfo();
      return join(getCacheDir(), identifier, channel);
    },
    get userLogs() {
      const { identifier, channel } = getVersionInfo();
      return join(getLogsDir(), identifier, channel);
    }
  };
});

// node_modules/electrobun/dist/api/bun/core/Updater.ts
import { join as join2, dirname, resolve } from "path";
import { homedir as homedir2 } from "os";
import {
  renameSync,
  unlinkSync,
  mkdirSync,
  rmdirSync,
  statSync,
  readdirSync
} from "fs";
import { execSync } from "child_process";
function emitStatus(status, message, details) {
  const entry = {
    status,
    message,
    timestamp: Date.now(),
    details
  };
  statusHistory.push(entry);
  if (onStatusChangeCallback) {
    onStatusChangeCallback(entry);
  }
}
function getAppDataDir2() {
  switch (OS) {
    case "macos":
      return join2(homedir2(), "Library", "Application Support");
    case "win":
      return process.env["LOCALAPPDATA"] || join2(homedir2(), "AppData", "Local");
    case "linux":
      return process.env["XDG_DATA_HOME"] || join2(homedir2(), ".local", "share");
    default:
      return join2(homedir2(), ".config");
  }
}
function cleanupExtractionFolder(extractionFolder, keepTarHash) {
  const keepFile = `${keepTarHash}.tar`;
  try {
    const entries = readdirSync(extractionFolder);
    for (const entry of entries) {
      if (entry === keepFile)
        continue;
      const fullPath = join2(extractionFolder, entry);
      try {
        const s = statSync(fullPath);
        if (s.isDirectory()) {
          rmdirSync(fullPath, { recursive: true });
        } else {
          unlinkSync(fullPath);
        }
      } catch (e) {}
    }
  } catch (e) {}
}
var statusHistory, onStatusChangeCallback = null, localInfo, updateInfo, Updater;
var init_Updater = __esm(async () => {
  init_platform();
  await init_Utils();
  statusHistory = [];
  Updater = {
    updateInfo: () => {
      return updateInfo;
    },
    getStatusHistory: () => {
      return [...statusHistory];
    },
    clearStatusHistory: () => {
      statusHistory.length = 0;
    },
    onStatusChange: (callback) => {
      onStatusChangeCallback = callback;
    },
    checkForUpdate: async () => {
      emitStatus("checking", "Checking for updates...");
      const localInfo2 = await Updater.getLocallocalInfo();
      if (localInfo2.channel === "dev") {
        emitStatus("no-update", "Dev channel - updates disabled", {
          currentHash: localInfo2.hash
        });
        return {
          version: localInfo2.version,
          hash: localInfo2.hash,
          updateAvailable: false,
          updateReady: false,
          error: ""
        };
      }
      const cacheBuster = Math.random().toString(36).substring(7);
      const platformPrefix = getPlatformPrefix(localInfo2.channel, OS, ARCH);
      const updateInfoUrl = `${localInfo2.baseUrl.replace(/\/+$/, "")}/${platformPrefix}-update.json?${cacheBuster}`;
      try {
        const updateInfoResponse = await fetch(updateInfoUrl);
        if (updateInfoResponse.ok) {
          const responseText = await updateInfoResponse.text();
          try {
            updateInfo = JSON.parse(responseText);
          } catch {
            emitStatus("error", "Invalid update.json: failed to parse JSON", {
              url: updateInfoUrl
            });
            return {
              version: "",
              hash: "",
              updateAvailable: false,
              updateReady: false,
              error: `Invalid update.json: failed to parse JSON`
            };
          }
          if (!updateInfo.hash) {
            emitStatus("error", "Invalid update.json: missing hash", {
              url: updateInfoUrl
            });
            return {
              version: "",
              hash: "",
              updateAvailable: false,
              updateReady: false,
              error: `Invalid update.json: missing hash`
            };
          }
          if (updateInfo.hash !== localInfo2.hash) {
            updateInfo.updateAvailable = true;
            emitStatus("update-available", `Update available: ${localInfo2.hash.slice(0, 8)} \u2192 ${updateInfo.hash.slice(0, 8)}`, {
              currentHash: localInfo2.hash,
              latestHash: updateInfo.hash
            });
          } else {
            emitStatus("no-update", "Already on latest version", {
              currentHash: localInfo2.hash
            });
          }
        } else {
          emitStatus("error", `Failed to fetch update info (HTTP ${updateInfoResponse.status})`, { url: updateInfoUrl });
          return {
            version: "",
            hash: "",
            updateAvailable: false,
            updateReady: false,
            error: `Failed to fetch update info from ${updateInfoUrl}`
          };
        }
      } catch (error) {
        return {
          version: "",
          hash: "",
          updateAvailable: false,
          updateReady: false,
          error: `Failed to fetch update info from ${updateInfoUrl}`
        };
      }
      return updateInfo;
    },
    downloadUpdate: async () => {
      emitStatus("download-starting", "Starting update download...");
      const appDataFolder = await Updater.appDataFolder();
      await Updater.channelBucketUrl();
      const appFileName = localInfo.name;
      let currentHash = (await Updater.getLocallocalInfo()).hash;
      let latestHash = (await Updater.checkForUpdate()).hash;
      const extractionFolder = join2(appDataFolder, "self-extraction");
      if (!await Bun.file(extractionFolder).exists()) {
        mkdirSync(extractionFolder, { recursive: true });
      }
      let currentTarPath = join2(extractionFolder, `${currentHash}.tar`);
      const latestTarPath = join2(extractionFolder, `${latestHash}.tar`);
      const seenHashes = [];
      let patchesApplied = 0;
      let usedPatchPath = false;
      if (!await Bun.file(latestTarPath).exists()) {
        emitStatus("checking-local-tar", `Checking for local tar file: ${currentHash.slice(0, 8)}`, { currentHash });
        while (currentHash !== latestHash) {
          seenHashes.push(currentHash);
          const currentTar = Bun.file(currentTarPath);
          if (!await currentTar.exists()) {
            emitStatus("local-tar-missing", `Local tar not found for ${currentHash.slice(0, 8)}, will download full bundle`, { currentHash });
            break;
          }
          emitStatus("local-tar-found", `Found local tar for ${currentHash.slice(0, 8)}`, { currentHash });
          const platformPrefix = getPlatformPrefix(localInfo.channel, OS, ARCH);
          const patchUrl = `${localInfo.baseUrl.replace(/\/+$/, "")}/${platformPrefix}-${currentHash}.patch`;
          emitStatus("fetching-patch", `Checking for patch: ${currentHash.slice(0, 8)}`, { currentHash, url: patchUrl });
          const patchResponse = await fetch(patchUrl);
          if (!patchResponse.ok) {
            emitStatus("patch-not-found", `No patch available for ${currentHash.slice(0, 8)}, will download full bundle`, { currentHash });
            break;
          }
          emitStatus("patch-found", `Patch found for ${currentHash.slice(0, 8)}`, { currentHash });
          emitStatus("downloading-patch", `Downloading patch for ${currentHash.slice(0, 8)}...`, { currentHash });
          const patchFilePath = join2(appDataFolder, "self-extraction", `${currentHash}.patch`);
          await Bun.write(patchFilePath, await patchResponse.arrayBuffer());
          const tmpPatchedTarFilePath = join2(appDataFolder, "self-extraction", `from-${currentHash}.tar`);
          const bunBinDir = dirname(process.execPath);
          const bspatchBinName = OS === "win" ? "bspatch.exe" : "bspatch";
          const bspatchPath = join2(bunBinDir, bspatchBinName);
          emitStatus("applying-patch", `Applying patch ${patchesApplied + 1} for ${currentHash.slice(0, 8)}...`, {
            currentHash,
            patchNumber: patchesApplied + 1
          });
          if (!statSync(bspatchPath, { throwIfNoEntry: false })) {
            emitStatus("patch-failed", `bspatch binary not found at ${bspatchPath}`, {
              currentHash,
              errorMessage: `bspatch not found: ${bspatchPath}`
            });
            console.error("bspatch not found:", bspatchPath);
            break;
          }
          if (!statSync(currentTarPath, { throwIfNoEntry: false })) {
            emitStatus("patch-failed", `Old tar not found at ${currentTarPath}`, {
              currentHash,
              errorMessage: `old tar not found: ${currentTarPath}`
            });
            console.error("old tar not found:", currentTarPath);
            break;
          }
          if (!statSync(patchFilePath, { throwIfNoEntry: false })) {
            emitStatus("patch-failed", `Patch file not found at ${patchFilePath}`, {
              currentHash,
              errorMessage: `patch not found: ${patchFilePath}`
            });
            console.error("patch file not found:", patchFilePath);
            break;
          }
          try {
            const patchResult = Bun.spawnSync([
              bspatchPath,
              currentTarPath,
              tmpPatchedTarFilePath,
              patchFilePath
            ]);
            if (patchResult.exitCode !== 0 || patchResult.success === false) {
              const stderr = patchResult.stderr ? patchResult.stderr.toString() : "";
              const stdout = patchResult.stdout ? patchResult.stdout.toString() : "";
              if (updateInfo) {
                updateInfo.error = stderr || `bspatch failed with exit code ${patchResult.exitCode}`;
              }
              emitStatus("patch-failed", `Patch application failed: ${stderr || `exit code ${patchResult.exitCode}`}`, {
                currentHash,
                errorMessage: stderr || `exit code ${patchResult.exitCode}`
              });
              console.error("bspatch failed", {
                exitCode: patchResult.exitCode,
                stdout,
                stderr,
                bspatchPath,
                oldTar: currentTarPath,
                newTar: tmpPatchedTarFilePath,
                patch: patchFilePath
              });
              break;
            }
          } catch (error) {
            emitStatus("patch-failed", `Patch threw exception: ${error.message}`, {
              currentHash,
              errorMessage: error.message
            });
            console.error("bspatch threw", error, { bspatchPath });
            break;
          }
          patchesApplied++;
          emitStatus("patch-applied", `Patch ${patchesApplied} applied successfully`, {
            currentHash,
            patchNumber: patchesApplied
          });
          emitStatus("extracting-version", "Extracting version info from patched tar...", { currentHash });
          let hashFilePath = "";
          const resourcesDir = "Resources";
          const patchedTarBytes = await Bun.file(tmpPatchedTarFilePath).arrayBuffer();
          const patchedArchive = new Bun.Archive(patchedTarBytes);
          const patchedFiles = await patchedArchive.files();
          for (const [filePath] of patchedFiles) {
            if (filePath.endsWith(`${resourcesDir}/version.json`) || filePath.endsWith("metadata.json")) {
              hashFilePath = filePath;
              break;
            }
          }
          if (!hashFilePath) {
            emitStatus("error", "Could not find version/metadata file in patched tar", { currentHash });
            console.error("Neither Resources/version.json nor metadata.json found in patched tar:", tmpPatchedTarFilePath);
            break;
          }
          const hashFile = patchedFiles.get(hashFilePath);
          const hashFileJson = JSON.parse(await hashFile.text());
          const nextHash = hashFileJson.hash;
          if (seenHashes.includes(nextHash)) {
            emitStatus("error", "Cyclical update detected, falling back to full download", { currentHash: nextHash });
            console.log("Warning: cyclical update detected");
            break;
          }
          seenHashes.push(nextHash);
          if (!nextHash) {
            emitStatus("error", "Could not determine next hash from patched tar", { currentHash });
            break;
          }
          const updatedTarPath = join2(appDataFolder, "self-extraction", `${nextHash}.tar`);
          renameSync(tmpPatchedTarFilePath, updatedTarPath);
          unlinkSync(currentTarPath);
          unlinkSync(patchFilePath);
          currentHash = nextHash;
          currentTarPath = join2(appDataFolder, "self-extraction", `${currentHash}.tar`);
          emitStatus("patch-applied", `Patched to ${nextHash.slice(0, 8)}, checking for more patches...`, {
            currentHash: nextHash,
            toHash: latestHash,
            totalPatchesApplied: patchesApplied
          });
        }
        if (currentHash === latestHash && patchesApplied > 0) {
          usedPatchPath = true;
          emitStatus("patch-chain-complete", `Patch chain complete! Applied ${patchesApplied} patches`, {
            totalPatchesApplied: patchesApplied,
            currentHash: latestHash,
            usedPatchPath: true
          });
        }
        if (currentHash !== latestHash) {
          emitStatus("downloading-full-bundle", "Downloading full update bundle...", {
            currentHash,
            latestHash,
            usedPatchPath: false
          });
          const cacheBuster = Math.random().toString(36).substring(7);
          const platformPrefix = getPlatformPrefix(localInfo.channel, OS, ARCH);
          const tarballName = getTarballFileName(appFileName, OS);
          const urlToLatestTarball = `${localInfo.baseUrl.replace(/\/+$/, "")}/${platformPrefix}-${tarballName}`;
          const prevVersionCompressedTarballPath = join2(appDataFolder, "self-extraction", "latest.tar.zst");
          emitStatus("download-progress", `Fetching ${tarballName}...`, {
            url: urlToLatestTarball
          });
          const response = await fetch(urlToLatestTarball + `?${cacheBuster}`);
          if (response.ok && response.body) {
            const contentLength = response.headers.get("content-length");
            const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;
            let bytesDownloaded = 0;
            const reader = response.body.getReader();
            const writer = Bun.file(prevVersionCompressedTarballPath).writer();
            while (true) {
              const { done, value } = await reader.read();
              if (done)
                break;
              await writer.write(value);
              bytesDownloaded += value.length;
              if (bytesDownloaded % 500000 < value.length) {
                emitStatus("download-progress", `Downloading: ${(bytesDownloaded / 1024 / 1024).toFixed(1)} MB`, {
                  bytesDownloaded,
                  totalBytes,
                  progress: totalBytes ? Math.round(bytesDownloaded / totalBytes * 100) : undefined
                });
              }
            }
            await writer.flush();
            writer.end();
            emitStatus("download-progress", `Download complete: ${(bytesDownloaded / 1024 / 1024).toFixed(1)} MB`, {
              bytesDownloaded,
              totalBytes,
              progress: 100
            });
          } else {
            emitStatus("error", `Failed to download: ${urlToLatestTarball}`, {
              url: urlToLatestTarball
            });
            console.log("latest version not found at: ", urlToLatestTarball);
          }
          emitStatus("decompressing", "Decompressing update bundle...");
          const bunBinDir = dirname(process.execPath);
          const zstdBinName = OS === "win" ? "zig-zstd.exe" : "zig-zstd";
          const zstdPath = join2(bunBinDir, zstdBinName);
          if (!statSync(zstdPath, { throwIfNoEntry: false })) {
            updateInfo.error = `zig-zstd not found: ${zstdPath}`;
            emitStatus("error", updateInfo.error, { zstdPath });
            console.error("zig-zstd not found:", zstdPath);
          } else {
            const decompressResult = Bun.spawnSync([
              zstdPath,
              "decompress",
              "-i",
              prevVersionCompressedTarballPath,
              "-o",
              latestTarPath,
              "--no-timing"
            ], {
              cwd: extractionFolder,
              stdout: "inherit",
              stderr: "inherit"
            });
            if (!decompressResult.success) {
              updateInfo.error = `zig-zstd failed with exit code ${decompressResult.exitCode}`;
              emitStatus("error", updateInfo.error, {
                zstdPath,
                exitCode: decompressResult.exitCode
              });
              console.error("zig-zstd failed", {
                exitCode: decompressResult.exitCode,
                zstdPath
              });
            } else {
              emitStatus("decompressing", "Decompression complete");
            }
          }
          unlinkSync(prevVersionCompressedTarballPath);
        }
      }
      if (await Bun.file(latestTarPath).exists()) {
        updateInfo.updateReady = true;
        emitStatus("download-complete", `Update ready to install (used ${usedPatchPath ? "patch" : "full download"} path)`, {
          latestHash,
          usedPatchPath,
          totalPatchesApplied: patchesApplied
        });
      } else {
        updateInfo.error = "Failed to download latest version";
        emitStatus("error", "Failed to download latest version", { latestHash });
      }
      cleanupExtractionFolder(extractionFolder, latestHash);
    },
    applyUpdate: async () => {
      if (updateInfo?.updateReady) {
        emitStatus("applying", "Starting update installation...");
        const appDataFolder = await Updater.appDataFolder();
        const extractionFolder = join2(appDataFolder, "self-extraction");
        if (!await Bun.file(extractionFolder).exists()) {
          mkdirSync(extractionFolder, { recursive: true });
        }
        let latestHash = (await Updater.checkForUpdate()).hash;
        const latestTarPath = join2(extractionFolder, `${latestHash}.tar`);
        let appBundleSubpath = "";
        if (await Bun.file(latestTarPath).exists()) {
          emitStatus("extracting", `Extracting update to ${latestHash.slice(0, 8)}...`, { latestHash });
          const extractionDir = OS === "win" ? join2(extractionFolder, `temp-${latestHash}`) : extractionFolder;
          if (OS === "win") {
            mkdirSync(extractionDir, { recursive: true });
          }
          const latestTarBytes = await Bun.file(latestTarPath).arrayBuffer();
          const latestArchive = new Bun.Archive(latestTarBytes);
          await latestArchive.extract(extractionDir);
          if (OS === "macos") {
            const extractedFiles = readdirSync(extractionDir);
            for (const file of extractedFiles) {
              if (file.endsWith(".app")) {
                appBundleSubpath = file + "/";
                break;
              }
            }
          } else {
            appBundleSubpath = "./";
          }
          console.log(`Tar extraction completed. Found appBundleSubpath: ${appBundleSubpath}`);
          if (!appBundleSubpath) {
            console.error("Failed to find app in tarball");
            return;
          }
          const extractedAppPath = resolve(join2(extractionDir, appBundleSubpath));
          let newAppBundlePath;
          if (OS === "linux") {
            const extractedFiles = readdirSync(extractionDir);
            const appBundleDir = extractedFiles.find((file) => {
              const filePath = join2(extractionDir, file);
              return statSync(filePath).isDirectory() && !file.endsWith(".tar");
            });
            if (!appBundleDir) {
              console.error("Could not find app bundle directory in extraction");
              return;
            }
            newAppBundlePath = join2(extractionDir, appBundleDir);
            const bundleStats = statSync(newAppBundlePath, { throwIfNoEntry: false });
            if (!bundleStats || !bundleStats.isDirectory()) {
              console.error(`App bundle directory not found at: ${newAppBundlePath}`);
              console.log("Contents of extraction directory:");
              try {
                const files = readdirSync(extractionDir);
                for (const file of files) {
                  console.log(`  - ${file}`);
                  const subPath = join2(extractionDir, file);
                  if (statSync(subPath).isDirectory()) {
                    const subFiles = readdirSync(subPath);
                    for (const subFile of subFiles) {
                      console.log(`    - ${subFile}`);
                    }
                  }
                }
              } catch (e) {
                console.log("Could not list directory contents:", e);
              }
              return;
            }
          } else if (OS === "win") {
            const appBundleName = getAppFileName(localInfo.name, localInfo.channel);
            newAppBundlePath = join2(extractionDir, appBundleName);
            if (!statSync(newAppBundlePath, { throwIfNoEntry: false })) {
              console.error(`Extracted app not found at: ${newAppBundlePath}`);
              console.log("Contents of extraction directory:");
              try {
                const files = readdirSync(extractionDir);
                for (const file of files) {
                  console.log(`  - ${file}`);
                }
              } catch (e) {
                console.log("Could not list directory contents:", e);
              }
              return;
            }
          } else {
            newAppBundlePath = extractedAppPath;
          }
          let runningAppBundlePath;
          const appDataFolder2 = await Updater.appDataFolder();
          if (OS === "macos") {
            runningAppBundlePath = resolve(dirname(process.execPath), "..", "..");
          } else if (OS === "linux" || OS === "win") {
            runningAppBundlePath = join2(appDataFolder2, "app");
          } else {
            throw new Error(`Unsupported platform: ${OS}`);
          }
          try {
            emitStatus("replacing-app", "Removing old version...");
            if (OS === "macos") {
              if (statSync(runningAppBundlePath, { throwIfNoEntry: false })) {
                rmdirSync(runningAppBundlePath, { recursive: true });
              }
              emitStatus("replacing-app", "Installing new version...");
              renameSync(newAppBundlePath, runningAppBundlePath);
              try {
                execSync(`xattr -r -d com.apple.quarantine "${runningAppBundlePath}"`, { stdio: "ignore" });
              } catch (e) {}
            } else if (OS === "linux") {
              const appBundleDir = join2(appDataFolder2, "app");
              if (statSync(appBundleDir, { throwIfNoEntry: false })) {
                rmdirSync(appBundleDir, { recursive: true });
              }
              renameSync(newAppBundlePath, appBundleDir);
              const launcherPath = join2(appBundleDir, "bin", "launcher");
              if (statSync(launcherPath, { throwIfNoEntry: false })) {
                execSync(`chmod +x "${launcherPath}"`);
              }
              const bunPath = join2(appBundleDir, "bin", "bun");
              if (statSync(bunPath, { throwIfNoEntry: false })) {
                execSync(`chmod +x "${bunPath}"`);
              }
            }
            if (OS !== "win") {
              cleanupExtractionFolder(extractionFolder, latestHash);
            }
            if (OS === "win") {
              const parentDir = dirname(runningAppBundlePath);
              const updateScriptPath = join2(parentDir, "update.bat");
              const launcherPath = join2(runningAppBundlePath, "bin", "launcher.exe");
              const runningAppWin = runningAppBundlePath.replace(/\//g, "\\");
              const newAppWin = newAppBundlePath.replace(/\//g, "\\");
              const extractionDirWin = extractionDir.replace(/\//g, "\\");
              const launcherPathWin = launcherPath.replace(/\//g, "\\");
              const updateScript = `@echo off
setlocal

:: Wait for the app to fully exit (check if launcher.exe is still running)
:waitloop
tasklist /FI "IMAGENAME eq launcher.exe" 2>NUL | find /I /N "launcher.exe">NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 1 /nobreak >nul
    goto waitloop
)

:: Small extra delay to ensure all file handles are released
timeout /t 2 /nobreak >nul

:: Remove current app folder
if exist "${runningAppWin}" (
    rmdir /s /q "${runningAppWin}"
)

:: Move new app to current location
move "${newAppWin}" "${runningAppWin}"

:: Clean up extraction directory
rmdir /s /q "${extractionDirWin}" 2>nul

:: Launch the new app
start "" "${launcherPathWin}"

:: Clean up scheduled tasks starting with ElectrobunUpdate_
for /f "tokens=1" %%t in ('schtasks /query /fo list ^| findstr /i "ElectrobunUpdate_"') do (
    schtasks /delete /tn "%%t" /f >nul 2>&1
)

:: Delete this update script after a short delay
ping -n 2 127.0.0.1 >nul
del "%~f0"
`;
              await Bun.write(updateScriptPath, updateScript);
              const scriptPathWin = updateScriptPath.replace(/\//g, "\\");
              const taskName = `ElectrobunUpdate_${Date.now()}`;
              execSync(`schtasks /create /tn "${taskName}" /tr "cmd /c \\"${scriptPathWin}\\"" /sc once /st 00:00 /f`, { stdio: "ignore" });
              execSync(`schtasks /run /tn "${taskName}"`, { stdio: "ignore" });
              quit();
            }
          } catch (error) {
            emitStatus("error", `Failed to replace app: ${error.message}`, {
              errorMessage: error.message
            });
            console.error("Failed to replace app with new version", error);
            return;
          }
          emitStatus("launching-new-version", "Launching updated version...");
          if (OS === "macos") {
            const pid = process.pid;
            Bun.spawn([
              "sh",
              "-c",
              `while kill -0 ${pid} 2>/dev/null; do sleep 0.5; done; sleep 1; open "${runningAppBundlePath}"`
            ], {
              detached: true,
              stdio: ["ignore", "ignore", "ignore"]
            });
          } else if (OS === "linux") {
            const launcherPath = join2(runningAppBundlePath, "bin", "launcher");
            Bun.spawn(["sh", "-c", `"${launcherPath}" &`], {
              detached: true
            });
          }
          emitStatus("complete", "Update complete, restarting application...");
          quit();
        }
      }
    },
    channelBucketUrl: async () => {
      await Updater.getLocallocalInfo();
      return localInfo.baseUrl;
    },
    appDataFolder: async () => {
      await Updater.getLocallocalInfo();
      const appDataFolder = join2(getAppDataDir2(), localInfo.identifier, localInfo.channel);
      return appDataFolder;
    },
    localInfo: {
      version: async () => {
        return (await Updater.getLocallocalInfo()).version;
      },
      hash: async () => {
        return (await Updater.getLocallocalInfo()).hash;
      },
      channel: async () => {
        return (await Updater.getLocallocalInfo()).channel;
      },
      baseUrl: async () => {
        return (await Updater.getLocallocalInfo()).baseUrl;
      }
    },
    getLocallocalInfo: async () => {
      if (localInfo) {
        return localInfo;
      }
      try {
        const resourcesDir = "Resources";
        localInfo = await Bun.file(`../${resourcesDir}/version.json`).json();
        return localInfo;
      } catch (error) {
        console.error("Failed to read version.json", error);
        throw error;
      }
    }
  };
});

// node_modules/electrobun/dist/api/bun/core/BuildConfig.ts
var buildConfig = null, BuildConfig;
var init_BuildConfig = __esm(() => {
  BuildConfig = {
    get: async () => {
      if (buildConfig) {
        return buildConfig;
      }
      try {
        const resourcesDir = "Resources";
        buildConfig = await Bun.file(`../${resourcesDir}/build.json`).json();
        return buildConfig;
      } catch (error) {
        buildConfig = {
          defaultRenderer: "native",
          availableRenderers: ["native"]
        };
        return buildConfig;
      }
    },
    getCached: () => buildConfig
  };
});

// node_modules/electrobun/dist/api/bun/core/Socket.ts
var exports_Socket = {};
__export(exports_Socket, {
  socketMap: () => socketMap,
  sendMessageToWebviewViaSocket: () => sendMessageToWebviewViaSocket,
  rpcServer: () => rpcServer,
  rpcPort: () => rpcPort
});
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
function base64ToUint8Array(base64) {
  {
    return new Uint8Array(atob(base64).split("").map((char) => char.charCodeAt(0)));
  }
}
function encrypt(secretKey, text) {
  const iv = new Uint8Array(randomBytes(12));
  const cipher = createCipheriv("aes-256-gcm", secretKey, iv);
  const encrypted = Buffer.concat([
    new Uint8Array(cipher.update(text, "utf8")),
    new Uint8Array(cipher.final())
  ]).toString("base64");
  const tag = cipher.getAuthTag().toString("base64");
  return { encrypted, iv: Buffer.from(iv).toString("base64"), tag };
}
function decrypt(secretKey, encryptedData, iv, tag) {
  const decipher = createDecipheriv("aes-256-gcm", secretKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    new Uint8Array(decipher.update(encryptedData)),
    new Uint8Array(decipher.final())
  ]);
  return decrypted.toString("utf8");
}
var socketMap, startRPCServer = () => {
  const startPort = 50000;
  const endPort = 65535;
  const payloadLimit = 1024 * 1024 * 500;
  let port = startPort;
  let server = null;
  while (port <= endPort) {
    try {
      server = Bun.serve({
        port,
        fetch(req, server2) {
          const url = new URL(req.url);
          if (url.pathname === "/socket") {
            const webviewIdString = url.searchParams.get("webviewId");
            if (!webviewIdString) {
              return new Response("Missing webviewId", { status: 400 });
            }
            const webviewId = parseInt(webviewIdString, 10);
            const success = server2.upgrade(req, { data: { webviewId } });
            return success ? undefined : new Response("Upgrade failed", { status: 500 });
          }
          console.log("unhandled RPC Server request", req.url);
        },
        websocket: {
          idleTimeout: 960,
          maxPayloadLength: payloadLimit,
          backpressureLimit: payloadLimit * 2,
          open(ws) {
            if (!ws?.data) {
              return;
            }
            const { webviewId } = ws.data;
            if (!socketMap[webviewId]) {
              socketMap[webviewId] = { socket: ws, queue: [] };
            } else {
              socketMap[webviewId].socket = ws;
            }
          },
          close(ws, _code, _reason) {
            if (!ws?.data) {
              return;
            }
            const { webviewId } = ws.data;
            if (socketMap[webviewId]) {
              socketMap[webviewId].socket = null;
            }
          },
          message(ws, message) {
            if (!ws?.data) {
              return;
            }
            const { webviewId } = ws.data;
            const browserView = BrowserView.getById(webviewId);
            if (!browserView) {
              return;
            }
            if (browserView.rpcHandler) {
              if (typeof message === "string") {
                try {
                  const encryptedPacket = JSON.parse(message);
                  const decrypted = decrypt(browserView.secretKey, base64ToUint8Array(encryptedPacket.encryptedData), base64ToUint8Array(encryptedPacket.iv), base64ToUint8Array(encryptedPacket.tag));
                  browserView.rpcHandler(JSON.parse(decrypted));
                } catch (error) {
                  console.log("Error handling message:", error);
                }
              } else if (message instanceof ArrayBuffer) {
                console.log("TODO: Received ArrayBuffer message:", message);
              }
            }
          }
        }
      });
      break;
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        console.log(`Port ${port} in use, trying next port...`);
        port++;
      } else {
        throw error;
      }
    }
  }
  return { rpcServer: server, rpcPort: port };
}, rpcServer, rpcPort, sendMessageToWebviewViaSocket = (webviewId, message) => {
  const rpc = socketMap[webviewId];
  const browserView = BrowserView.getById(webviewId);
  if (!browserView)
    return false;
  if (rpc?.socket?.readyState === WebSocket.OPEN) {
    try {
      const unencryptedString = JSON.stringify(message);
      const encrypted = encrypt(browserView.secretKey, unencryptedString);
      const encryptedPacket = {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        tag: encrypted.tag
      };
      const encryptedPacketString = JSON.stringify(encryptedPacket);
      rpc.socket.send(encryptedPacketString);
      return true;
    } catch (error) {
      console.error("Error sending message to webview via socket:", error);
    }
  }
  return false;
};
var init_Socket = __esm(async () => {
  await init_BrowserView();
  socketMap = {};
  ({ rpcServer, rpcPort } = startRPCServer());
  console.log("Server started at", rpcServer?.url.origin);
});

// node_modules/electrobun/dist/api/bun/core/BrowserView.ts
import { randomBytes as randomBytes2 } from "crypto";

class BrowserView {
  id = nextWebviewId++;
  ptr;
  hostWebviewId;
  windowId;
  renderer;
  url = null;
  html = null;
  preload = null;
  partition = null;
  autoResize = true;
  frame = {
    x: 0,
    y: 0,
    width: 800,
    height: 600
  };
  pipePrefix;
  inStream;
  outStream;
  secretKey;
  rpc;
  rpcHandler;
  navigationRules = null;
  sandbox = false;
  startTransparent = false;
  startPassthrough = false;
  constructor(options = defaultOptions) {
    this.url = options.url || defaultOptions.url || null;
    this.html = options.html || defaultOptions.html || null;
    this.preload = options.preload || defaultOptions.preload || null;
    this.frame = {
      x: options.frame?.x ?? defaultOptions.frame.x,
      y: options.frame?.y ?? defaultOptions.frame.y,
      width: options.frame?.width ?? defaultOptions.frame.width,
      height: options.frame?.height ?? defaultOptions.frame.height
    };
    this.rpc = options.rpc;
    this.secretKey = new Uint8Array(randomBytes2(32));
    this.partition = options.partition || null;
    this.pipePrefix = `/private/tmp/electrobun_ipc_pipe_${hash}_${randomId}_${this.id}`;
    this.hostWebviewId = options.hostWebviewId;
    this.windowId = options.windowId ?? 0;
    this.autoResize = options.autoResize === false ? false : true;
    this.navigationRules = options.navigationRules || null;
    this.renderer = options.renderer ?? defaultOptions.renderer ?? "native";
    this.sandbox = options.sandbox ?? false;
    this.startTransparent = options.startTransparent ?? false;
    this.startPassthrough = options.startPassthrough ?? false;
    BrowserViewMap[this.id] = this;
    this.ptr = this.init();
    if (this.html) {
      console.log(`DEBUG: BrowserView constructor triggering loadHTML for webview ${this.id}`);
      setTimeout(() => {
        console.log(`DEBUG: BrowserView delayed loadHTML for webview ${this.id}`);
        this.loadHTML(this.html);
      }, 100);
    } else {
      console.log(`DEBUG: BrowserView constructor - no HTML provided for webview ${this.id}`);
    }
  }
  init() {
    this.createStreams();
    return ffi.request.createWebview({
      id: this.id,
      windowId: this.windowId,
      renderer: this.renderer,
      rpcPort,
      secretKey: this.secretKey.toString(),
      hostWebviewId: this.hostWebviewId || null,
      pipePrefix: this.pipePrefix,
      partition: this.partition,
      url: this.html ? null : this.url,
      html: this.html,
      preload: this.preload,
      frame: {
        width: this.frame.width,
        height: this.frame.height,
        x: this.frame.x,
        y: this.frame.y
      },
      autoResize: this.autoResize,
      navigationRules: this.navigationRules,
      sandbox: this.sandbox,
      startTransparent: this.startTransparent,
      startPassthrough: this.startPassthrough
    });
  }
  createStreams() {
    if (!this.rpc) {
      this.rpc = BrowserView.defineRPC({
        handlers: { requests: {}, messages: {} }
      });
    }
    this.rpc.setTransport(this.createTransport());
  }
  sendMessageToWebviewViaExecute(jsonMessage) {
    const stringifiedMessage = typeof jsonMessage === "string" ? jsonMessage : JSON.stringify(jsonMessage);
    const wrappedMessage = `window.__electrobun.receiveMessageFromBun(${stringifiedMessage})`;
    this.executeJavascript(wrappedMessage);
  }
  sendInternalMessageViaExecute(jsonMessage) {
    const stringifiedMessage = typeof jsonMessage === "string" ? jsonMessage : JSON.stringify(jsonMessage);
    const wrappedMessage = `window.__electrobun.receiveInternalMessageFromBun(${stringifiedMessage})`;
    this.executeJavascript(wrappedMessage);
  }
  executeJavascript(js) {
    ffi.request.evaluateJavascriptWithNoCompletion({ id: this.id, js });
  }
  loadURL(url) {
    console.log(`DEBUG: loadURL called for webview ${this.id}: ${url}`);
    this.url = url;
    native.symbols.loadURLInWebView(this.ptr, toCString(this.url));
  }
  loadHTML(html) {
    this.html = html;
    console.log(`DEBUG: Setting HTML content for webview ${this.id}:`, html.substring(0, 50) + "...");
    if (this.renderer === "cef") {
      native.symbols.setWebviewHTMLContent(this.id, toCString(html));
      this.loadURL("views://internal/index.html");
    } else {
      native.symbols.loadHTMLInWebView(this.ptr, toCString(html));
    }
  }
  setNavigationRules(rules) {
    this.navigationRules = JSON.stringify(rules);
    const rulesJson = JSON.stringify(rules);
    native.symbols.setWebviewNavigationRules(this.ptr, toCString(rulesJson));
  }
  findInPage(searchText, options) {
    const forward = options?.forward ?? true;
    const matchCase = options?.matchCase ?? false;
    native.symbols.webviewFindInPage(this.ptr, toCString(searchText), forward, matchCase);
  }
  stopFindInPage() {
    native.symbols.webviewStopFind(this.ptr);
  }
  openDevTools() {
    native.symbols.webviewOpenDevTools(this.ptr);
  }
  closeDevTools() {
    native.symbols.webviewCloseDevTools(this.ptr);
  }
  toggleDevTools() {
    native.symbols.webviewToggleDevTools(this.ptr);
  }
  on(name, handler) {
    const specificName = `${name}-${this.id}`;
    eventEmitter_default.on(specificName, handler);
  }
  createTransport = () => {
    const that = this;
    return {
      send(message) {
        const sentOverSocket = sendMessageToWebviewViaSocket(that.id, message);
        if (!sentOverSocket) {
          try {
            const messageString = JSON.stringify(message);
            that.sendMessageToWebviewViaExecute(messageString);
          } catch (error) {
            console.error("bun: failed to serialize message to webview", error);
          }
        }
      },
      registerHandler(handler) {
        that.rpcHandler = handler;
      }
    };
  };
  remove() {
    native.symbols.webviewRemove(this.ptr);
    delete BrowserViewMap[this.id];
  }
  static getById(id) {
    return BrowserViewMap[id];
  }
  static getAll() {
    return Object.values(BrowserViewMap);
  }
  static defineRPC(config) {
    return defineElectrobunRPC("bun", config);
  }
}
var BrowserViewMap, nextWebviewId = 1, hash, buildConfig2, defaultOptions, randomId;
var init_BrowserView = __esm(async () => {
  init_eventEmitter();
  init_BuildConfig();
  await __promiseAll([
    init_native(),
    init_Updater(),
    init_Socket()
  ]);
  BrowserViewMap = {};
  hash = await Updater.localInfo.hash();
  buildConfig2 = await BuildConfig.get();
  defaultOptions = {
    url: null,
    html: null,
    preload: null,
    renderer: buildConfig2.defaultRenderer,
    frame: {
      x: 0,
      y: 0,
      width: 800,
      height: 600
    }
  };
  randomId = Math.random().toString(36).substring(7);
});

// node_modules/electrobun/dist/api/bun/core/Paths.ts
var exports_Paths = {};
__export(exports_Paths, {
  VIEWS_FOLDER: () => VIEWS_FOLDER
});
import { resolve as resolve2 } from "path";
var RESOURCES_FOLDER, VIEWS_FOLDER;
var init_Paths = __esm(() => {
  RESOURCES_FOLDER = resolve2("../Resources/");
  VIEWS_FOLDER = resolve2(RESOURCES_FOLDER, "app/views");
});

// node_modules/electrobun/dist/api/bun/core/Tray.ts
import { join as join3 } from "path";

class Tray {
  id = nextTrayId++;
  ptr = null;
  constructor({
    title = "",
    image = "",
    template = true,
    width = 16,
    height = 16
  } = {}) {
    try {
      this.ptr = ffi.request.createTray({
        id: this.id,
        title,
        image: this.resolveImagePath(image),
        template,
        width,
        height
      });
    } catch (error) {
      console.warn("Tray creation failed:", error);
      console.warn("System tray functionality may not be available on this platform");
      this.ptr = null;
    }
    TrayMap[this.id] = this;
  }
  resolveImagePath(imgPath) {
    if (imgPath.startsWith("views://")) {
      return join3(VIEWS_FOLDER, imgPath.replace("views://", ""));
    } else {
      return imgPath;
    }
  }
  setTitle(title) {
    if (!this.ptr)
      return;
    ffi.request.setTrayTitle({ id: this.id, title });
  }
  setImage(imgPath) {
    if (!this.ptr)
      return;
    ffi.request.setTrayImage({
      id: this.id,
      image: this.resolveImagePath(imgPath)
    });
  }
  setMenu(menu) {
    if (!this.ptr)
      return;
    const menuWithDefaults = menuConfigWithDefaults(menu);
    ffi.request.setTrayMenu({
      id: this.id,
      menuConfig: JSON.stringify(menuWithDefaults)
    });
  }
  on(name, handler) {
    const specificName = `${name}-${this.id}`;
    eventEmitter_default.on(specificName, handler);
  }
  remove() {
    console.log("Tray.remove() called for id:", this.id);
    if (this.ptr) {
      ffi.request.removeTray({ id: this.id });
    }
    delete TrayMap[this.id];
    console.log("Tray removed from TrayMap");
  }
  static getById(id) {
    return TrayMap[id];
  }
  static getAll() {
    return Object.values(TrayMap);
  }
  static removeById(id) {
    const tray = TrayMap[id];
    if (tray) {
      tray.remove();
    }
  }
}
var nextTrayId = 1, TrayMap, menuConfigWithDefaults = (menu) => {
  return menu.map((item) => {
    if (item.type === "divider" || item.type === "separator") {
      return { type: "divider" };
    } else {
      const menuItem = item;
      const actionWithDataId = ffi.internal.serializeMenuAction(menuItem.action || "", menuItem.data);
      return {
        label: menuItem.label || "",
        type: menuItem.type || "normal",
        action: actionWithDataId,
        enabled: menuItem.enabled === false ? false : true,
        checked: Boolean(menuItem.checked),
        hidden: Boolean(menuItem.hidden),
        tooltip: menuItem.tooltip || undefined,
        ...menuItem.submenu ? { submenu: menuConfigWithDefaults(menuItem.submenu) } : {}
      };
    }
  });
};
var init_Tray = __esm(async () => {
  init_eventEmitter();
  init_Paths();
  await init_native();
  TrayMap = {};
});

// node_modules/electrobun/dist/api/bun/preload/.generated/compiled.ts
var preloadScript = `(() => {
  // src/bun/preload/encryption.ts
  function base64ToUint8Array(base64) {
    return new Uint8Array(atob(base64).split("").map((char) => char.charCodeAt(0)));
  }
  function uint8ArrayToBase64(uint8Array) {
    let binary = "";
    for (let i = 0;i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }
  async function generateKeyFromBytes(rawKey) {
    return await window.crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  }
  async function initEncryption() {
    const secretKey = await generateKeyFromBytes(new Uint8Array(window.__electrobunSecretKeyBytes));
    const encryptString = async (plaintext) => {
      const encoder = new TextEncoder;
      const encodedText = encoder.encode(plaintext);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, secretKey, encodedText);
      const encryptedData = new Uint8Array(encryptedBuffer.slice(0, -16));
      const tag = new Uint8Array(encryptedBuffer.slice(-16));
      return {
        encryptedData: uint8ArrayToBase64(encryptedData),
        iv: uint8ArrayToBase64(iv),
        tag: uint8ArrayToBase64(tag)
      };
    };
    const decryptString = async (encryptedDataB64, ivB64, tagB64) => {
      const encryptedData = base64ToUint8Array(encryptedDataB64);
      const iv = base64ToUint8Array(ivB64);
      const tag = base64ToUint8Array(tagB64);
      const combinedData = new Uint8Array(encryptedData.length + tag.length);
      combinedData.set(encryptedData);
      combinedData.set(tag, encryptedData.length);
      const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, secretKey, combinedData);
      const decoder = new TextDecoder;
      return decoder.decode(decryptedBuffer);
    };
    window.__electrobun_encrypt = encryptString;
    window.__electrobun_decrypt = decryptString;
  }

  // src/bun/preload/internalRpc.ts
  var pendingRequests = {};
  var requestId = 0;
  var isProcessingQueue = false;
  var sendQueue = [];
  function processQueue() {
    if (isProcessingQueue) {
      setTimeout(processQueue);
      return;
    }
    if (sendQueue.length === 0)
      return;
    isProcessingQueue = true;
    const batch = JSON.stringify(sendQueue);
    sendQueue.length = 0;
    window.__electrobunInternalBridge?.postMessage(batch);
    setTimeout(() => {
      isProcessingQueue = false;
    }, 2);
  }
  function send(type, payload) {
    sendQueue.push(JSON.stringify({ type: "message", id: type, payload }));
    processQueue();
  }
  function request(type, payload) {
    return new Promise((resolve, reject) => {
      const id = \`req_\${++requestId}_\${Date.now()}\`;
      pendingRequests[id] = { resolve, reject };
      sendQueue.push(JSON.stringify({
        type: "request",
        method: type,
        id,
        params: payload,
        hostWebviewId: window.__electrobunWebviewId
      }));
      processQueue();
      setTimeout(() => {
        if (pendingRequests[id]) {
          delete pendingRequests[id];
          reject(new Error(\`Request timeout: \${type}\`));
        }
      }, 1e4);
    });
  }
  function handleResponse(msg) {
    if (msg && msg.type === "response" && msg.id) {
      const pending = pendingRequests[msg.id];
      if (pending) {
        delete pendingRequests[msg.id];
        if (msg.success)
          pending.resolve(msg.payload);
        else
          pending.reject(msg.payload);
      }
    }
  }

  // src/bun/preload/dragRegions.ts
  function isAppRegionDrag(e) {
    const target = e.target;
    if (!target || !target.closest)
      return false;
    const draggableByStyle = target.closest('[style*="app-region"][style*="drag"]');
    const draggableByClass = target.closest(".electrobun-webkit-app-region-drag");
    return !!(draggableByStyle || draggableByClass);
  }
  function initDragRegions() {
    document.addEventListener("mousedown", (e) => {
      if (isAppRegionDrag(e)) {
        send("startWindowMove", { id: window.__electrobunWindowId });
      }
    });
    document.addEventListener("mouseup", (e) => {
      if (isAppRegionDrag(e)) {
        send("stopWindowMove", { id: window.__electrobunWindowId });
      }
    });
  }

  // src/bun/preload/webviewTag.ts
  var webviewRegistry = {};

  class ElectrobunWebviewTag extends HTMLElement {
    webviewId = null;
    maskSelectors = new Set;
    lastRect = { x: 0, y: 0, width: 0, height: 0 };
    resizeObserver = null;
    positionCheckLoop = null;
    transparent = false;
    passthroughEnabled = false;
    hidden = false;
    sandboxed = false;
    _eventListeners = {};
    constructor() {
      super();
    }
    connectedCallback() {
      requestAnimationFrame(() => this.initWebview());
    }
    disconnectedCallback() {
      if (this.webviewId !== null) {
        send("webviewTagRemove", { id: this.webviewId });
        delete webviewRegistry[this.webviewId];
      }
      if (this.resizeObserver)
        this.resizeObserver.disconnect();
      if (this.positionCheckLoop)
        clearInterval(this.positionCheckLoop);
    }
    async initWebview() {
      const rect = this.getBoundingClientRect();
      this.lastRect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
      const url = this.getAttribute("src");
      const html = this.getAttribute("html");
      const preload = this.getAttribute("preload");
      const partition = this.getAttribute("partition");
      const renderer = this.getAttribute("renderer") || "native";
      const masks = this.getAttribute("masks");
      const sandbox = this.hasAttribute("sandbox");
      this.sandboxed = sandbox;
      const transparent = this.hasAttribute("transparent");
      const passthrough = this.hasAttribute("passthrough");
      this.transparent = transparent;
      this.passthroughEnabled = passthrough;
      if (transparent)
        this.style.opacity = "0";
      if (passthrough)
        this.style.pointerEvents = "none";
      if (masks) {
        masks.split(",").forEach((s) => this.maskSelectors.add(s.trim()));
      }
      try {
        const webviewId = await request("webviewTagInit", {
          hostWebviewId: window.__electrobunWebviewId,
          windowId: window.__electrobunWindowId,
          renderer,
          url,
          html,
          preload,
          partition,
          frame: {
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y
          },
          navigationRules: null,
          sandbox,
          transparent,
          passthrough
        });
        this.webviewId = webviewId;
        this.id = \`electrobun-webview-\${webviewId}\`;
        webviewRegistry[webviewId] = this;
        this.setupObservers();
        this.syncDimensions(true);
        requestAnimationFrame(() => {
          Object.values(webviewRegistry).forEach((webview) => {
            if (webview !== this && webview.webviewId !== null) {
              webview.syncDimensions(true);
            }
          });
        });
      } catch (err) {
        console.error("Failed to init webview:", err);
      }
    }
    setupObservers() {
      this.resizeObserver = new ResizeObserver(() => this.syncDimensions());
      this.resizeObserver.observe(this);
      this.positionCheckLoop = setInterval(() => this.syncDimensions(), 100);
    }
    syncDimensions(force = false) {
      if (this.webviewId === null)
        return;
      const rect = this.getBoundingClientRect();
      const newRect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
      if (newRect.width === 0 && newRect.height === 0) {
        return;
      }
      if (!force && newRect.x === this.lastRect.x && newRect.y === this.lastRect.y && newRect.width === this.lastRect.width && newRect.height === this.lastRect.height) {
        return;
      }
      this.lastRect = newRect;
      const masks = [];
      this.maskSelectors.forEach((selector) => {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            const mr = el.getBoundingClientRect();
            masks.push({
              x: mr.x - rect.x,
              y: mr.y - rect.y,
              width: mr.width,
              height: mr.height
            });
          });
        } catch (_e) {}
      });
      send("webviewTagResize", {
        id: this.webviewId,
        frame: newRect,
        masks: JSON.stringify(masks)
      });
    }
    loadURL(url) {
      if (this.webviewId === null)
        return;
      this.setAttribute("src", url);
      send("webviewTagUpdateSrc", { id: this.webviewId, url });
    }
    loadHTML(html) {
      if (this.webviewId === null)
        return;
      send("webviewTagUpdateHtml", { id: this.webviewId, html });
    }
    reload() {
      if (this.webviewId !== null)
        send("webviewTagReload", { id: this.webviewId });
    }
    goBack() {
      if (this.webviewId !== null)
        send("webviewTagGoBack", { id: this.webviewId });
    }
    goForward() {
      if (this.webviewId !== null)
        send("webviewTagGoForward", { id: this.webviewId });
    }
    async canGoBack() {
      if (this.webviewId === null)
        return false;
      return await request("webviewTagCanGoBack", {
        id: this.webviewId
      });
    }
    async canGoForward() {
      if (this.webviewId === null)
        return false;
      return await request("webviewTagCanGoForward", {
        id: this.webviewId
      });
    }
    toggleTransparent(value) {
      if (this.webviewId === null)
        return;
      this.transparent = value !== undefined ? value : !this.transparent;
      this.style.opacity = this.transparent ? "0" : "";
      send("webviewTagSetTransparent", {
        id: this.webviewId,
        transparent: this.transparent
      });
    }
    togglePassthrough(value) {
      if (this.webviewId === null)
        return;
      this.passthroughEnabled = value !== undefined ? value : !this.passthroughEnabled;
      this.style.pointerEvents = this.passthroughEnabled ? "none" : "";
      send("webviewTagSetPassthrough", {
        id: this.webviewId,
        enablePassthrough: this.passthroughEnabled
      });
    }
    toggleHidden(value) {
      if (this.webviewId === null)
        return;
      this.hidden = value !== undefined ? value : !this.hidden;
      send("webviewTagSetHidden", { id: this.webviewId, hidden: this.hidden });
    }
    addMaskSelector(selector) {
      this.maskSelectors.add(selector);
      this.syncDimensions(true);
    }
    removeMaskSelector(selector) {
      this.maskSelectors.delete(selector);
      this.syncDimensions(true);
    }
    setNavigationRules(rules) {
      if (this.webviewId !== null) {
        send("webviewTagSetNavigationRules", { id: this.webviewId, rules });
      }
    }
    findInPage(searchText, options) {
      if (this.webviewId === null)
        return;
      const forward = options?.forward !== false;
      const matchCase = options?.matchCase || false;
      send("webviewTagFindInPage", {
        id: this.webviewId,
        searchText,
        forward,
        matchCase
      });
    }
    stopFindInPage() {
      if (this.webviewId !== null)
        send("webviewTagStopFind", { id: this.webviewId });
    }
    openDevTools() {
      if (this.webviewId !== null)
        send("webviewTagOpenDevTools", { id: this.webviewId });
    }
    closeDevTools() {
      if (this.webviewId !== null)
        send("webviewTagCloseDevTools", { id: this.webviewId });
    }
    toggleDevTools() {
      if (this.webviewId !== null)
        send("webviewTagToggleDevTools", { id: this.webviewId });
    }
    on(event, listener) {
      if (!this._eventListeners[event])
        this._eventListeners[event] = [];
      this._eventListeners[event].push(listener);
    }
    off(event, listener) {
      if (!this._eventListeners[event])
        return;
      const idx = this._eventListeners[event].indexOf(listener);
      if (idx !== -1)
        this._eventListeners[event].splice(idx, 1);
    }
    emit(event, detail) {
      const listeners = this._eventListeners[event];
      if (listeners) {
        const customEvent = new CustomEvent(event, { detail });
        listeners.forEach((fn) => fn(customEvent));
      }
    }
    get src() {
      return this.getAttribute("src");
    }
    set src(value) {
      if (value) {
        this.setAttribute("src", value);
        if (this.webviewId !== null)
          this.loadURL(value);
      } else {
        this.removeAttribute("src");
      }
    }
    get html() {
      return this.getAttribute("html");
    }
    set html(value) {
      if (value) {
        this.setAttribute("html", value);
        if (this.webviewId !== null)
          this.loadHTML(value);
      } else {
        this.removeAttribute("html");
      }
    }
    get preload() {
      return this.getAttribute("preload");
    }
    set preload(value) {
      if (value)
        this.setAttribute("preload", value);
      else
        this.removeAttribute("preload");
    }
    get renderer() {
      return this.getAttribute("renderer") || "native";
    }
    set renderer(value) {
      this.setAttribute("renderer", value);
    }
    get sandbox() {
      return this.sandboxed;
    }
  }
  function initWebviewTag() {
    if (!customElements.get("electrobun-webview")) {
      customElements.define("electrobun-webview", ElectrobunWebviewTag);
    }
    const injectStyles = () => {
      const style = document.createElement("style");
      style.textContent = \`
electrobun-webview {
	display: block;
	width: 800px;
	height: 300px;
	background: #fff;
	background-repeat: no-repeat !important;
	overflow: hidden;
}
\`;
      if (document.head?.firstChild) {
        document.head.insertBefore(style, document.head.firstChild);
      } else if (document.head) {
        document.head.appendChild(style);
      }
    };
    if (document.head) {
      injectStyles();
    } else {
      document.addEventListener("DOMContentLoaded", injectStyles);
    }
  }

  // src/bun/preload/events.ts
  function emitWebviewEvent(eventName, detail) {
    setTimeout(() => {
      const bridge = window.__electrobunEventBridge || window.__electrobunInternalBridge;
      bridge?.postMessage(JSON.stringify({
        id: "webviewEvent",
        type: "message",
        payload: {
          id: window.__electrobunWebviewId,
          eventName,
          detail
        }
      }));
    });
  }
  function initLifecycleEvents() {
    window.addEventListener("load", () => {
      if (window === window.top) {
        emitWebviewEvent("dom-ready", document.location.href);
      }
    });
    window.addEventListener("popstate", () => {
      emitWebviewEvent("did-navigate-in-page", window.location.href);
    });
    window.addEventListener("hashchange", () => {
      emitWebviewEvent("did-navigate-in-page", window.location.href);
    });
  }
  var cmdKeyHeld = false;
  var cmdKeyTimestamp = 0;
  var CMD_KEY_THRESHOLD_MS = 500;
  function isCmdHeld() {
    if (cmdKeyHeld)
      return true;
    return Date.now() - cmdKeyTimestamp < CMD_KEY_THRESHOLD_MS && cmdKeyTimestamp > 0;
  }
  function initCmdClickHandling() {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Meta" || event.metaKey) {
        cmdKeyHeld = true;
        cmdKeyTimestamp = Date.now();
      }
    }, true);
    window.addEventListener("keyup", (event) => {
      if (event.key === "Meta") {
        cmdKeyHeld = false;
        cmdKeyTimestamp = Date.now();
      }
    }, true);
    window.addEventListener("blur", () => {
      cmdKeyHeld = false;
    });
    window.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey) {
        const anchor = event.target?.closest?.("a");
        if (anchor && anchor.href) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          emitWebviewEvent("new-window-open", JSON.stringify({
            url: anchor.href,
            isCmdClick: true,
            isSPANavigation: false
          }));
        }
      }
    }, true);
  }
  function initSPANavigationInterception() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function(state, title, url) {
      if (isCmdHeld() && url) {
        const resolvedUrl = new URL(String(url), window.location.href).href;
        emitWebviewEvent("new-window-open", JSON.stringify({
          url: resolvedUrl,
          isCmdClick: true,
          isSPANavigation: true
        }));
        return;
      }
      return originalPushState.apply(this, [state, title, url]);
    };
    history.replaceState = function(state, title, url) {
      if (isCmdHeld() && url) {
        const resolvedUrl = new URL(String(url), window.location.href).href;
        emitWebviewEvent("new-window-open", JSON.stringify({
          url: resolvedUrl,
          isCmdClick: true,
          isSPANavigation: true
        }));
        return;
      }
      return originalReplaceState.apply(this, [state, title, url]);
    };
  }
  function initOverscrollPrevention() {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.type = "text/css";
      style.appendChild(document.createTextNode("html, body { overscroll-behavior: none; }"));
      document.head.appendChild(style);
    });
  }

  // src/bun/preload/index.ts
  initEncryption().catch((err) => console.error("Failed to initialize encryption:", err));
  var internalMessageHandler = (msg) => {
    handleResponse(msg);
  };
  if (!window.__electrobun) {
    window.__electrobun = {
      receiveInternalMessageFromBun: internalMessageHandler,
      receiveMessageFromBun: (msg) => {
        console.log("receiveMessageFromBun (no handler):", msg);
      }
    };
  } else {
    window.__electrobun.receiveInternalMessageFromBun = internalMessageHandler;
    window.__electrobun.receiveMessageFromBun = (msg) => {
      console.log("receiveMessageFromBun (no handler):", msg);
    };
  }
  window.__electrobunSendToHost = (message) => {
    emitWebviewEvent("host-message", JSON.stringify(message));
  };
  initLifecycleEvents();
  initCmdClickHandling();
  initSPANavigationInterception();
  initOverscrollPrevention();
  initDragRegions();
  initWebviewTag();
})();
`, preloadScriptSandboxed = `(() => {
  // src/bun/preload/events.ts
  function emitWebviewEvent(eventName, detail) {
    setTimeout(() => {
      const bridge = window.__electrobunEventBridge || window.__electrobunInternalBridge;
      bridge?.postMessage(JSON.stringify({
        id: "webviewEvent",
        type: "message",
        payload: {
          id: window.__electrobunWebviewId,
          eventName,
          detail
        }
      }));
    });
  }
  function initLifecycleEvents() {
    window.addEventListener("load", () => {
      if (window === window.top) {
        emitWebviewEvent("dom-ready", document.location.href);
      }
    });
    window.addEventListener("popstate", () => {
      emitWebviewEvent("did-navigate-in-page", window.location.href);
    });
    window.addEventListener("hashchange", () => {
      emitWebviewEvent("did-navigate-in-page", window.location.href);
    });
  }
  var cmdKeyHeld = false;
  var cmdKeyTimestamp = 0;
  var CMD_KEY_THRESHOLD_MS = 500;
  function isCmdHeld() {
    if (cmdKeyHeld)
      return true;
    return Date.now() - cmdKeyTimestamp < CMD_KEY_THRESHOLD_MS && cmdKeyTimestamp > 0;
  }
  function initCmdClickHandling() {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Meta" || event.metaKey) {
        cmdKeyHeld = true;
        cmdKeyTimestamp = Date.now();
      }
    }, true);
    window.addEventListener("keyup", (event) => {
      if (event.key === "Meta") {
        cmdKeyHeld = false;
        cmdKeyTimestamp = Date.now();
      }
    }, true);
    window.addEventListener("blur", () => {
      cmdKeyHeld = false;
    });
    window.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey) {
        const anchor = event.target?.closest?.("a");
        if (anchor && anchor.href) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          emitWebviewEvent("new-window-open", JSON.stringify({
            url: anchor.href,
            isCmdClick: true,
            isSPANavigation: false
          }));
        }
      }
    }, true);
  }
  function initSPANavigationInterception() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function(state, title, url) {
      if (isCmdHeld() && url) {
        const resolvedUrl = new URL(String(url), window.location.href).href;
        emitWebviewEvent("new-window-open", JSON.stringify({
          url: resolvedUrl,
          isCmdClick: true,
          isSPANavigation: true
        }));
        return;
      }
      return originalPushState.apply(this, [state, title, url]);
    };
    history.replaceState = function(state, title, url) {
      if (isCmdHeld() && url) {
        const resolvedUrl = new URL(String(url), window.location.href).href;
        emitWebviewEvent("new-window-open", JSON.stringify({
          url: resolvedUrl,
          isCmdClick: true,
          isSPANavigation: true
        }));
        return;
      }
      return originalReplaceState.apply(this, [state, title, url]);
    };
  }
  function initOverscrollPrevention() {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.type = "text/css";
      style.appendChild(document.createTextNode("html, body { overscroll-behavior: none; }"));
      document.head.appendChild(style);
    });
  }

  // src/bun/preload/index-sandboxed.ts
  initLifecycleEvents();
  initCmdClickHandling();
  initSPANavigationInterception();
  initOverscrollPrevention();
})();
`;

// node_modules/electrobun/dist/api/bun/proc/native.ts
import { join as join4 } from "path";
import {
  dlopen,
  suffix,
  JSCallback,
  CString,
  ptr,
  FFIType,
  toArrayBuffer
} from "bun:ffi";
function storeMenuData(data) {
  const id = `menuData_${++menuDataCounter}`;
  menuDataRegistry.set(id, data);
  return id;
}
function getMenuData(id) {
  return menuDataRegistry.get(id);
}
function clearMenuData(id) {
  menuDataRegistry.delete(id);
}
function serializeMenuAction(action, data) {
  const dataId = storeMenuData(data);
  return `${ELECTROBUN_DELIMITER}${dataId}|${action}`;
}
function deserializeMenuAction(encodedAction) {
  let actualAction = encodedAction;
  let data = undefined;
  if (encodedAction.startsWith(ELECTROBUN_DELIMITER)) {
    const parts = encodedAction.split("|");
    if (parts.length >= 4) {
      const dataId = parts[2];
      actualAction = parts.slice(3).join("|");
      data = getMenuData(dataId);
      clearMenuData(dataId);
    }
  }
  return { action: actualAction, data };
}

class SessionCookies {
  partitionId;
  constructor(partitionId) {
    this.partitionId = partitionId;
  }
  get(filter) {
    const filterJson = JSON.stringify(filter || {});
    const result = native.symbols.sessionGetCookies(toCString(this.partitionId), toCString(filterJson));
    if (!result)
      return [];
    try {
      return JSON.parse(result.toString());
    } catch {
      return [];
    }
  }
  set(cookie) {
    const cookieJson = JSON.stringify(cookie);
    return native.symbols.sessionSetCookie(toCString(this.partitionId), toCString(cookieJson));
  }
  remove(url, name) {
    return native.symbols.sessionRemoveCookie(toCString(this.partitionId), toCString(url), toCString(name));
  }
  clear() {
    native.symbols.sessionClearCookies(toCString(this.partitionId));
  }
}

class SessionInstance {
  partition;
  cookies;
  constructor(partition) {
    this.partition = partition;
    this.cookies = new SessionCookies(partition);
  }
  clearStorageData(types = "all") {
    const typesArray = types === "all" ? ["all"] : types;
    native.symbols.sessionClearStorageData(toCString(this.partition), toCString(JSON.stringify(typesArray)));
  }
}
function toCString(jsString, addNullTerminator = true) {
  let appendWith = "";
  if (addNullTerminator && !jsString.endsWith("\x00")) {
    appendWith = "\x00";
  }
  const buff = Buffer.from(jsString + appendWith, "utf8");
  return ptr(buff);
}
var menuDataRegistry, menuDataCounter = 0, ELECTROBUN_DELIMITER = "|EB|", native, ffi, windowCloseCallback, windowMoveCallback, windowResizeCallback, windowFocusCallback, getMimeType, getHTMLForWebviewSync, urlOpenCallback, quitRequestedCallback, globalShortcutHandlers, globalShortcutCallback, GlobalShortcut, Screen, sessionCache, Session, webviewDecideNavigation, webviewEventHandler = (id, eventName, detail) => {
  const webview = BrowserView.getById(id);
  if (!webview) {
    console.error("[webviewEventHandler] No webview found for id:", id);
    return;
  }
  if (webview.hostWebviewId) {
    const hostWebview = BrowserView.getById(webview.hostWebviewId);
    if (!hostWebview) {
      console.error("[webviewEventHandler] No webview found for id:", id);
      return;
    }
    let js;
    if (eventName === "new-window-open" || eventName === "host-message") {
      js = `document.querySelector('#electrobun-webview-${id}').emit(${JSON.stringify(eventName)}, ${detail});`;
    } else {
      js = `document.querySelector('#electrobun-webview-${id}').emit(${JSON.stringify(eventName)}, ${JSON.stringify(detail)});`;
    }
    native.symbols.evaluateJavaScriptWithNoCompletion(hostWebview.ptr, toCString(js));
  }
  const eventMap = {
    "will-navigate": "willNavigate",
    "did-navigate": "didNavigate",
    "did-navigate-in-page": "didNavigateInPage",
    "did-commit-navigation": "didCommitNavigation",
    "dom-ready": "domReady",
    "new-window-open": "newWindowOpen",
    "host-message": "hostMessage",
    "download-started": "downloadStarted",
    "download-progress": "downloadProgress",
    "download-completed": "downloadCompleted",
    "download-failed": "downloadFailed",
    "load-started": "loadStarted",
    "load-committed": "loadCommitted",
    "load-finished": "loadFinished"
  };
  const mappedName = eventMap[eventName];
  const handler = mappedName ? eventEmitter_default.events.webview[mappedName] : undefined;
  if (!handler) {
    return { success: false };
  }
  let parsedDetail = detail;
  if (eventName === "new-window-open" || eventName === "host-message" || eventName === "download-started" || eventName === "download-progress" || eventName === "download-completed" || eventName === "download-failed") {
    try {
      parsedDetail = JSON.parse(detail);
    } catch (e) {
      console.error("[webviewEventHandler] Failed to parse JSON:", e);
      parsedDetail = detail;
    }
  }
  const event = handler({
    detail: parsedDetail
  });
  eventEmitter_default.emitEvent(event);
  eventEmitter_default.emitEvent(event, id);
}, webviewEventJSCallback, bunBridgePostmessageHandler, eventBridgeHandler, internalBridgeHandler, trayItemHandler, applicationMenuHandler, contextMenuHandler, internalRpcHandlers;
var init_native = __esm(async () => {
  init_eventEmitter();
  await __promiseAll([
    init_BrowserView(),
    init_Tray(),
    init_BrowserWindow()
  ]);
  menuDataRegistry = new Map;
  native = (() => {
    try {
      const nativeWrapperPath = join4(process.cwd(), `libNativeWrapper.${suffix}`);
      return dlopen(nativeWrapperPath, {
        createWindowWithFrameAndStyleFromWorker: {
          args: [
            FFIType.u32,
            FFIType.f64,
            FFIType.f64,
            FFIType.f64,
            FFIType.f64,
            FFIType.u32,
            FFIType.cstring,
            FFIType.bool,
            FFIType.function,
            FFIType.function,
            FFIType.function,
            FFIType.function
          ],
          returns: FFIType.ptr
        },
        setWindowTitle: {
          args: [
            FFIType.ptr,
            FFIType.cstring
          ],
          returns: FFIType.void
        },
        showWindow: {
          args: [
            FFIType.ptr
          ],
          returns: FFIType.void
        },
        closeWindow: {
          args: [
            FFIType.ptr
          ],
          returns: FFIType.void
        },
        minimizeWindow: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        restoreWindow: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        isWindowMinimized: {
          args: [FFIType.ptr],
          returns: FFIType.bool
        },
        maximizeWindow: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        unmaximizeWindow: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        isWindowMaximized: {
          args: [FFIType.ptr],
          returns: FFIType.bool
        },
        setWindowFullScreen: {
          args: [FFIType.ptr, FFIType.bool],
          returns: FFIType.void
        },
        isWindowFullScreen: {
          args: [FFIType.ptr],
          returns: FFIType.bool
        },
        setWindowAlwaysOnTop: {
          args: [FFIType.ptr, FFIType.bool],
          returns: FFIType.void
        },
        isWindowAlwaysOnTop: {
          args: [FFIType.ptr],
          returns: FFIType.bool
        },
        setWindowPosition: {
          args: [FFIType.ptr, FFIType.f64, FFIType.f64],
          returns: FFIType.void
        },
        setWindowSize: {
          args: [FFIType.ptr, FFIType.f64, FFIType.f64],
          returns: FFIType.void
        },
        setWindowFrame: {
          args: [FFIType.ptr, FFIType.f64, FFIType.f64, FFIType.f64, FFIType.f64],
          returns: FFIType.void
        },
        getWindowFrame: {
          args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
          returns: FFIType.void
        },
        initWebview: {
          args: [
            FFIType.u32,
            FFIType.ptr,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.f64,
            FFIType.f64,
            FFIType.f64,
            FFIType.f64,
            FFIType.bool,
            FFIType.cstring,
            FFIType.function,
            FFIType.function,
            FFIType.function,
            FFIType.function,
            FFIType.function,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.bool,
            FFIType.bool
          ],
          returns: FFIType.ptr
        },
        setNextWebviewFlags: {
          args: [
            FFIType.bool,
            FFIType.bool
          ],
          returns: FFIType.void
        },
        webviewCanGoBack: {
          args: [FFIType.ptr],
          returns: FFIType.bool
        },
        webviewCanGoForward: {
          args: [FFIType.ptr],
          returns: FFIType.bool
        },
        resizeWebview: {
          args: [
            FFIType.ptr,
            FFIType.f64,
            FFIType.f64,
            FFIType.f64,
            FFIType.f64,
            FFIType.cstring
          ],
          returns: FFIType.void
        },
        loadURLInWebView: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        loadHTMLInWebView: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        updatePreloadScriptToWebView: {
          args: [
            FFIType.ptr,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.bool
          ],
          returns: FFIType.void
        },
        webviewGoBack: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        webviewGoForward: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        webviewReload: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        webviewRemove: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        setWebviewHTMLContent: {
          args: [FFIType.u32, FFIType.cstring],
          returns: FFIType.void
        },
        startWindowMove: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        stopWindowMove: {
          args: [],
          returns: FFIType.void
        },
        webviewSetTransparent: {
          args: [FFIType.ptr, FFIType.bool],
          returns: FFIType.void
        },
        webviewSetPassthrough: {
          args: [FFIType.ptr, FFIType.bool],
          returns: FFIType.void
        },
        webviewSetHidden: {
          args: [FFIType.ptr, FFIType.bool],
          returns: FFIType.void
        },
        setWebviewNavigationRules: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        webviewFindInPage: {
          args: [FFIType.ptr, FFIType.cstring, FFIType.bool, FFIType.bool],
          returns: FFIType.void
        },
        webviewStopFind: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        evaluateJavaScriptWithNoCompletion: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        webviewOpenDevTools: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        webviewCloseDevTools: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        webviewToggleDevTools: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        createTray: {
          args: [
            FFIType.u32,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.bool,
            FFIType.u32,
            FFIType.u32,
            FFIType.function
          ],
          returns: FFIType.ptr
        },
        setTrayTitle: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        setTrayImage: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        setTrayMenu: {
          args: [FFIType.ptr, FFIType.cstring],
          returns: FFIType.void
        },
        removeTray: {
          args: [FFIType.ptr],
          returns: FFIType.void
        },
        setApplicationMenu: {
          args: [FFIType.cstring, FFIType.function],
          returns: FFIType.void
        },
        showContextMenu: {
          args: [FFIType.cstring, FFIType.function],
          returns: FFIType.void
        },
        moveToTrash: {
          args: [FFIType.cstring],
          returns: FFIType.bool
        },
        showItemInFolder: {
          args: [FFIType.cstring],
          returns: FFIType.void
        },
        openExternal: {
          args: [FFIType.cstring],
          returns: FFIType.bool
        },
        openPath: {
          args: [FFIType.cstring],
          returns: FFIType.bool
        },
        showNotification: {
          args: [
            FFIType.cstring,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.bool
          ],
          returns: FFIType.void
        },
        setGlobalShortcutCallback: {
          args: [FFIType.function],
          returns: FFIType.void
        },
        registerGlobalShortcut: {
          args: [FFIType.cstring],
          returns: FFIType.bool
        },
        unregisterGlobalShortcut: {
          args: [FFIType.cstring],
          returns: FFIType.bool
        },
        unregisterAllGlobalShortcuts: {
          args: [],
          returns: FFIType.void
        },
        isGlobalShortcutRegistered: {
          args: [FFIType.cstring],
          returns: FFIType.bool
        },
        getAllDisplays: {
          args: [],
          returns: FFIType.cstring
        },
        getPrimaryDisplay: {
          args: [],
          returns: FFIType.cstring
        },
        getCursorScreenPoint: {
          args: [],
          returns: FFIType.cstring
        },
        openFileDialog: {
          args: [
            FFIType.cstring,
            FFIType.cstring,
            FFIType.int,
            FFIType.int,
            FFIType.int
          ],
          returns: FFIType.cstring
        },
        showMessageBox: {
          args: [
            FFIType.cstring,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.cstring,
            FFIType.int,
            FFIType.int
          ],
          returns: FFIType.int
        },
        clipboardReadText: {
          args: [],
          returns: FFIType.cstring
        },
        clipboardWriteText: {
          args: [FFIType.cstring],
          returns: FFIType.void
        },
        clipboardReadImage: {
          args: [FFIType.ptr],
          returns: FFIType.ptr
        },
        clipboardWriteImage: {
          args: [FFIType.ptr, FFIType.u64],
          returns: FFIType.void
        },
        clipboardClear: {
          args: [],
          returns: FFIType.void
        },
        clipboardAvailableFormats: {
          args: [],
          returns: FFIType.cstring
        },
        sessionGetCookies: {
          args: [FFIType.cstring, FFIType.cstring],
          returns: FFIType.cstring
        },
        sessionSetCookie: {
          args: [FFIType.cstring, FFIType.cstring],
          returns: FFIType.bool
        },
        sessionRemoveCookie: {
          args: [FFIType.cstring, FFIType.cstring, FFIType.cstring],
          returns: FFIType.bool
        },
        sessionClearCookies: {
          args: [FFIType.cstring],
          returns: FFIType.void
        },
        sessionClearStorageData: {
          args: [FFIType.cstring, FFIType.cstring],
          returns: FFIType.void
        },
        setURLOpenHandler: {
          args: [FFIType.function],
          returns: FFIType.void
        },
        getWindowStyle: {
          args: [
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool,
            FFIType.bool
          ],
          returns: FFIType.u32
        },
        setJSUtils: {
          args: [
            FFIType.function,
            FFIType.function
          ],
          returns: FFIType.void
        },
        setWindowIcon: {
          args: [
            FFIType.ptr,
            FFIType.cstring
          ],
          returns: FFIType.void
        },
        killApp: {
          args: [],
          returns: FFIType.void
        },
        stopEventLoop: {
          args: [],
          returns: FFIType.void
        },
        waitForShutdownComplete: {
          args: [FFIType.i32],
          returns: FFIType.void
        },
        forceExit: {
          args: [FFIType.i32],
          returns: FFIType.void
        },
        setQuitRequestedHandler: {
          args: [FFIType.function],
          returns: FFIType.void
        },
        testFFI2: {
          args: [FFIType.function],
          returns: FFIType.void
        }
      });
    } catch (err) {
      console.log("FATAL Error opening native FFI:", err.message);
      console.log("This may be due to:");
      console.log("  - Missing libNativeWrapper.dll/so/dylib");
      console.log("  - Architecture mismatch (ARM64 vs x64)");
      console.log("  - Missing WebView2 or CEF dependencies");
      if (suffix === "so") {
        console.log("  - Missing system libraries (try: ldd ./libNativeWrapper.so)");
      }
      console.log("Check that the build process completed successfully for your architecture.");
      process.exit();
    }
  })();
  ffi = {
    request: {
      createWindow: (params) => {
        const {
          id,
          url: _url,
          title,
          frame: { x, y, width, height },
          styleMask: {
            Borderless,
            Titled,
            Closable,
            Miniaturizable,
            Resizable,
            UnifiedTitleAndToolbar,
            FullScreen,
            FullSizeContentView,
            UtilityWindow,
            DocModalWindow,
            NonactivatingPanel,
            HUDWindow
          },
          titleBarStyle,
          transparent
        } = params;
        const styleMask = native.symbols.getWindowStyle(Borderless, Titled, Closable, Miniaturizable, Resizable, UnifiedTitleAndToolbar, FullScreen, FullSizeContentView, UtilityWindow, DocModalWindow, NonactivatingPanel, HUDWindow);
        const windowPtr = native.symbols.createWindowWithFrameAndStyleFromWorker(id, x, y, width, height, styleMask, toCString(titleBarStyle), transparent, windowCloseCallback, windowMoveCallback, windowResizeCallback, windowFocusCallback);
        if (!windowPtr) {
          throw "Failed to create window";
        }
        native.symbols.setWindowTitle(windowPtr, toCString(title));
        native.symbols.showWindow(windowPtr);
        return windowPtr;
      },
      setTitle: (params) => {
        const { winId, title } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't add webview to window. window no longer exists`;
        }
        native.symbols.setWindowTitle(windowPtr, toCString(title));
      },
      closeWindow: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't close window. Window no longer exists`;
        }
        native.symbols.closeWindow(windowPtr);
      },
      focusWindow: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't focus window. Window no longer exists`;
        }
        native.symbols.showWindow(windowPtr);
      },
      minimizeWindow: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't minimize window. Window no longer exists`;
        }
        native.symbols.minimizeWindow(windowPtr);
      },
      restoreWindow: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't restore window. Window no longer exists`;
        }
        native.symbols.restoreWindow(windowPtr);
      },
      isWindowMinimized: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          return false;
        }
        return native.symbols.isWindowMinimized(windowPtr);
      },
      maximizeWindow: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't maximize window. Window no longer exists`;
        }
        native.symbols.maximizeWindow(windowPtr);
      },
      unmaximizeWindow: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't unmaximize window. Window no longer exists`;
        }
        native.symbols.unmaximizeWindow(windowPtr);
      },
      isWindowMaximized: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          return false;
        }
        return native.symbols.isWindowMaximized(windowPtr);
      },
      setWindowFullScreen: (params) => {
        const { winId, fullScreen } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't set fullscreen. Window no longer exists`;
        }
        native.symbols.setWindowFullScreen(windowPtr, fullScreen);
      },
      isWindowFullScreen: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          return false;
        }
        return native.symbols.isWindowFullScreen(windowPtr);
      },
      setWindowAlwaysOnTop: (params) => {
        const { winId, alwaysOnTop } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't set always on top. Window no longer exists`;
        }
        native.symbols.setWindowAlwaysOnTop(windowPtr, alwaysOnTop);
      },
      isWindowAlwaysOnTop: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          return false;
        }
        return native.symbols.isWindowAlwaysOnTop(windowPtr);
      },
      setWindowPosition: (params) => {
        const { winId, x, y } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't set window position. Window no longer exists`;
        }
        native.symbols.setWindowPosition(windowPtr, x, y);
      },
      setWindowSize: (params) => {
        const { winId, width, height } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't set window size. Window no longer exists`;
        }
        native.symbols.setWindowSize(windowPtr, width, height);
      },
      setWindowFrame: (params) => {
        const { winId, x, y, width, height } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          throw `Can't set window frame. Window no longer exists`;
        }
        native.symbols.setWindowFrame(windowPtr, x, y, width, height);
      },
      getWindowFrame: (params) => {
        const { winId } = params;
        const windowPtr = BrowserWindow.getById(winId)?.ptr;
        if (!windowPtr) {
          return { x: 0, y: 0, width: 0, height: 0 };
        }
        const xBuf = new Float64Array(1);
        const yBuf = new Float64Array(1);
        const widthBuf = new Float64Array(1);
        const heightBuf = new Float64Array(1);
        native.symbols.getWindowFrame(windowPtr, ptr(xBuf), ptr(yBuf), ptr(widthBuf), ptr(heightBuf));
        return {
          x: xBuf[0],
          y: yBuf[0],
          width: widthBuf[0],
          height: heightBuf[0]
        };
      },
      createWebview: (params) => {
        const {
          id,
          windowId,
          renderer,
          rpcPort: rpcPort2,
          secretKey,
          url,
          partition,
          preload,
          frame: { x, y, width, height },
          autoResize,
          sandbox,
          startTransparent,
          startPassthrough
        } = params;
        const parentWindow = BrowserWindow.getById(windowId);
        const windowPtr = parentWindow?.ptr;
        const transparent = parentWindow?.transparent ?? false;
        if (!windowPtr) {
          throw `Can't add webview to window. window no longer exists`;
        }
        let dynamicPreload;
        let selectedPreloadScript;
        if (sandbox) {
          dynamicPreload = `
window.__electrobunWebviewId = ${id};
window.__electrobunWindowId = ${windowId};
window.__electrobunEventBridge = window.__electrobunEventBridge || window.webkit?.messageHandlers?.eventBridge || window.eventBridge || window.chrome?.webview?.hostObjects?.eventBridge;
window.__electrobunInternalBridge = window.__electrobunInternalBridge || window.webkit?.messageHandlers?.internalBridge || window.internalBridge || window.chrome?.webview?.hostObjects?.internalBridge;
`;
          selectedPreloadScript = preloadScriptSandboxed;
        } else {
          dynamicPreload = `
window.__electrobunWebviewId = ${id};
window.__electrobunWindowId = ${windowId};
window.__electrobunRpcSocketPort = ${rpcPort2};
window.__electrobunSecretKeyBytes = [${secretKey}];
window.__electrobunEventBridge = window.__electrobunEventBridge || window.webkit?.messageHandlers?.eventBridge || window.eventBridge || window.chrome?.webview?.hostObjects?.eventBridge;
window.__electrobunInternalBridge = window.__electrobunInternalBridge || window.webkit?.messageHandlers?.internalBridge || window.internalBridge || window.chrome?.webview?.hostObjects?.internalBridge;
window.__electrobunBunBridge = window.__electrobunBunBridge || window.webkit?.messageHandlers?.bunBridge || window.bunBridge || window.chrome?.webview?.hostObjects?.bunBridge;
`;
          selectedPreloadScript = preloadScript;
        }
        const electrobunPreload = dynamicPreload + selectedPreloadScript;
        const customPreload = preload;
        native.symbols.setNextWebviewFlags(startTransparent, startPassthrough);
        const webviewPtr = native.symbols.initWebview(id, windowPtr, toCString(renderer), toCString(url || ""), x, y, width, height, autoResize, toCString(partition || "persist:default"), webviewDecideNavigation, webviewEventJSCallback, eventBridgeHandler, bunBridgePostmessageHandler, internalBridgeHandler, toCString(electrobunPreload), toCString(customPreload || ""), transparent, sandbox);
        if (!webviewPtr) {
          throw "Failed to create webview";
        }
        return webviewPtr;
      },
      evaluateJavascriptWithNoCompletion: (params) => {
        const { id, js } = params;
        const webview = BrowserView.getById(id);
        if (!webview?.ptr) {
          return;
        }
        native.symbols.evaluateJavaScriptWithNoCompletion(webview.ptr, toCString(js));
      },
      createTray: (params) => {
        const { id, title, image, template, width, height } = params;
        const trayPtr = native.symbols.createTray(id, toCString(title), toCString(image), template, width, height, trayItemHandler);
        if (!trayPtr) {
          throw "Failed to create tray";
        }
        return trayPtr;
      },
      setTrayTitle: (params) => {
        const { id, title } = params;
        const tray = Tray.getById(id);
        if (!tray)
          return;
        native.symbols.setTrayTitle(tray.ptr, toCString(title));
      },
      setTrayImage: (params) => {
        const { id, image } = params;
        const tray = Tray.getById(id);
        if (!tray)
          return;
        native.symbols.setTrayImage(tray.ptr, toCString(image));
      },
      setTrayMenu: (params) => {
        const { id, menuConfig } = params;
        const tray = Tray.getById(id);
        if (!tray)
          return;
        native.symbols.setTrayMenu(tray.ptr, toCString(menuConfig));
      },
      removeTray: (params) => {
        const { id } = params;
        const tray = Tray.getById(id);
        if (!tray) {
          throw `Can't remove tray. Tray no longer exists`;
        }
        native.symbols.removeTray(tray.ptr);
      },
      setApplicationMenu: (params) => {
        const { menuConfig } = params;
        native.symbols.setApplicationMenu(toCString(menuConfig), applicationMenuHandler);
      },
      showContextMenu: (params) => {
        const { menuConfig } = params;
        native.symbols.showContextMenu(toCString(menuConfig), contextMenuHandler);
      },
      moveToTrash: (params) => {
        const { path } = params;
        return native.symbols.moveToTrash(toCString(path));
      },
      showItemInFolder: (params) => {
        const { path } = params;
        native.symbols.showItemInFolder(toCString(path));
      },
      openExternal: (params) => {
        const { url } = params;
        return native.symbols.openExternal(toCString(url));
      },
      openPath: (params) => {
        const { path } = params;
        return native.symbols.openPath(toCString(path));
      },
      showNotification: (params) => {
        const { title, body = "", subtitle = "", silent = false } = params;
        native.symbols.showNotification(toCString(title), toCString(body), toCString(subtitle), silent);
      },
      openFileDialog: (params) => {
        const {
          startingFolder,
          allowedFileTypes,
          canChooseFiles,
          canChooseDirectory,
          allowsMultipleSelection
        } = params;
        const filePath = native.symbols.openFileDialog(toCString(startingFolder), toCString(allowedFileTypes), canChooseFiles ? 1 : 0, canChooseDirectory ? 1 : 0, allowsMultipleSelection ? 1 : 0);
        return filePath.toString();
      },
      showMessageBox: (params) => {
        const {
          type = "info",
          title = "",
          message = "",
          detail = "",
          buttons = ["OK"],
          defaultId = 0,
          cancelId = -1
        } = params;
        const buttonsStr = buttons.join(",");
        return native.symbols.showMessageBox(toCString(type), toCString(title), toCString(message), toCString(detail), toCString(buttonsStr), defaultId, cancelId);
      },
      clipboardReadText: () => {
        const result = native.symbols.clipboardReadText();
        if (!result)
          return null;
        return result.toString();
      },
      clipboardWriteText: (params) => {
        native.symbols.clipboardWriteText(toCString(params.text));
      },
      clipboardReadImage: () => {
        const sizeBuffer = new BigUint64Array(1);
        const dataPtr = native.symbols.clipboardReadImage(ptr(sizeBuffer));
        if (!dataPtr)
          return null;
        const size = Number(sizeBuffer[0]);
        if (size === 0)
          return null;
        const result = new Uint8Array(size);
        const sourceView = new Uint8Array(toArrayBuffer(dataPtr, 0, size));
        result.set(sourceView);
        return result;
      },
      clipboardWriteImage: (params) => {
        const { pngData } = params;
        native.symbols.clipboardWriteImage(ptr(pngData), BigInt(pngData.length));
      },
      clipboardClear: () => {
        native.symbols.clipboardClear();
      },
      clipboardAvailableFormats: () => {
        const result = native.symbols.clipboardAvailableFormats();
        if (!result)
          return [];
        const formatsStr = result.toString();
        if (!formatsStr)
          return [];
        return formatsStr.split(",").filter((f) => f.length > 0);
      }
    },
    internal: {
      storeMenuData,
      getMenuData,
      clearMenuData,
      serializeMenuAction,
      deserializeMenuAction
    }
  };
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception in worker:", err);
    native.symbols.stopEventLoop();
    native.symbols.waitForShutdownComplete(5000);
    native.symbols.forceExit(1);
  });
  process.on("unhandledRejection", (reason, _promise) => {
    console.error("Unhandled rejection in worker:", reason);
  });
  process.on("SIGINT", () => {
    console.log("[electrobun] Received SIGINT, running quit sequence...");
    const { quit: quit2 } = (init_Utils(), __toCommonJS(exports_Utils));
    quit2();
  });
  process.on("SIGTERM", () => {
    console.log("[electrobun] Received SIGTERM, running quit sequence...");
    const { quit: quit2 } = (init_Utils(), __toCommonJS(exports_Utils));
    quit2();
  });
  windowCloseCallback = new JSCallback((id) => {
    const handler = eventEmitter_default.events.window.close;
    const event = handler({
      id
    });
    eventEmitter_default.emitEvent(event, id);
    eventEmitter_default.emitEvent(event);
  }, {
    args: ["u32"],
    returns: "void",
    threadsafe: true
  });
  windowMoveCallback = new JSCallback((id, x, y) => {
    const handler = eventEmitter_default.events.window.move;
    const event = handler({
      id,
      x,
      y
    });
    eventEmitter_default.emitEvent(event);
    eventEmitter_default.emitEvent(event, id);
  }, {
    args: ["u32", "f64", "f64"],
    returns: "void",
    threadsafe: true
  });
  windowResizeCallback = new JSCallback((id, x, y, width, height) => {
    const handler = eventEmitter_default.events.window.resize;
    const event = handler({
      id,
      x,
      y,
      width,
      height
    });
    eventEmitter_default.emitEvent(event);
    eventEmitter_default.emitEvent(event, id);
  }, {
    args: ["u32", "f64", "f64", "f64", "f64"],
    returns: "void",
    threadsafe: true
  });
  windowFocusCallback = new JSCallback((id) => {
    const handler = eventEmitter_default.events.window.focus;
    const event = handler({
      id
    });
    eventEmitter_default.emitEvent(event);
    eventEmitter_default.emitEvent(event, id);
  }, {
    args: ["u32"],
    returns: "void",
    threadsafe: true
  });
  getMimeType = new JSCallback((filePath) => {
    const _filePath = new CString(filePath).toString();
    const mimeType = Bun.file(_filePath).type;
    return toCString(mimeType.split(";")[0]);
  }, {
    args: [FFIType.cstring],
    returns: FFIType.cstring
  });
  getHTMLForWebviewSync = new JSCallback((webviewId) => {
    const webview = BrowserView.getById(webviewId);
    return toCString(webview?.html || "");
  }, {
    args: [FFIType.u32],
    returns: FFIType.cstring
  });
  native.symbols.setJSUtils(getMimeType, getHTMLForWebviewSync);
  urlOpenCallback = new JSCallback((urlPtr) => {
    const url = new CString(urlPtr).toString();
    const handler = eventEmitter_default.events.app.openUrl;
    const event = handler({ url });
    eventEmitter_default.emitEvent(event);
  }, {
    args: [FFIType.cstring],
    returns: "void",
    threadsafe: true
  });
  if (process.platform === "darwin") {
    native.symbols.setURLOpenHandler(urlOpenCallback);
  }
  quitRequestedCallback = new JSCallback(() => {
    const { quit: quit2 } = (init_Utils(), __toCommonJS(exports_Utils));
    quit2();
  }, {
    args: [],
    returns: "void",
    threadsafe: true
  });
  native.symbols.setQuitRequestedHandler(quitRequestedCallback);
  globalShortcutHandlers = new Map;
  globalShortcutCallback = new JSCallback((acceleratorPtr) => {
    const accelerator = new CString(acceleratorPtr).toString();
    const handler = globalShortcutHandlers.get(accelerator);
    if (handler) {
      handler();
    }
  }, {
    args: [FFIType.cstring],
    returns: "void",
    threadsafe: true
  });
  native.symbols.setGlobalShortcutCallback(globalShortcutCallback);
  GlobalShortcut = {
    register: (accelerator, callback) => {
      if (globalShortcutHandlers.has(accelerator)) {
        return false;
      }
      const result = native.symbols.registerGlobalShortcut(toCString(accelerator));
      if (result) {
        globalShortcutHandlers.set(accelerator, callback);
      }
      return result;
    },
    unregister: (accelerator) => {
      const result = native.symbols.unregisterGlobalShortcut(toCString(accelerator));
      if (result) {
        globalShortcutHandlers.delete(accelerator);
      }
      return result;
    },
    unregisterAll: () => {
      native.symbols.unregisterAllGlobalShortcuts();
      globalShortcutHandlers.clear();
    },
    isRegistered: (accelerator) => {
      return native.symbols.isGlobalShortcutRegistered(toCString(accelerator));
    }
  };
  Screen = {
    getPrimaryDisplay: () => {
      const jsonStr = native.symbols.getPrimaryDisplay();
      if (!jsonStr) {
        return {
          id: 0,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          workArea: { x: 0, y: 0, width: 0, height: 0 },
          scaleFactor: 1,
          isPrimary: true
        };
      }
      try {
        return JSON.parse(jsonStr.toString());
      } catch {
        return {
          id: 0,
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          workArea: { x: 0, y: 0, width: 0, height: 0 },
          scaleFactor: 1,
          isPrimary: true
        };
      }
    },
    getAllDisplays: () => {
      const jsonStr = native.symbols.getAllDisplays();
      if (!jsonStr) {
        return [];
      }
      try {
        return JSON.parse(jsonStr.toString());
      } catch {
        return [];
      }
    },
    getCursorScreenPoint: () => {
      const jsonStr = native.symbols.getCursorScreenPoint();
      if (!jsonStr) {
        return { x: 0, y: 0 };
      }
      try {
        return JSON.parse(jsonStr.toString());
      } catch {
        return { x: 0, y: 0 };
      }
    }
  };
  sessionCache = new Map;
  Session = {
    fromPartition: (partition) => {
      let session = sessionCache.get(partition);
      if (!session) {
        session = new SessionInstance(partition);
        sessionCache.set(partition, session);
      }
      return session;
    },
    get defaultSession() {
      return Session.fromPartition("persist:default");
    }
  };
  webviewDecideNavigation = new JSCallback((_webviewId, _url) => {
    return true;
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.u32,
    threadsafe: true
  });
  webviewEventJSCallback = new JSCallback((id, _eventName, _detail) => {
    let eventName = "";
    let detail = "";
    try {
      eventName = new CString(_eventName).toString();
      detail = new CString(_detail).toString();
    } catch (err) {
      console.error("[webviewEventJSCallback] Error converting strings:", err);
      console.error("[webviewEventJSCallback] Raw values:", {
        _eventName,
        _detail
      });
      return;
    }
    webviewEventHandler(id, eventName, detail);
  }, {
    args: [FFIType.u32, FFIType.cstring, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  bunBridgePostmessageHandler = new JSCallback((id, msg) => {
    try {
      const msgStr = new CString(msg);
      if (!msgStr.length) {
        return;
      }
      const msgJson = JSON.parse(msgStr.toString());
      const webview = BrowserView.getById(id);
      if (!webview)
        return;
      webview.rpcHandler?.(msgJson);
    } catch (err) {
      console.error("error sending message to bun: ", err);
      console.error("msgString: ", new CString(msg));
    }
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  eventBridgeHandler = new JSCallback((_id, msg) => {
    try {
      const message = new CString(msg);
      const jsonMessage = JSON.parse(message.toString());
      if (jsonMessage.id === "webviewEvent") {
        const { payload } = jsonMessage;
        webviewEventHandler(payload.id, payload.eventName, payload.detail);
      }
    } catch (err) {
      console.error("error in eventBridgeHandler: ", err);
    }
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  internalBridgeHandler = new JSCallback((_id, msg) => {
    try {
      const batchMessage = new CString(msg);
      const jsonBatch = JSON.parse(batchMessage.toString());
      if (jsonBatch.id === "webviewEvent") {
        const { payload } = jsonBatch;
        webviewEventHandler(payload.id, payload.eventName, payload.detail);
        return;
      }
      jsonBatch.forEach((msgStr) => {
        const msgJson = JSON.parse(msgStr);
        if (msgJson.type === "message") {
          const handler = internalRpcHandlers.message[msgJson.id];
          handler?.(msgJson.payload);
        } else if (msgJson.type === "request") {
          const hostWebview = BrowserView.getById(msgJson.hostWebviewId);
          const handler = internalRpcHandlers.request[msgJson.method];
          const payload = handler?.(msgJson.params);
          const resultObj = {
            type: "response",
            id: msgJson.id,
            success: true,
            payload
          };
          if (!hostWebview) {
            console.log("--->>> internal request in bun: NO HOST WEBVIEW FOUND");
            return;
          }
          hostWebview.sendInternalMessageViaExecute(resultObj);
        }
      });
    } catch (err) {
      console.error("error in internalBridgeHandler: ", err);
    }
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  trayItemHandler = new JSCallback((id, action) => {
    const actionString = (new CString(action).toString() || "").trim();
    const { action: actualAction, data } = deserializeMenuAction(actionString);
    const event = eventEmitter_default.events.tray.trayClicked({
      id,
      action: actualAction,
      data
    });
    eventEmitter_default.emitEvent(event);
    eventEmitter_default.emitEvent(event, id);
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  applicationMenuHandler = new JSCallback((id, action) => {
    const actionString = new CString(action).toString();
    const { action: actualAction, data } = deserializeMenuAction(actionString);
    const event = eventEmitter_default.events.app.applicationMenuClicked({
      id,
      action: actualAction,
      data
    });
    eventEmitter_default.emitEvent(event);
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  contextMenuHandler = new JSCallback((_id, action) => {
    const actionString = new CString(action).toString();
    const { action: actualAction, data } = deserializeMenuAction(actionString);
    const event = eventEmitter_default.events.app.contextMenuClicked({
      action: actualAction,
      data
    });
    eventEmitter_default.emitEvent(event);
  }, {
    args: [FFIType.u32, FFIType.cstring],
    returns: FFIType.void,
    threadsafe: true
  });
  internalRpcHandlers = {
    request: {
      webviewTagInit: (params) => {
        const {
          hostWebviewId,
          windowId,
          renderer,
          html,
          preload,
          partition,
          frame,
          navigationRules,
          sandbox,
          transparent,
          passthrough
        } = params;
        const url = !params.url && !html ? "https://electrobun.dev" : params.url;
        const webviewForTag = new BrowserView({
          url,
          html,
          preload,
          partition,
          frame,
          hostWebviewId,
          autoResize: false,
          windowId,
          renderer,
          navigationRules,
          sandbox,
          startTransparent: transparent,
          startPassthrough: passthrough
        });
        return webviewForTag.id;
      },
      webviewTagCanGoBack: (params) => {
        const { id } = params;
        const webviewPtr = BrowserView.getById(id)?.ptr;
        if (!webviewPtr) {
          console.error("no webview ptr");
          return false;
        }
        return native.symbols.webviewCanGoBack(webviewPtr);
      },
      webviewTagCanGoForward: (params) => {
        const { id } = params;
        const webviewPtr = BrowserView.getById(id)?.ptr;
        if (!webviewPtr) {
          console.error("no webview ptr");
          return false;
        }
        return native.symbols.webviewCanGoForward(webviewPtr);
      }
    },
    message: {
      webviewTagResize: (params) => {
        const browserView = BrowserView.getById(params.id);
        const webviewPtr = browserView?.ptr;
        if (!webviewPtr) {
          console.log("[Bun] ERROR: webviewTagResize - no webview ptr found for id:", params.id);
          return;
        }
        const { x, y, width, height } = params.frame;
        native.symbols.resizeWebview(webviewPtr, x, y, width, height, toCString(params.masks));
      },
      webviewTagUpdateSrc: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagUpdateSrc: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.loadURLInWebView(webview.ptr, toCString(params.url));
      },
      webviewTagUpdateHtml: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagUpdateHtml: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.setWebviewHTMLContent(webview.id, toCString(params.html));
        webview.loadHTML(params.html);
        webview.html = params.html;
      },
      webviewTagUpdatePreload: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagUpdatePreload: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.updatePreloadScriptToWebView(webview.ptr, toCString("electrobun_custom_preload_script"), toCString(params.preload), true);
      },
      webviewTagGoBack: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagGoBack: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewGoBack(webview.ptr);
      },
      webviewTagGoForward: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagGoForward: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewGoForward(webview.ptr);
      },
      webviewTagReload: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagReload: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewReload(webview.ptr);
      },
      webviewTagRemove: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagRemove: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewRemove(webview.ptr);
      },
      startWindowMove: (params) => {
        const window = BrowserWindow.getById(params.id);
        if (!window)
          return;
        native.symbols.startWindowMove(window.ptr);
      },
      stopWindowMove: (_params) => {
        native.symbols.stopWindowMove();
      },
      webviewTagSetTransparent: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagSetTransparent: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewSetTransparent(webview.ptr, params.transparent);
      },
      webviewTagSetPassthrough: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagSetPassthrough: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewSetPassthrough(webview.ptr, params.enablePassthrough);
      },
      webviewTagSetHidden: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagSetHidden: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewSetHidden(webview.ptr, params.hidden);
      },
      webviewTagSetNavigationRules: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagSetNavigationRules: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        const rulesJson = JSON.stringify(params.rules);
        native.symbols.setWebviewNavigationRules(webview.ptr, toCString(rulesJson));
      },
      webviewTagFindInPage: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagFindInPage: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewFindInPage(webview.ptr, toCString(params.searchText), params.forward, params.matchCase);
      },
      webviewTagStopFind: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagStopFind: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewStopFind(webview.ptr);
      },
      webviewTagOpenDevTools: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagOpenDevTools: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewOpenDevTools(webview.ptr);
      },
      webviewTagCloseDevTools: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagCloseDevTools: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewCloseDevTools(webview.ptr);
      },
      webviewTagToggleDevTools: (params) => {
        const webview = BrowserView.getById(params.id);
        if (!webview || !webview.ptr) {
          console.error(`webviewTagToggleDevTools: BrowserView not found or has no ptr for id ${params.id}`);
          return;
        }
        native.symbols.webviewToggleDevTools(webview.ptr);
      },
      webviewEvent: (params) => {
        console.log("-----------------+webviewEvent", params);
      }
    }
  };
});

// node_modules/electrobun/dist/api/bun/core/BrowserWindow.ts
class BrowserWindow {
  id = nextWindowId++;
  ptr;
  title = "Electrobun";
  state = "creating";
  url = null;
  html = null;
  preload = null;
  renderer = "native";
  transparent = false;
  navigationRules = null;
  sandbox = false;
  frame = {
    x: 0,
    y: 0,
    width: 800,
    height: 600
  };
  webviewId;
  constructor(options = defaultOptions2) {
    this.title = options.title || "New Window";
    this.frame = options.frame ? { ...defaultOptions2.frame, ...options.frame } : { ...defaultOptions2.frame };
    this.url = options.url || null;
    this.html = options.html || null;
    this.preload = options.preload || null;
    this.renderer = options.renderer || defaultOptions2.renderer;
    this.transparent = options.transparent ?? false;
    this.navigationRules = options.navigationRules || null;
    this.sandbox = options.sandbox ?? false;
    this.init(options);
  }
  init({
    rpc,
    styleMask,
    titleBarStyle,
    transparent
  }) {
    this.ptr = ffi.request.createWindow({
      id: this.id,
      title: this.title,
      url: this.url || "",
      frame: {
        width: this.frame.width,
        height: this.frame.height,
        x: this.frame.x,
        y: this.frame.y
      },
      styleMask: {
        Borderless: false,
        Titled: true,
        Closable: true,
        Miniaturizable: true,
        Resizable: true,
        UnifiedTitleAndToolbar: false,
        FullScreen: false,
        FullSizeContentView: false,
        UtilityWindow: false,
        DocModalWindow: false,
        NonactivatingPanel: false,
        HUDWindow: false,
        ...styleMask || {},
        ...titleBarStyle === "hiddenInset" ? {
          Titled: true,
          FullSizeContentView: true
        } : {},
        ...titleBarStyle === "hidden" ? {
          Titled: false,
          FullSizeContentView: true
        } : {}
      },
      titleBarStyle: titleBarStyle || "default",
      transparent: transparent ?? false
    });
    BrowserWindowMap[this.id] = this;
    const webview = new BrowserView({
      url: this.url,
      html: this.html,
      preload: this.preload,
      renderer: this.renderer,
      frame: {
        x: 0,
        y: 0,
        width: this.frame.width,
        height: this.frame.height
      },
      rpc,
      windowId: this.id,
      navigationRules: this.navigationRules,
      sandbox: this.sandbox
    });
    console.log("setting webviewId: ", webview.id);
    this.webviewId = webview.id;
  }
  get webview() {
    return BrowserView.getById(this.webviewId);
  }
  static getById(id) {
    return BrowserWindowMap[id];
  }
  setTitle(title) {
    this.title = title;
    return ffi.request.setTitle({ winId: this.id, title });
  }
  close() {
    return ffi.request.closeWindow({ winId: this.id });
  }
  focus() {
    return ffi.request.focusWindow({ winId: this.id });
  }
  show() {
    return ffi.request.focusWindow({ winId: this.id });
  }
  minimize() {
    return ffi.request.minimizeWindow({ winId: this.id });
  }
  unminimize() {
    return ffi.request.restoreWindow({ winId: this.id });
  }
  isMinimized() {
    return ffi.request.isWindowMinimized({ winId: this.id });
  }
  maximize() {
    return ffi.request.maximizeWindow({ winId: this.id });
  }
  unmaximize() {
    return ffi.request.unmaximizeWindow({ winId: this.id });
  }
  isMaximized() {
    return ffi.request.isWindowMaximized({ winId: this.id });
  }
  setFullScreen(fullScreen) {
    return ffi.request.setWindowFullScreen({ winId: this.id, fullScreen });
  }
  isFullScreen() {
    return ffi.request.isWindowFullScreen({ winId: this.id });
  }
  setAlwaysOnTop(alwaysOnTop) {
    return ffi.request.setWindowAlwaysOnTop({ winId: this.id, alwaysOnTop });
  }
  isAlwaysOnTop() {
    return ffi.request.isWindowAlwaysOnTop({ winId: this.id });
  }
  setPosition(x, y) {
    this.frame.x = x;
    this.frame.y = y;
    return ffi.request.setWindowPosition({ winId: this.id, x, y });
  }
  setSize(width, height) {
    this.frame.width = width;
    this.frame.height = height;
    return ffi.request.setWindowSize({ winId: this.id, width, height });
  }
  setFrame(x, y, width, height) {
    this.frame = { x, y, width, height };
    return ffi.request.setWindowFrame({ winId: this.id, x, y, width, height });
  }
  getFrame() {
    const frame = ffi.request.getWindowFrame({ winId: this.id });
    this.frame = frame;
    return frame;
  }
  getPosition() {
    const frame = this.getFrame();
    return { x: frame.x, y: frame.y };
  }
  getSize() {
    const frame = this.getFrame();
    return { width: frame.width, height: frame.height };
  }
  on(name, handler) {
    const specificName = `${name}-${this.id}`;
    eventEmitter_default.on(specificName, handler);
  }
}
var buildConfig3, nextWindowId = 1, defaultOptions2, BrowserWindowMap;
var init_BrowserWindow = __esm(async () => {
  init_eventEmitter();
  init_BuildConfig();
  await __promiseAll([
    init_native(),
    init_BrowserView(),
    init_Utils()
  ]);
  buildConfig3 = await BuildConfig.get();
  defaultOptions2 = {
    title: "Electrobun",
    frame: {
      x: 0,
      y: 0,
      width: 800,
      height: 600
    },
    url: "https://electrobun.dev",
    html: null,
    preload: null,
    renderer: buildConfig3.defaultRenderer,
    titleBarStyle: "default",
    transparent: false,
    navigationRules: null,
    sandbox: false
  };
  BrowserWindowMap = {};
  eventEmitter_default.on("close", (event) => {
    const windowId = event.data.id;
    delete BrowserWindowMap[windowId];
    for (const view of BrowserView.getAll()) {
      if (view.windowId === windowId) {
        view.remove();
      }
    }
    const exitOnLastWindowClosed = buildConfig3.runtime?.exitOnLastWindowClosed ?? true;
    if (exitOnLastWindowClosed && Object.keys(BrowserWindowMap).length === 0) {
      quit();
    }
  });
});

// node_modules/electrobun/dist/api/bun/index.ts
init_eventEmitter();
await __promiseAll([
  init_BrowserWindow(),
  init_BrowserView(),
  init_Tray()
]);

// node_modules/electrobun/dist/api/bun/core/ApplicationMenu.ts
init_eventEmitter();
await init_native();
var exports_ApplicationMenu = {};
__export(exports_ApplicationMenu, {
  setApplicationMenu: () => setApplicationMenu,
  on: () => on
});

// node_modules/electrobun/dist/api/bun/core/menuRoles.ts
var roleLabelMap = {
  about: "About",
  quit: "Quit",
  hide: "Hide",
  hideOthers: "Hide Others",
  showAll: "Show All",
  minimize: "Minimize",
  zoom: "Zoom",
  close: "Close",
  bringAllToFront: "Bring All To Front",
  cycleThroughWindows: "Cycle Through Windows",
  enterFullScreen: "Enter Full Screen",
  exitFullScreen: "Exit Full Screen",
  toggleFullScreen: "Toggle Full Screen",
  undo: "Undo",
  redo: "Redo",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  pasteAndMatchStyle: "Paste and Match Style",
  delete: "Delete",
  selectAll: "Select All",
  startSpeaking: "Start Speaking",
  stopSpeaking: "Stop Speaking",
  showHelp: "Show Help",
  moveForward: "Move Forward",
  moveBackward: "Move Backward",
  moveLeft: "Move Left",
  moveRight: "Move Right",
  moveUp: "Move Up",
  moveDown: "Move Down",
  moveWordForward: "Move Word Forward",
  moveWordBackward: "Move Word Backward",
  moveWordLeft: "Move Word Left",
  moveWordRight: "Move Word Right",
  moveToBeginningOfLine: "Move to Beginning of Line",
  moveToEndOfLine: "Move to End of Line",
  moveToLeftEndOfLine: "Move to Left End of Line",
  moveToRightEndOfLine: "Move to Right End of Line",
  moveToBeginningOfParagraph: "Move to Beginning of Paragraph",
  moveToEndOfParagraph: "Move to End of Paragraph",
  moveParagraphForward: "Move Paragraph Forward",
  moveParagraphBackward: "Move Paragraph Backward",
  moveToBeginningOfDocument: "Move to Beginning of Document",
  moveToEndOfDocument: "Move to End of Document",
  moveForwardAndModifySelection: "Move Forward and Modify Selection",
  moveBackwardAndModifySelection: "Move Backward and Modify Selection",
  moveLeftAndModifySelection: "Move Left and Modify Selection",
  moveRightAndModifySelection: "Move Right and Modify Selection",
  moveUpAndModifySelection: "Move Up and Modify Selection",
  moveDownAndModifySelection: "Move Down and Modify Selection",
  moveWordForwardAndModifySelection: "Move Word Forward and Modify Selection",
  moveWordBackwardAndModifySelection: "Move Word Backward and Modify Selection",
  moveWordLeftAndModifySelection: "Move Word Left and Modify Selection",
  moveWordRightAndModifySelection: "Move Word Right and Modify Selection",
  moveToBeginningOfLineAndModifySelection: "Move to Beginning of Line and Modify Selection",
  moveToEndOfLineAndModifySelection: "Move to End of Line and Modify Selection",
  moveToLeftEndOfLineAndModifySelection: "Move to Left End of Line and Modify Selection",
  moveToRightEndOfLineAndModifySelection: "Move to Right End of Line and Modify Selection",
  moveToBeginningOfParagraphAndModifySelection: "Move to Beginning of Paragraph and Modify Selection",
  moveToEndOfParagraphAndModifySelection: "Move to End of Paragraph and Modify Selection",
  moveParagraphForwardAndModifySelection: "Move Paragraph Forward and Modify Selection",
  moveParagraphBackwardAndModifySelection: "Move Paragraph Backward and Modify Selection",
  moveToBeginningOfDocumentAndModifySelection: "Move to Beginning of Document and Modify Selection",
  moveToEndOfDocumentAndModifySelection: "Move to End of Document and Modify Selection",
  pageUp: "Page Up",
  pageDown: "Page Down",
  pageUpAndModifySelection: "Page Up and Modify Selection",
  pageDownAndModifySelection: "Page Down and Modify Selection",
  scrollLineUp: "Scroll Line Up",
  scrollLineDown: "Scroll Line Down",
  scrollPageUp: "Scroll Page Up",
  scrollPageDown: "Scroll Page Down",
  scrollToBeginningOfDocument: "Scroll to Beginning of Document",
  scrollToEndOfDocument: "Scroll to End of Document",
  centerSelectionInVisibleArea: "Center Selection in Visible Area",
  deleteBackward: "Delete Backward",
  deleteForward: "Delete Forward",
  deleteBackwardByDecomposingPreviousCharacter: "Delete Backward by Decomposing Previous Character",
  deleteWordBackward: "Delete Word Backward",
  deleteWordForward: "Delete Word Forward",
  deleteToBeginningOfLine: "Delete to Beginning of Line",
  deleteToEndOfLine: "Delete to End of Line",
  deleteToBeginningOfParagraph: "Delete to Beginning of Paragraph",
  deleteToEndOfParagraph: "Delete to End of Paragraph",
  selectWord: "Select Word",
  selectLine: "Select Line",
  selectParagraph: "Select Paragraph",
  selectToMark: "Select to Mark",
  setMark: "Set Mark",
  swapWithMark: "Swap with Mark",
  deleteToMark: "Delete to Mark",
  capitalizeWord: "Capitalize Word",
  uppercaseWord: "Uppercase Word",
  lowercaseWord: "Lowercase Word",
  transpose: "Transpose",
  transposeWords: "Transpose Words",
  insertNewline: "Insert Newline",
  insertLineBreak: "Insert Line Break",
  insertParagraphSeparator: "Insert Paragraph Separator",
  insertTab: "Insert Tab",
  insertBacktab: "Insert Backtab",
  insertTabIgnoringFieldEditor: "Insert Tab Ignoring Field Editor",
  insertNewlineIgnoringFieldEditor: "Insert Newline Ignoring Field Editor",
  yank: "Yank",
  yankAndSelect: "Yank and Select",
  complete: "Complete",
  cancelOperation: "Cancel Operation",
  indent: "Indent"
};

// node_modules/electrobun/dist/api/bun/core/ApplicationMenu.ts
var setApplicationMenu = (menu) => {
  const menuWithDefaults = menuConfigWithDefaults2(menu);
  ffi.request.setApplicationMenu({
    menuConfig: JSON.stringify(menuWithDefaults)
  });
};
var on = (name, handler) => {
  const specificName = `${name}`;
  eventEmitter_default.on(specificName, handler);
};
var menuConfigWithDefaults2 = (menu) => {
  return menu.map((item) => {
    if (item.type === "divider" || item.type === "separator") {
      return { type: "divider" };
    } else {
      const menuItem = item;
      const actionWithDataId = ffi.internal.serializeMenuAction(menuItem.action || "", menuItem.data);
      return {
        label: menuItem.label || roleLabelMap[menuItem.role] || "",
        type: menuItem.type || "normal",
        ...menuItem.role ? { role: menuItem.role } : { action: actionWithDataId },
        enabled: menuItem.enabled === false ? false : true,
        checked: Boolean(menuItem.checked),
        hidden: Boolean(menuItem.hidden),
        tooltip: menuItem.tooltip || undefined,
        accelerator: menuItem.accelerator || undefined,
        ...menuItem.submenu ? { submenu: menuConfigWithDefaults2(menuItem.submenu) } : {}
      };
    }
  });
};

// node_modules/electrobun/dist/api/bun/core/ContextMenu.ts
init_eventEmitter();
await init_native();
var exports_ContextMenu = {};
__export(exports_ContextMenu, {
  showContextMenu: () => showContextMenu,
  on: () => on2
});
var showContextMenu = (menu) => {
  const menuWithDefaults = menuConfigWithDefaults3(menu);
  ffi.request.showContextMenu({
    menuConfig: JSON.stringify(menuWithDefaults)
  });
};
var on2 = (name, handler) => {
  const specificName = `${name}`;
  eventEmitter_default.on(specificName, handler);
};
var menuConfigWithDefaults3 = (menu) => {
  return menu.map((item) => {
    if (item.type === "divider" || item.type === "separator") {
      return { type: "divider" };
    } else {
      const menuItem = item;
      const actionWithDataId = ffi.internal.serializeMenuAction(menuItem.action || "", menuItem.data);
      return {
        label: menuItem.label || roleLabelMap[menuItem.role] || "",
        type: menuItem.type || "normal",
        ...menuItem.role ? { role: menuItem.role } : { action: actionWithDataId },
        enabled: menuItem.enabled === false ? false : true,
        checked: Boolean(menuItem.checked),
        hidden: Boolean(menuItem.hidden),
        tooltip: menuItem.tooltip || undefined,
        ...menuItem.accelerator ? { accelerator: menuItem.accelerator } : {},
        ...menuItem.submenu ? { submenu: menuConfigWithDefaults3(menuItem.submenu) } : {}
      };
    }
  });
};

// node_modules/electrobun/dist/api/bun/index.ts
init_Paths();
init_BuildConfig();
await __promiseAll([
  init_Updater(),
  init_Utils(),
  init_Socket(),
  init_native()
]);
var Electrobun = {
  BrowserWindow,
  BrowserView,
  Tray,
  Updater,
  Utils: exports_Utils,
  ApplicationMenu: exports_ApplicationMenu,
  ContextMenu: exports_ContextMenu,
  GlobalShortcut,
  Screen,
  Session,
  BuildConfig,
  events: eventEmitter_default,
  PATHS: exports_Paths,
  Socket: exports_Socket
};
var bun_default = Electrobun;

// src/bun/index.ts
import { join as join5 } from "path";
import { mkdirSync as mkdirSync2, existsSync } from "fs";

// src/bun/db/index.ts
import { Database as Database2 } from "bun:sqlite";

// node_modules/drizzle-orm/bun-sqlite/driver.js
import { Database } from "bun:sqlite";

// node_modules/drizzle-orm/entity.js
var entityKind = Symbol.for("drizzle:entityKind");
var hasOwnEntityKind = Symbol.for("drizzle:hasOwnEntityKind");
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(`Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`);
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}

// node_modules/drizzle-orm/logger.js
class ConsoleLogWriter {
  static [entityKind] = "ConsoleLogWriter";
  write(message) {
    console.log(message);
  }
}

class DefaultLogger {
  static [entityKind] = "DefaultLogger";
  writer;
  constructor(config) {
    this.writer = config?.writer ?? new ConsoleLogWriter;
  }
  logQuery(query, params) {
    const stringifiedParams = params.map((p) => {
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    });
    const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
    this.writer.write(`Query: ${query}${paramsStr}`);
  }
}

class NoopLogger {
  static [entityKind] = "NoopLogger";
  logQuery() {}
}

// node_modules/drizzle-orm/table.utils.js
var TableName = Symbol.for("drizzle:Name");

// node_modules/drizzle-orm/table.js
var Schema = Symbol.for("drizzle:Schema");
var Columns = Symbol.for("drizzle:Columns");
var ExtraConfigColumns = Symbol.for("drizzle:ExtraConfigColumns");
var OriginalName = Symbol.for("drizzle:OriginalName");
var BaseName = Symbol.for("drizzle:BaseName");
var IsAlias = Symbol.for("drizzle:IsAlias");
var ExtraConfigBuilder = Symbol.for("drizzle:ExtraConfigBuilder");
var IsDrizzleTable = Symbol.for("drizzle:IsDrizzleTable");

class Table {
  static [entityKind] = "Table";
  static Symbol = {
    Name: TableName,
    Schema,
    OriginalName,
    Columns,
    ExtraConfigColumns,
    BaseName,
    IsAlias,
    ExtraConfigBuilder
  };
  [TableName];
  [OriginalName];
  [Schema];
  [Columns];
  [ExtraConfigColumns];
  [BaseName];
  [IsAlias] = false;
  [IsDrizzleTable] = true;
  [ExtraConfigBuilder] = undefined;
  constructor(name, schema, baseName) {
    this[TableName] = this[OriginalName] = name;
    this[Schema] = schema;
    this[BaseName] = baseName;
  }
}
function getTableName(table) {
  return table[TableName];
}
function getTableUniqueName(table) {
  return `${table[Schema] ?? "public"}.${table[TableName]}`;
}

// node_modules/drizzle-orm/column.js
class Column {
  constructor(table, config) {
    this.table = table;
    this.config = config;
    this.name = config.name;
    this.keyAsName = config.keyAsName;
    this.notNull = config.notNull;
    this.default = config.default;
    this.defaultFn = config.defaultFn;
    this.onUpdateFn = config.onUpdateFn;
    this.hasDefault = config.hasDefault;
    this.primary = config.primaryKey;
    this.isUnique = config.isUnique;
    this.uniqueName = config.uniqueName;
    this.uniqueType = config.uniqueType;
    this.dataType = config.dataType;
    this.columnType = config.columnType;
    this.generated = config.generated;
    this.generatedIdentity = config.generatedIdentity;
  }
  static [entityKind] = "Column";
  name;
  keyAsName;
  primary;
  notNull;
  default;
  defaultFn;
  onUpdateFn;
  hasDefault;
  isUnique;
  uniqueName;
  uniqueType;
  dataType;
  columnType;
  enumValues = undefined;
  generated = undefined;
  generatedIdentity = undefined;
  config;
  mapFromDriverValue(value) {
    return value;
  }
  mapToDriverValue(value) {
    return value;
  }
  shouldDisableInsert() {
    return this.config.generated !== undefined && this.config.generated.type !== "byDefault";
  }
}

// node_modules/drizzle-orm/column-builder.js
class ColumnBuilder {
  static [entityKind] = "ColumnBuilder";
  config;
  constructor(name, dataType, columnType) {
    this.config = {
      name,
      keyAsName: name === "",
      notNull: false,
      default: undefined,
      hasDefault: false,
      primaryKey: false,
      isUnique: false,
      uniqueName: undefined,
      uniqueType: undefined,
      dataType,
      columnType,
      generated: undefined
    };
  }
  $type() {
    return this;
  }
  notNull() {
    this.config.notNull = true;
    return this;
  }
  default(value) {
    this.config.default = value;
    this.config.hasDefault = true;
    return this;
  }
  $defaultFn(fn) {
    this.config.defaultFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  $default = this.$defaultFn;
  $onUpdateFn(fn) {
    this.config.onUpdateFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  $onUpdate = this.$onUpdateFn;
  primaryKey() {
    this.config.primaryKey = true;
    this.config.notNull = true;
    return this;
  }
  setName(name) {
    if (this.config.name !== "")
      return;
    this.config.name = name;
  }
}

// node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}

// node_modules/drizzle-orm/pg-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}

// node_modules/drizzle-orm/pg-core/columns/common.js
class PgColumn extends Column {
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "PgColumn";
}

class ExtraConfigColumn extends PgColumn {
  static [entityKind] = "ExtraConfigColumn";
  getSQLType() {
    return this.getSQLType();
  }
  indexConfig = {
    order: this.config.order ?? "asc",
    nulls: this.config.nulls ?? "last",
    opClass: this.config.opClass
  };
  defaultConfig = {
    order: "asc",
    nulls: "last",
    opClass: undefined
  };
  asc() {
    this.indexConfig.order = "asc";
    return this;
  }
  desc() {
    this.indexConfig.order = "desc";
    return this;
  }
  nullsFirst() {
    this.indexConfig.nulls = "first";
    return this;
  }
  nullsLast() {
    this.indexConfig.nulls = "last";
    return this;
  }
  op(opClass) {
    this.indexConfig.opClass = opClass;
    return this;
  }
}

// node_modules/drizzle-orm/pg-core/columns/enum.js
class PgEnumObjectColumn extends PgColumn {
  static [entityKind] = "PgEnumObjectColumn";
  enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
}
var isPgEnumSym = Symbol.for("drizzle:isPgEnum");
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
class PgEnumColumn extends PgColumn {
  static [entityKind] = "PgEnumColumn";
  enum = this.config.enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
}

// node_modules/drizzle-orm/subquery.js
class Subquery {
  static [entityKind] = "Subquery";
  constructor(sql, fields, alias, isWith = false, usedTables = []) {
    this._ = {
      brand: "Subquery",
      sql,
      selectedFields: fields,
      alias,
      isWith,
      usedTables
    };
  }
}

class WithSubquery extends Subquery {
  static [entityKind] = "WithSubquery";
}

// node_modules/drizzle-orm/version.js
var version = "0.45.1";

// node_modules/drizzle-orm/tracing.js
var otel;
var rawTracer;
var tracer = {
  startActiveSpan(name, fn) {
    if (!otel) {
      return fn();
    }
    if (!rawTracer) {
      rawTracer = otel.trace.getTracer("drizzle-orm", version);
    }
    return iife((otel2, rawTracer2) => rawTracer2.startActiveSpan(name, (span) => {
      try {
        return fn(span);
      } catch (e) {
        span.setStatus({
          code: otel2.SpanStatusCode.ERROR,
          message: e instanceof Error ? e.message : "Unknown error"
        });
        throw e;
      } finally {
        span.end();
      }
    }), otel, rawTracer);
  }
};

// node_modules/drizzle-orm/view-common.js
var ViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");

// node_modules/drizzle-orm/sql/sql.js
function isSQLWrapper(value) {
  return value !== null && value !== undefined && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}

class StringChunk {
  static [entityKind] = "StringChunk";
  value;
  constructor(value) {
    this.value = Array.isArray(value) ? value : [value];
  }
  getSQL() {
    return new SQL([this]);
  }
}

class SQL {
  constructor(queryChunks) {
    this.queryChunks = queryChunks;
    for (const chunk of queryChunks) {
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        this.usedTables.push(schemaName === undefined ? chunk[Table.Symbol.Name] : schemaName + "." + chunk[Table.Symbol.Name]);
      }
    }
  }
  static [entityKind] = "SQL";
  decoder = noopDecoder;
  shouldInlineParams = false;
  usedTables = [];
  append(query) {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }
  toQuery(config) {
    return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
      const query = this.buildQueryFromSourceParams(this.queryChunks, config);
      span?.setAttributes({
        "drizzle.query.text": query.sql,
        "drizzle.query.params": JSON.stringify(query.params)
      });
      return query;
    });
  }
  buildQueryFromSourceParams(chunks, _config) {
    const config = Object.assign({}, _config, {
      inlineParams: _config.inlineParams || this.shouldInlineParams,
      paramStartIndex: _config.paramStartIndex || { value: 0 }
    });
    const {
      casing,
      escapeName,
      escapeParam,
      prepareTyping,
      inlineParams,
      paramStartIndex
    } = config;
    return mergeQueries(chunks.map((chunk) => {
      if (is(chunk, StringChunk)) {
        return { sql: chunk.value.join(""), params: [] };
      }
      if (is(chunk, Name)) {
        return { sql: escapeName(chunk.value), params: [] };
      }
      if (chunk === undefined) {
        return { sql: "", params: [] };
      }
      if (Array.isArray(chunk)) {
        const result = [new StringChunk("(")];
        for (const [i, p] of chunk.entries()) {
          result.push(p);
          if (i < chunk.length - 1) {
            result.push(new StringChunk(", "));
          }
        }
        result.push(new StringChunk(")"));
        return this.buildQueryFromSourceParams(result, config);
      }
      if (is(chunk, SQL)) {
        return this.buildQueryFromSourceParams(chunk.queryChunks, {
          ...config,
          inlineParams: inlineParams || chunk.shouldInlineParams
        });
      }
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        const tableName = chunk[Table.Symbol.Name];
        return {
          sql: schemaName === undefined || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
          params: []
        };
      }
      if (is(chunk, Column)) {
        const columnName = casing.getColumnCasing(chunk);
        if (_config.invokeSource === "indexes") {
          return { sql: escapeName(columnName), params: [] };
        }
        const schemaName = chunk.table[Table.Symbol.Schema];
        return {
          sql: chunk.table[IsAlias] || schemaName === undefined ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
          params: []
        };
      }
      if (is(chunk, View)) {
        const schemaName = chunk[ViewBaseConfig].schema;
        const viewName = chunk[ViewBaseConfig].name;
        return {
          sql: schemaName === undefined || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
          params: []
        };
      }
      if (is(chunk, Param)) {
        if (is(chunk.value, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
        if (is(mappedValue, SQL)) {
          return this.buildQueryFromSourceParams([mappedValue], config);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(mappedValue, config), params: [] };
        }
        let typings = ["none"];
        if (prepareTyping) {
          typings = [prepareTyping(chunk.encoder)];
        }
        return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
      }
      if (is(chunk, Placeholder)) {
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }
      if (is(chunk, SQL.Aliased) && chunk.fieldAlias !== undefined) {
        return { sql: escapeName(chunk.fieldAlias), params: [] };
      }
      if (is(chunk, Subquery)) {
        if (chunk._.isWith) {
          return { sql: escapeName(chunk._.alias), params: [] };
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk._.sql,
          new StringChunk(") "),
          new Name(chunk._.alias)
        ], config);
      }
      if (isPgEnum(chunk)) {
        if (chunk.schema) {
          return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
        }
        return { sql: escapeName(chunk.enumName), params: [] };
      }
      if (isSQLWrapper(chunk)) {
        if (chunk.shouldOmitSQLParens?.()) {
          return this.buildQueryFromSourceParams([chunk.getSQL()], config);
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk.getSQL(),
          new StringChunk(")")
        ], config);
      }
      if (inlineParams) {
        return { sql: this.mapInlineParam(chunk, config), params: [] };
      }
      return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
    }));
  }
  mapInlineParam(chunk, { escapeString }) {
    if (chunk === null) {
      return "null";
    }
    if (typeof chunk === "number" || typeof chunk === "boolean") {
      return chunk.toString();
    }
    if (typeof chunk === "string") {
      return escapeString(chunk);
    }
    if (typeof chunk === "object") {
      const mappedValueAsString = chunk.toString();
      if (mappedValueAsString === "[object Object]") {
        return escapeString(JSON.stringify(chunk));
      }
      return escapeString(mappedValueAsString);
    }
    throw new Error("Unexpected param value: " + chunk);
  }
  getSQL() {
    return this;
  }
  as(alias) {
    if (alias === undefined) {
      return this;
    }
    return new SQL.Aliased(this, alias);
  }
  mapWith(decoder) {
    this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
    return this;
  }
  inlineParams() {
    this.shouldInlineParams = true;
    return this;
  }
  if(condition) {
    return condition ? this : undefined;
  }
}

class Name {
  constructor(value) {
    this.value = value;
  }
  static [entityKind] = "Name";
  brand;
  getSQL() {
    return new SQL([this]);
  }
}
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
var noopDecoder = {
  mapFromDriverValue: (value) => value
};
var noopEncoder = {
  mapToDriverValue: (value) => value
};
var noopMapper = {
  ...noopDecoder,
  ...noopEncoder
};

class Param {
  constructor(value, encoder = noopEncoder) {
    this.value = value;
    this.encoder = encoder;
  }
  static [entityKind] = "Param";
  brand;
  getSQL() {
    return new SQL([this]);
  }
}
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
((sql2) => {
  function empty() {
    return new SQL([]);
  }
  sql2.empty = empty;
  function fromList(list) {
    return new SQL(list);
  }
  sql2.fromList = fromList;
  function raw(str) {
    return new SQL([new StringChunk(str)]);
  }
  sql2.raw = raw;
  function join5(chunks, separator) {
    const result = [];
    for (const [i, chunk] of chunks.entries()) {
      if (i > 0 && separator !== undefined) {
        result.push(separator);
      }
      result.push(chunk);
    }
    return new SQL(result);
  }
  sql2.join = join5;
  function identifier(value) {
    return new Name(value);
  }
  sql2.identifier = identifier;
  function placeholder2(name2) {
    return new Placeholder(name2);
  }
  sql2.placeholder = placeholder2;
  function param2(value, encoder) {
    return new Param(value, encoder);
  }
  sql2.param = param2;
})(sql || (sql = {}));
((SQL2) => {

  class Aliased {
    constructor(sql2, fieldAlias) {
      this.sql = sql2;
      this.fieldAlias = fieldAlias;
    }
    static [entityKind] = "SQL.Aliased";
    isSelectionField = false;
    getSQL() {
      return this.sql;
    }
    clone() {
      return new Aliased(this.sql, this.fieldAlias);
    }
  }
  SQL2.Aliased = Aliased;
})(SQL || (SQL = {}));

class Placeholder {
  constructor(name2) {
    this.name = name2;
  }
  static [entityKind] = "Placeholder";
  getSQL() {
    return new SQL([this]);
  }
}
function fillPlaceholders(params, values) {
  return params.map((p) => {
    if (is(p, Placeholder)) {
      if (!(p.name in values)) {
        throw new Error(`No value for placeholder "${p.name}" was provided`);
      }
      return values[p.name];
    }
    if (is(p, Param) && is(p.value, Placeholder)) {
      if (!(p.value.name in values)) {
        throw new Error(`No value for placeholder "${p.value.name}" was provided`);
      }
      return p.encoder.mapToDriverValue(values[p.value.name]);
    }
    return p;
  });
}
var IsDrizzleView = Symbol.for("drizzle:IsDrizzleView");

class View {
  static [entityKind] = "View";
  [ViewBaseConfig];
  [IsDrizzleView] = true;
  constructor({ name: name2, schema, selectedFields, query }) {
    this[ViewBaseConfig] = {
      name: name2,
      originalName: name2,
      schema,
      selectedFields,
      query,
      isExisting: !query,
      isAlias: false
    };
  }
  getSQL() {
    return new SQL([this]);
  }
}
Column.prototype.getSQL = function() {
  return new SQL([this]);
};
Table.prototype.getSQL = function() {
  return new SQL([this]);
};
Subquery.prototype.getSQL = function() {
  return new SQL([this]);
};

// node_modules/drizzle-orm/utils.js
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce((result2, { path, field }, columnIndex) => {
    let decoder;
    if (is(field, Column)) {
      decoder = field;
    } else if (is(field, SQL)) {
      decoder = field.decoder;
    } else if (is(field, Subquery)) {
      decoder = field._.sql.decoder;
    } else {
      decoder = field.sql.decoder;
    }
    let node = result2;
    for (const [pathChunkIndex, pathChunk] of path.entries()) {
      if (pathChunkIndex < path.length - 1) {
        if (!(pathChunk in node)) {
          node[pathChunk] = {};
        }
        node = node[pathChunk];
      } else {
        const rawValue = row[columnIndex];
        const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
        if (joinsNotNullableMap && is(field, Column) && path.length === 2) {
          const objectName = path[0];
          if (!(objectName in nullifyMap)) {
            nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
          } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
            nullifyMap[objectName] = false;
          }
        }
      }
    }
    return result2;
  }, {});
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name, field]) => {
    if (typeof name !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name] : [name];
    if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased) || is(field, Subquery)) {
      result.push({ path: newPath, field });
    } else if (is(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index, key] of leftKeys.entries()) {
    if (key !== rightKeys[index]) {
      return false;
    }
  }
  return true;
}
function mapUpdateSet(table, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => {
    if (is(value, SQL) || is(value, Column)) {
      return [key, value];
    } else {
      return [key, new Param(value, table[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name === "constructor")
        continue;
      Object.defineProperty(baseClass.prototype, name, Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null));
    }
  }
}
function getTableColumns(table) {
  return table[Table.Symbol.Columns];
}
function getTableLikeName(table) {
  return is(table, Subquery) ? table._.alias : is(table, View) ? table[ViewBaseConfig].name : is(table, SQL) ? undefined : table[Table.Symbol.IsAlias] ? table[Table.Symbol.Name] : table[Table.Symbol.BaseName];
}
function getColumnNameAndConfig(a, b) {
  return {
    name: typeof a === "string" && a.length > 0 ? a : "",
    config: typeof a === "object" ? a : b
  };
}
function isConfig(data) {
  if (typeof data !== "object" || data === null)
    return false;
  if (data.constructor.name !== "Object")
    return false;
  if ("logger" in data) {
    const type = typeof data["logger"];
    if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined")
      return false;
    return true;
  }
  if ("schema" in data) {
    const type = typeof data["schema"];
    if (type !== "object" && type !== "undefined")
      return false;
    return true;
  }
  if ("casing" in data) {
    const type = typeof data["casing"];
    if (type !== "string" && type !== "undefined")
      return false;
    return true;
  }
  if ("mode" in data) {
    if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== undefined)
      return false;
    return true;
  }
  if ("connection" in data) {
    const type = typeof data["connection"];
    if (type !== "string" && type !== "object" && type !== "undefined")
      return false;
    return true;
  }
  if ("client" in data) {
    const type = typeof data["client"];
    if (type !== "object" && type !== "function" && type !== "undefined")
      return false;
    return true;
  }
  if (Object.keys(data).length === 0)
    return true;
  return false;
}
var textDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder;

// node_modules/drizzle-orm/pg-core/table.js
var InlineForeignKeys = Symbol.for("drizzle:PgInlineForeignKeys");
var EnableRLS = Symbol.for("drizzle:EnableRLS");

class PgTable extends Table {
  static [entityKind] = "PgTable";
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys,
    EnableRLS
  });
  [InlineForeignKeys] = [];
  [EnableRLS] = false;
  [Table.Symbol.ExtraConfigBuilder] = undefined;
  [Table.Symbol.ExtraConfigColumns] = {};
}

// node_modules/drizzle-orm/pg-core/primary-keys.js
class PrimaryKeyBuilder {
  static [entityKind] = "PgPrimaryKeyBuilder";
  columns;
  name;
  constructor(columns, name) {
    this.columns = columns;
    this.name = name;
  }
  build(table) {
    return new PrimaryKey(table, this.columns, this.name);
  }
}

class PrimaryKey {
  constructor(table, columns, name) {
    this.table = table;
    this.columns = columns;
    this.name = name;
  }
  static [entityKind] = "PgPrimaryKey";
  columns;
  name;
  getName() {
    return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
  }
}

// node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
var eq = (left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
};
var ne = (left, right) => {
  return sql`${left} <> ${bindIfParam(right, left)}`;
};
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter((c) => c !== undefined);
  if (conditions.length === 0) {
    return;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
function not(condition) {
  return sql`not ${condition}`;
}
var gt = (left, right) => {
  return sql`${left} > ${bindIfParam(right, left)}`;
};
var gte = (left, right) => {
  return sql`${left} >= ${bindIfParam(right, left)}`;
};
var lt = (left, right) => {
  return sql`${left} < ${bindIfParam(right, left)}`;
};
var lte = (left, right) => {
  return sql`${left} <= ${bindIfParam(right, left)}`;
};
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
function notInArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}
function isNotNull(value) {
  return sql`${value} is not null`;
}
function exists(subquery) {
  return sql`exists ${subquery}`;
}
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
function between(column, min, max) {
  return sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(max, column)}`;
}
function notBetween(column, min, max) {
  return sql`${column} not between ${bindIfParam(min, column)} and ${bindIfParam(max, column)}`;
}
function like(column, value) {
  return sql`${column} like ${value}`;
}
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}

// node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}

// node_modules/drizzle-orm/relations.js
class Relation {
  constructor(sourceTable, referencedTable, relationName) {
    this.sourceTable = sourceTable;
    this.referencedTable = referencedTable;
    this.relationName = relationName;
    this.referencedTableName = referencedTable[Table.Symbol.Name];
  }
  static [entityKind] = "Relation";
  referencedTableName;
  fieldName;
}

class Relations {
  constructor(table, config) {
    this.table = table;
    this.config = config;
  }
  static [entityKind] = "Relations";
}

class One extends Relation {
  constructor(sourceTable, referencedTable, config, isNullable) {
    super(sourceTable, referencedTable, config?.relationName);
    this.config = config;
    this.isNullable = isNullable;
  }
  static [entityKind] = "One";
  withFieldName(fieldName) {
    const relation = new One(this.sourceTable, this.referencedTable, this.config, this.isNullable);
    relation.fieldName = fieldName;
    return relation;
  }
}

class Many extends Relation {
  constructor(sourceTable, referencedTable, config) {
    super(sourceTable, referencedTable, config?.relationName);
    this.config = config;
  }
  static [entityKind] = "Many";
  withFieldName(fieldName) {
    const relation = new Many(this.sourceTable, this.referencedTable, this.config);
    relation.fieldName = fieldName;
    return relation;
  }
}
function getOperators() {
  return {
    and,
    between,
    eq,
    exists,
    gt,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(value[Table.Symbol.Columns])) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(configHelpers(value.table));
      let primaryKey;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey) {
            tableConfig.primaryKey.push(...primaryKey);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
function createOne(sourceTable) {
  return function one(table, config) {
    return new One(sourceTable, table, config, config?.fields.reduce((res, f) => res && f.notNull, true) ?? false);
  };
}
function createMany(sourceTable) {
  return function many(referencedTable, config) {
    return new Many(sourceTable, referencedTable, config);
  };
}
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(`Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`);
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(`Table "${sourceTable[Table.Symbol.Name]}" not found in schema`);
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(referencedTableConfig.relations)) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(`There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`) : new Error(`There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`);
  }
  if (reverseRelations[0] && is(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(`There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`);
}
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is(relation, One) ? subRows && mapRelationalRow(tablesConfig, tablesConfig[selectionItem.relationTableTsKey], subRows, selectionItem.selection, mapColumnValue) : subRows.map((subRow) => mapRelationalRow(tablesConfig, tablesConfig[selectionItem.relationTableTsKey], subRow, selectionItem.selection, mapColumnValue));
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
    }
  }
  return result;
}

// node_modules/drizzle-orm/alias.js
class ColumnAliasProxyHandler {
  constructor(table) {
    this.table = table;
  }
  static [entityKind] = "ColumnAliasProxyHandler";
  get(columnObj, prop) {
    if (prop === "table") {
      return this.table;
    }
    return columnObj[prop];
  }
}

class TableAliasProxyHandler {
  constructor(alias, replaceOriginalName) {
    this.alias = alias;
    this.replaceOriginalName = replaceOriginalName;
  }
  static [entityKind] = "TableAliasProxyHandler";
  get(target, prop) {
    if (prop === Table.Symbol.IsAlias) {
      return true;
    }
    if (prop === Table.Symbol.Name) {
      return this.alias;
    }
    if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
      return this.alias;
    }
    if (prop === ViewBaseConfig) {
      return {
        ...target[ViewBaseConfig],
        name: this.alias,
        isAlias: true
      };
    }
    if (prop === Table.Symbol.Columns) {
      const columns = target[Table.Symbol.Columns];
      if (!columns) {
        return columns;
      }
      const proxiedColumns = {};
      Object.keys(columns).map((key) => {
        proxiedColumns[key] = new Proxy(columns[key], new ColumnAliasProxyHandler(new Proxy(target, this)));
      });
      return proxiedColumns;
    }
    const value = target[prop];
    if (is(value, Column)) {
      return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
    }
    return value;
  }
}
function aliasedTable(table, tableAlias) {
  return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
}
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(column, new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false))));
}
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}

// node_modules/drizzle-orm/selection-proxy.js
class SelectionProxyHandler {
  static [entityKind] = "SelectionProxyHandler";
  config;
  constructor(config) {
    this.config = { ...config };
  }
  get(subquery, prop) {
    if (prop === "_") {
      return {
        ...subquery["_"],
        selectedFields: new Proxy(subquery._.selectedFields, this)
      };
    }
    if (prop === ViewBaseConfig) {
      return {
        ...subquery[ViewBaseConfig],
        selectedFields: new Proxy(subquery[ViewBaseConfig].selectedFields, this)
      };
    }
    if (typeof prop === "symbol") {
      return subquery[prop];
    }
    const columns = is(subquery, Subquery) ? subquery._.selectedFields : is(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
    const value = columns[prop];
    if (is(value, SQL.Aliased)) {
      if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
        return value.sql;
      }
      const newValue = value.clone();
      newValue.isSelectionField = true;
      return newValue;
    }
    if (is(value, SQL)) {
      if (this.config.sqlBehavior === "sql") {
        return value;
      }
      throw new Error(`You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`);
    }
    if (is(value, Column)) {
      if (this.config.alias) {
        return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(value.table, new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false))));
      }
      return value;
    }
    if (typeof value !== "object" || value === null) {
      return value;
    }
    return new Proxy(value, new SelectionProxyHandler(this.config));
  }
}

// node_modules/drizzle-orm/query-promise.js
class QueryPromise {
  static [entityKind] = "QueryPromise";
  [Symbol.toStringTag] = "QueryPromise";
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }
  finally(onFinally) {
    return this.then((value) => {
      onFinally?.();
      return value;
    }, (reason) => {
      onFinally?.();
      throw reason;
    });
  }
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

// node_modules/drizzle-orm/sqlite-core/foreign-keys.js
class ForeignKeyBuilder {
  static [entityKind] = "SQLiteForeignKeyBuilder";
  reference;
  _onUpdate;
  _onDelete;
  constructor(config, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action;
    return this;
  }
  build(table) {
    return new ForeignKey(table, this);
  }
}

class ForeignKey {
  constructor(table, builder) {
    this.table = table;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "SQLiteForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
}

// node_modules/drizzle-orm/sqlite-core/unique-constraint.js
function uniqueKeyName2(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}

// node_modules/drizzle-orm/sqlite-core/columns/common.js
class SQLiteColumnBuilder extends ColumnBuilder {
  static [entityKind] = "SQLiteColumnBuilder";
  foreignKeyConfigs = [];
  references(ref, actions = {}) {
    this.foreignKeyConfigs.push({ ref, actions });
    return this;
  }
  unique(name) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    return this;
  }
  generatedAlwaysAs(as, config) {
    this.config.generated = {
      as,
      type: "always",
      mode: config?.mode ?? "virtual"
    };
    return this;
  }
  buildForeignKeys(column, table) {
    return this.foreignKeyConfigs.map(({ ref, actions }) => {
      return ((ref2, actions2) => {
        const builder = new ForeignKeyBuilder(() => {
          const foreignColumn = ref2();
          return { columns: [column], foreignColumns: [foreignColumn] };
        });
        if (actions2.onUpdate) {
          builder.onUpdate(actions2.onUpdate);
        }
        if (actions2.onDelete) {
          builder.onDelete(actions2.onDelete);
        }
        return builder.build(table);
      })(ref, actions);
    });
  }
}

class SQLiteColumn extends Column {
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName2(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "SQLiteColumn";
}

// node_modules/drizzle-orm/sqlite-core/columns/blob.js
class SQLiteBigIntBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteBigInt");
  }
  build(table) {
    return new SQLiteBigInt(table, this.config);
  }
}

class SQLiteBigInt extends SQLiteColumn {
  static [entityKind] = "SQLiteBigInt";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
      return BigInt(buf.toString("utf8"));
    }
    return BigInt(textDecoder.decode(value));
  }
  mapToDriverValue(value) {
    return Buffer.from(value.toString());
  }
}

class SQLiteBlobJsonBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBlobJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteBlobJson");
  }
  build(table) {
    return new SQLiteBlobJson(table, this.config);
  }
}

class SQLiteBlobJson extends SQLiteColumn {
  static [entityKind] = "SQLiteBlobJson";
  getSQLType() {
    return "blob";
  }
  mapFromDriverValue(value) {
    if (typeof Buffer !== "undefined" && Buffer.from) {
      const buf = Buffer.isBuffer(value) ? value : value instanceof ArrayBuffer ? Buffer.from(value) : value.buffer ? Buffer.from(value.buffer, value.byteOffset, value.byteLength) : Buffer.from(value);
      return JSON.parse(buf.toString("utf8"));
    }
    return JSON.parse(textDecoder.decode(value));
  }
  mapToDriverValue(value) {
    return Buffer.from(JSON.stringify(value));
  }
}

class SQLiteBlobBufferBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBlobBufferBuilder";
  constructor(name) {
    super(name, "buffer", "SQLiteBlobBuffer");
  }
  build(table) {
    return new SQLiteBlobBuffer(table, this.config);
  }
}

class SQLiteBlobBuffer extends SQLiteColumn {
  static [entityKind] = "SQLiteBlobBuffer";
  mapFromDriverValue(value) {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    return Buffer.from(value);
  }
  getSQLType() {
    return "blob";
  }
}
function blob(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "json") {
    return new SQLiteBlobJsonBuilder(name);
  }
  if (config?.mode === "bigint") {
    return new SQLiteBigIntBuilder(name);
  }
  return new SQLiteBlobBufferBuilder(name);
}

// node_modules/drizzle-orm/sqlite-core/columns/custom.js
class SQLiteCustomColumnBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteCustomColumnBuilder";
  constructor(name, fieldConfig, customTypeParams) {
    super(name, "custom", "SQLiteCustomColumn");
    this.config.fieldConfig = fieldConfig;
    this.config.customTypeParams = customTypeParams;
  }
  build(table) {
    return new SQLiteCustomColumn(table, this.config);
  }
}

class SQLiteCustomColumn extends SQLiteColumn {
  static [entityKind] = "SQLiteCustomColumn";
  sqlName;
  mapTo;
  mapFrom;
  constructor(table, config) {
    super(table, config);
    this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
    this.mapTo = config.customTypeParams.toDriver;
    this.mapFrom = config.customTypeParams.fromDriver;
  }
  getSQLType() {
    return this.sqlName;
  }
  mapFromDriverValue(value) {
    return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
  }
  mapToDriverValue(value) {
    return typeof this.mapTo === "function" ? this.mapTo(value) : value;
  }
}
function customType(customTypeParams) {
  return (a, b) => {
    const { name, config } = getColumnNameAndConfig(a, b);
    return new SQLiteCustomColumnBuilder(name, config, customTypeParams);
  };
}

// node_modules/drizzle-orm/sqlite-core/columns/integer.js
class SQLiteBaseIntegerBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteBaseIntegerBuilder";
  constructor(name, dataType, columnType) {
    super(name, dataType, columnType);
    this.config.autoIncrement = false;
  }
  primaryKey(config) {
    if (config?.autoIncrement) {
      this.config.autoIncrement = true;
    }
    this.config.hasDefault = true;
    return super.primaryKey();
  }
}

class SQLiteBaseInteger extends SQLiteColumn {
  static [entityKind] = "SQLiteBaseInteger";
  autoIncrement = this.config.autoIncrement;
  getSQLType() {
    return "integer";
  }
}

class SQLiteIntegerBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteIntegerBuilder";
  constructor(name) {
    super(name, "number", "SQLiteInteger");
  }
  build(table) {
    return new SQLiteInteger(table, this.config);
  }
}

class SQLiteInteger extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteInteger";
}

class SQLiteTimestampBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteTimestampBuilder";
  constructor(name, mode) {
    super(name, "date", "SQLiteTimestamp");
    this.config.mode = mode;
  }
  defaultNow() {
    return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
  }
  build(table) {
    return new SQLiteTimestamp(table, this.config);
  }
}

class SQLiteTimestamp extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteTimestamp";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    if (this.config.mode === "timestamp") {
      return new Date(value * 1000);
    }
    return new Date(value);
  }
  mapToDriverValue(value) {
    const unix = value.getTime();
    if (this.config.mode === "timestamp") {
      return Math.floor(unix / 1000);
    }
    return unix;
  }
}

class SQLiteBooleanBuilder extends SQLiteBaseIntegerBuilder {
  static [entityKind] = "SQLiteBooleanBuilder";
  constructor(name, mode) {
    super(name, "boolean", "SQLiteBoolean");
    this.config.mode = mode;
  }
  build(table) {
    return new SQLiteBoolean(table, this.config);
  }
}

class SQLiteBoolean extends SQLiteBaseInteger {
  static [entityKind] = "SQLiteBoolean";
  mode = this.config.mode;
  mapFromDriverValue(value) {
    return Number(value) === 1;
  }
  mapToDriverValue(value) {
    return value ? 1 : 0;
  }
}
function integer(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "timestamp" || config?.mode === "timestamp_ms") {
    return new SQLiteTimestampBuilder(name, config.mode);
  }
  if (config?.mode === "boolean") {
    return new SQLiteBooleanBuilder(name, config.mode);
  }
  return new SQLiteIntegerBuilder(name);
}

// node_modules/drizzle-orm/sqlite-core/columns/numeric.js
class SQLiteNumericBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericBuilder";
  constructor(name) {
    super(name, "string", "SQLiteNumeric");
  }
  build(table) {
    return new SQLiteNumeric(table, this.config);
  }
}

class SQLiteNumeric extends SQLiteColumn {
  static [entityKind] = "SQLiteNumeric";
  mapFromDriverValue(value) {
    if (typeof value === "string")
      return value;
    return String(value);
  }
  getSQLType() {
    return "numeric";
  }
}

class SQLiteNumericNumberBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericNumberBuilder";
  constructor(name) {
    super(name, "number", "SQLiteNumericNumber");
  }
  build(table) {
    return new SQLiteNumericNumber(table, this.config);
  }
}

class SQLiteNumericNumber extends SQLiteColumn {
  static [entityKind] = "SQLiteNumericNumber";
  mapFromDriverValue(value) {
    if (typeof value === "number")
      return value;
    return Number(value);
  }
  mapToDriverValue = String;
  getSQLType() {
    return "numeric";
  }
}

class SQLiteNumericBigIntBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteNumericBigIntBuilder";
  constructor(name) {
    super(name, "bigint", "SQLiteNumericBigInt");
  }
  build(table) {
    return new SQLiteNumericBigInt(table, this.config);
  }
}

class SQLiteNumericBigInt extends SQLiteColumn {
  static [entityKind] = "SQLiteNumericBigInt";
  mapFromDriverValue = BigInt;
  mapToDriverValue = String;
  getSQLType() {
    return "numeric";
  }
}
function numeric(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  const mode = config?.mode;
  return mode === "number" ? new SQLiteNumericNumberBuilder(name) : mode === "bigint" ? new SQLiteNumericBigIntBuilder(name) : new SQLiteNumericBuilder(name);
}

// node_modules/drizzle-orm/sqlite-core/columns/real.js
class SQLiteRealBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteRealBuilder";
  constructor(name) {
    super(name, "number", "SQLiteReal");
  }
  build(table) {
    return new SQLiteReal(table, this.config);
  }
}

class SQLiteReal extends SQLiteColumn {
  static [entityKind] = "SQLiteReal";
  getSQLType() {
    return "real";
  }
}
function real(name) {
  return new SQLiteRealBuilder(name ?? "");
}

// node_modules/drizzle-orm/sqlite-core/columns/text.js
class SQLiteTextBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteTextBuilder";
  constructor(name, config) {
    super(name, "string", "SQLiteText");
    this.config.enumValues = config.enum;
    this.config.length = config.length;
  }
  build(table) {
    return new SQLiteText(table, this.config);
  }
}

class SQLiteText extends SQLiteColumn {
  static [entityKind] = "SQLiteText";
  enumValues = this.config.enumValues;
  length = this.config.length;
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return `text${this.config.length ? `(${this.config.length})` : ""}`;
  }
}

class SQLiteTextJsonBuilder extends SQLiteColumnBuilder {
  static [entityKind] = "SQLiteTextJsonBuilder";
  constructor(name) {
    super(name, "json", "SQLiteTextJson");
  }
  build(table) {
    return new SQLiteTextJson(table, this.config);
  }
}

class SQLiteTextJson extends SQLiteColumn {
  static [entityKind] = "SQLiteTextJson";
  getSQLType() {
    return "text";
  }
  mapFromDriverValue(value) {
    return JSON.parse(value);
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
}
function text(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config.mode === "json") {
    return new SQLiteTextJsonBuilder(name);
  }
  return new SQLiteTextBuilder(name, config);
}

// node_modules/drizzle-orm/sqlite-core/columns/all.js
function getSQLiteColumnBuilders() {
  return {
    blob,
    customType,
    integer,
    numeric,
    real,
    text
  };
}

// node_modules/drizzle-orm/sqlite-core/table.js
var InlineForeignKeys2 = Symbol.for("drizzle:SQLiteInlineForeignKeys");

class SQLiteTable extends Table {
  static [entityKind] = "SQLiteTable";
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys: InlineForeignKeys2
  });
  [Table.Symbol.Columns];
  [InlineForeignKeys2] = [];
  [Table.Symbol.ExtraConfigBuilder] = undefined;
}
function sqliteTableBase(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new SQLiteTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getSQLiteColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
    const colBuilder = colBuilderBase;
    colBuilder.setName(name2);
    const column = colBuilder.build(rawTable);
    rawTable[InlineForeignKeys2].push(...colBuilder.buildForeignKeys(column, rawTable));
    return [name2, column];
  }));
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumns;
  if (extraConfig) {
    table[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return table;
}
var sqliteTable = (name, columns, extraConfig) => {
  return sqliteTableBase(name, columns, extraConfig);
};

// node_modules/drizzle-orm/sqlite-core/primary-keys.js
function primaryKey(...config) {
  if (config[0].columns) {
    return new PrimaryKeyBuilder2(config[0].columns, config[0].name);
  }
  return new PrimaryKeyBuilder2(config);
}

class PrimaryKeyBuilder2 {
  static [entityKind] = "SQLitePrimaryKeyBuilder";
  columns;
  name;
  constructor(columns, name) {
    this.columns = columns;
    this.name = name;
  }
  build(table) {
    return new PrimaryKey2(table, this.columns, this.name);
  }
}

class PrimaryKey2 {
  constructor(table, columns, name) {
    this.table = table;
    this.columns = columns;
    this.name = name;
  }
  static [entityKind] = "SQLitePrimaryKey";
  columns;
  name;
  getName() {
    return this.name ?? `${this.table[SQLiteTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
  }
}

// node_modules/drizzle-orm/sqlite-core/utils.js
function extractUsedTable(table) {
  if (is(table, SQLiteTable)) {
    return [`${table[Table.Symbol.BaseName]}`];
  }
  if (is(table, Subquery)) {
    return table._.usedTables ?? [];
  }
  if (is(table, SQL)) {
    return table.usedTables ?? [];
  }
  return [];
}

// node_modules/drizzle-orm/sqlite-core/query-builders/delete.js
class SQLiteDeleteBase extends QueryPromise {
  constructor(table, session, dialect, withList) {
    super();
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.config = { table, withList };
  }
  static [entityKind] = "SQLiteDelete";
  config;
  where(where) {
    this.config.where = where;
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](new Proxy(this.config.table[Table.Symbol.Columns], new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })));
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      this.config.orderBy = orderByArray;
    } else {
      const orderByArray = columns;
      this.config.orderBy = orderByArray;
    }
    return this;
  }
  limit(limit) {
    this.config.limit = limit;
    return this;
  }
  returning(fields = this.table[SQLiteTable.Symbol.Columns]) {
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  getSQL() {
    return this.dialect.buildDeleteQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  _prepare(isOneTimeQuery = true) {
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](this.dialect.sqlToQuery(this.getSQL()), this.config.returning, this.config.returning ? "all" : "run", true, undefined, {
      type: "delete",
      tables: extractUsedTable(this.config.table)
    });
  }
  prepare() {
    return this._prepare(false);
  }
  run = (placeholderValues) => {
    return this._prepare().run(placeholderValues);
  };
  all = (placeholderValues) => {
    return this._prepare().all(placeholderValues);
  };
  get = (placeholderValues) => {
    return this._prepare().get(placeholderValues);
  };
  values = (placeholderValues) => {
    return this._prepare().values(placeholderValues);
  };
  async execute(placeholderValues) {
    return this._prepare().execute(placeholderValues);
  }
  $dynamic() {
    return this;
  }
}

// node_modules/drizzle-orm/casing.js
function toSnakeCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.map((word) => word.toLowerCase()).join("_");
}
function toCamelCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.reduce((acc, word, i) => {
    const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
    return acc + formattedWord;
  }, "");
}
function noopCase(input) {
  return input;
}

class CasingCache {
  static [entityKind] = "CasingCache";
  cache = {};
  cachedTables = {};
  convert;
  constructor(casing) {
    this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
  }
  getColumnCasing(column) {
    if (!column.keyAsName)
      return column.name;
    const schema = column.table[Table.Symbol.Schema] ?? "public";
    const tableName = column.table[Table.Symbol.OriginalName];
    const key = `${schema}.${tableName}.${column.name}`;
    if (!this.cache[key]) {
      this.cacheTable(column.table);
    }
    return this.cache[key];
  }
  cacheTable(table) {
    const schema = table[Table.Symbol.Schema] ?? "public";
    const tableName = table[Table.Symbol.OriginalName];
    const tableKey = `${schema}.${tableName}`;
    if (!this.cachedTables[tableKey]) {
      for (const column of Object.values(table[Table.Symbol.Columns])) {
        const columnKey = `${tableKey}.${column.name}`;
        this.cache[columnKey] = this.convert(column.name);
      }
      this.cachedTables[tableKey] = true;
    }
  }
  clearCache() {
    this.cache = {};
    this.cachedTables = {};
  }
}

// node_modules/drizzle-orm/errors.js
class DrizzleError extends Error {
  static [entityKind] = "DrizzleError";
  constructor({ message, cause }) {
    super(message);
    this.name = "DrizzleError";
    this.cause = cause;
  }
}

class DrizzleQueryError extends Error {
  constructor(query, params, cause) {
    super(`Failed query: ${query}
params: ${params}`);
    this.query = query;
    this.params = params;
    this.cause = cause;
    Error.captureStackTrace(this, DrizzleQueryError);
    if (cause)
      this.cause = cause;
  }
}

class TransactionRollbackError extends DrizzleError {
  static [entityKind] = "TransactionRollbackError";
  constructor() {
    super({ message: "Rollback" });
  }
}

// node_modules/drizzle-orm/sqlite-core/view-base.js
class SQLiteViewBase extends View {
  static [entityKind] = "SQLiteViewBase";
}

// node_modules/drizzle-orm/sqlite-core/dialect.js
class SQLiteDialect {
  static [entityKind] = "SQLiteDialect";
  casing;
  constructor(config) {
    this.casing = new CasingCache(config?.casing);
  }
  escapeName(name) {
    return `"${name}"`;
  }
  escapeParam(_num) {
    return "?";
  }
  escapeString(str) {
    return `'${str.replace(/'/g, "''")}'`;
  }
  buildWithCTE(queries) {
    if (!queries?.length)
      return;
    const withSqlChunks = [sql`with `];
    for (const [i, w] of queries.entries()) {
      withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
      if (i < queries.length - 1) {
        withSqlChunks.push(sql`, `);
      }
    }
    withSqlChunks.push(sql` `);
    return sql.join(withSqlChunks);
  }
  buildDeleteQuery({ table, where, returning, withList, limit, orderBy }) {
    const withSql = this.buildWithCTE(withList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : undefined;
    const whereSql = where ? sql` where ${where}` : undefined;
    const orderBySql = this.buildOrderBy(orderBy);
    const limitSql = this.buildLimit(limit);
    return sql`${withSql}delete from ${table}${whereSql}${returningSql}${orderBySql}${limitSql}`;
  }
  buildUpdateSet(table, set) {
    const tableColumns = table[Table.Symbol.Columns];
    const columnNames = Object.keys(tableColumns).filter((colName) => set[colName] !== undefined || tableColumns[colName]?.onUpdateFn !== undefined);
    const setSize = columnNames.length;
    return sql.join(columnNames.flatMap((colName, i) => {
      const col = tableColumns[colName];
      const onUpdateFnResult = col.onUpdateFn?.();
      const value = set[colName] ?? (is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col));
      const res = sql`${sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
      if (i < setSize - 1) {
        return [res, sql.raw(", ")];
      }
      return [res];
    }));
  }
  buildUpdateQuery({ table, set, where, returning, withList, joins, from, limit, orderBy }) {
    const withSql = this.buildWithCTE(withList);
    const setSql = this.buildUpdateSet(table, set);
    const fromSql = from && sql.join([sql.raw(" from "), this.buildFromTable(from)]);
    const joinsSql = this.buildJoins(joins);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : undefined;
    const whereSql = where ? sql` where ${where}` : undefined;
    const orderBySql = this.buildOrderBy(orderBy);
    const limitSql = this.buildLimit(limit);
    return sql`${withSql}update ${table} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}${orderBySql}${limitSql}`;
  }
  buildSelection(fields, { isSingleTable = false } = {}) {
    const columnsLen = fields.length;
    const chunks = fields.flatMap(({ field }, i) => {
      const chunk = [];
      if (is(field, SQL.Aliased) && field.isSelectionField) {
        chunk.push(sql.identifier(field.fieldAlias));
      } else if (is(field, SQL.Aliased) || is(field, SQL)) {
        const query = is(field, SQL.Aliased) ? field.sql : field;
        if (isSingleTable) {
          chunk.push(new SQL(query.queryChunks.map((c) => {
            if (is(c, Column)) {
              return sql.identifier(this.casing.getColumnCasing(c));
            }
            return c;
          })));
        } else {
          chunk.push(query);
        }
        if (is(field, SQL.Aliased)) {
          chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
        }
      } else if (is(field, Column)) {
        const tableName = field.table[Table.Symbol.Name];
        if (field.columnType === "SQLiteNumericBigInt") {
          if (isSingleTable) {
            chunk.push(sql`cast(${sql.identifier(this.casing.getColumnCasing(field))} as text)`);
          } else {
            chunk.push(sql`cast(${sql.identifier(tableName)}.${sql.identifier(this.casing.getColumnCasing(field))} as text)`);
          }
        } else {
          if (isSingleTable) {
            chunk.push(sql.identifier(this.casing.getColumnCasing(field)));
          } else {
            chunk.push(sql`${sql.identifier(tableName)}.${sql.identifier(this.casing.getColumnCasing(field))}`);
          }
        }
      } else if (is(field, Subquery)) {
        const entries = Object.entries(field._.selectedFields);
        if (entries.length === 1) {
          const entry = entries[0][1];
          const fieldDecoder = is(entry, SQL) ? entry.decoder : is(entry, Column) ? { mapFromDriverValue: (v) => entry.mapFromDriverValue(v) } : entry.sql.decoder;
          if (fieldDecoder)
            field._.sql.decoder = fieldDecoder;
        }
        chunk.push(field);
      }
      if (i < columnsLen - 1) {
        chunk.push(sql`, `);
      }
      return chunk;
    });
    return sql.join(chunks);
  }
  buildJoins(joins) {
    if (!joins || joins.length === 0) {
      return;
    }
    const joinsArray = [];
    if (joins) {
      for (const [index, joinMeta] of joins.entries()) {
        if (index === 0) {
          joinsArray.push(sql` `);
        }
        const table = joinMeta.table;
        const onSql = joinMeta.on ? sql` on ${joinMeta.on}` : undefined;
        if (is(table, SQLiteTable)) {
          const tableName = table[SQLiteTable.Symbol.Name];
          const tableSchema = table[SQLiteTable.Symbol.Schema];
          const origTableName = table[SQLiteTable.Symbol.OriginalName];
          const alias = tableName === origTableName ? undefined : joinMeta.alias;
          joinsArray.push(sql`${sql.raw(joinMeta.joinType)} join ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : undefined}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`);
        } else {
          joinsArray.push(sql`${sql.raw(joinMeta.joinType)} join ${table}${onSql}`);
        }
        if (index < joins.length - 1) {
          joinsArray.push(sql` `);
        }
      }
    }
    return sql.join(joinsArray);
  }
  buildLimit(limit) {
    return typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : undefined;
  }
  buildOrderBy(orderBy) {
    const orderByList = [];
    if (orderBy) {
      for (const [index, orderByValue] of orderBy.entries()) {
        orderByList.push(orderByValue);
        if (index < orderBy.length - 1) {
          orderByList.push(sql`, `);
        }
      }
    }
    return orderByList.length > 0 ? sql` order by ${sql.join(orderByList)}` : undefined;
  }
  buildFromTable(table) {
    if (is(table, Table) && table[Table.Symbol.IsAlias]) {
      return sql`${sql`${sql.identifier(table[Table.Symbol.Schema] ?? "")}.`.if(table[Table.Symbol.Schema])}${sql.identifier(table[Table.Symbol.OriginalName])} ${sql.identifier(table[Table.Symbol.Name])}`;
    }
    return table;
  }
  buildSelectQuery({
    withList,
    fields,
    fieldsFlat,
    where,
    having,
    table,
    joins,
    orderBy,
    groupBy,
    limit,
    offset,
    distinct,
    setOperators
  }) {
    const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
    for (const f of fieldsList) {
      if (is(f.field, Column) && getTableName(f.field.table) !== (is(table, Subquery) ? table._.alias : is(table, SQLiteViewBase) ? table[ViewBaseConfig].name : is(table, SQL) ? undefined : getTableName(table)) && !((table2) => joins?.some(({ alias }) => alias === (table2[Table.Symbol.IsAlias] ? getTableName(table2) : table2[Table.Symbol.BaseName])))(f.field.table)) {
        const tableName = getTableName(f.field.table);
        throw new Error(`Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`);
      }
    }
    const isSingleTable = !joins || joins.length === 0;
    const withSql = this.buildWithCTE(withList);
    const distinctSql = distinct ? sql` distinct` : undefined;
    const selection = this.buildSelection(fieldsList, { isSingleTable });
    const tableSql = this.buildFromTable(table);
    const joinsSql = this.buildJoins(joins);
    const whereSql = where ? sql` where ${where}` : undefined;
    const havingSql = having ? sql` having ${having}` : undefined;
    const groupByList = [];
    if (groupBy) {
      for (const [index, groupByValue] of groupBy.entries()) {
        groupByList.push(groupByValue);
        if (index < groupBy.length - 1) {
          groupByList.push(sql`, `);
        }
      }
    }
    const groupBySql = groupByList.length > 0 ? sql` group by ${sql.join(groupByList)}` : undefined;
    const orderBySql = this.buildOrderBy(orderBy);
    const limitSql = this.buildLimit(limit);
    const offsetSql = offset ? sql` offset ${offset}` : undefined;
    const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}`;
    if (setOperators.length > 0) {
      return this.buildSetOperations(finalQuery, setOperators);
    }
    return finalQuery;
  }
  buildSetOperations(leftSelect, setOperators) {
    const [setOperator, ...rest] = setOperators;
    if (!setOperator) {
      throw new Error("Cannot pass undefined values to any set operator");
    }
    if (rest.length === 0) {
      return this.buildSetOperationQuery({ leftSelect, setOperator });
    }
    return this.buildSetOperations(this.buildSetOperationQuery({ leftSelect, setOperator }), rest);
  }
  buildSetOperationQuery({
    leftSelect,
    setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
  }) {
    const leftChunk = sql`${leftSelect.getSQL()} `;
    const rightChunk = sql`${rightSelect.getSQL()}`;
    let orderBySql;
    if (orderBy && orderBy.length > 0) {
      const orderByValues = [];
      for (const singleOrderBy of orderBy) {
        if (is(singleOrderBy, SQLiteColumn)) {
          orderByValues.push(sql.identifier(singleOrderBy.name));
        } else if (is(singleOrderBy, SQL)) {
          for (let i = 0;i < singleOrderBy.queryChunks.length; i++) {
            const chunk = singleOrderBy.queryChunks[i];
            if (is(chunk, SQLiteColumn)) {
              singleOrderBy.queryChunks[i] = sql.identifier(this.casing.getColumnCasing(chunk));
            }
          }
          orderByValues.push(sql`${singleOrderBy}`);
        } else {
          orderByValues.push(sql`${singleOrderBy}`);
        }
      }
      orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)}`;
    }
    const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : undefined;
    const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
    const offsetSql = offset ? sql` offset ${offset}` : undefined;
    return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
  }
  buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select }) {
    const valuesSqlList = [];
    const columns = table[Table.Symbol.Columns];
    const colEntries = Object.entries(columns).filter(([_, col]) => !col.shouldDisableInsert());
    const insertOrder = colEntries.map(([, column]) => sql.identifier(this.casing.getColumnCasing(column)));
    if (select) {
      const select2 = valuesOrSelect;
      if (is(select2, SQL)) {
        valuesSqlList.push(select2);
      } else {
        valuesSqlList.push(select2.getSQL());
      }
    } else {
      const values = valuesOrSelect;
      valuesSqlList.push(sql.raw("values "));
      for (const [valueIndex, value] of values.entries()) {
        const valueList = [];
        for (const [fieldName, col] of colEntries) {
          const colValue = value[fieldName];
          if (colValue === undefined || is(colValue, Param) && colValue.value === undefined) {
            let defaultValue;
            if (col.default !== null && col.default !== undefined) {
              defaultValue = is(col.default, SQL) ? col.default : sql.param(col.default, col);
            } else if (col.defaultFn !== undefined) {
              const defaultFnResult = col.defaultFn();
              defaultValue = is(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
            } else if (!col.default && col.onUpdateFn !== undefined) {
              const onUpdateFnResult = col.onUpdateFn();
              defaultValue = is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
            } else {
              defaultValue = sql`null`;
            }
            valueList.push(defaultValue);
          } else {
            valueList.push(colValue);
          }
        }
        valuesSqlList.push(valueList);
        if (valueIndex < values.length - 1) {
          valuesSqlList.push(sql`, `);
        }
      }
    }
    const withSql = this.buildWithCTE(withList);
    const valuesSql = sql.join(valuesSqlList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : undefined;
    const onConflictSql = onConflict?.length ? sql.join(onConflict) : undefined;
    return sql`${withSql}insert into ${table} ${insertOrder} ${valuesSql}${onConflictSql}${returningSql}`;
  }
  sqlToQuery(sql2, invokeSource) {
    return sql2.toQuery({
      casing: this.casing,
      escapeName: this.escapeName,
      escapeParam: this.escapeParam,
      escapeString: this.escapeString,
      invokeSource
    });
  }
  buildRelationalQuery({
    fullSchema,
    schema,
    tableNamesMap,
    table,
    tableConfig,
    queryConfig: config,
    tableAlias,
    nestedQueryRelation,
    joinOn
  }) {
    let selection = [];
    let limit, offset, orderBy = [], where;
    const joins = [];
    if (config === true) {
      const selectionEntries = Object.entries(tableConfig.columns);
      selection = selectionEntries.map(([key, value]) => ({
        dbKey: value.name,
        tsKey: key,
        field: aliasedTableColumn(value, tableAlias),
        relationTableTsKey: undefined,
        isJson: false,
        selection: []
      }));
    } else {
      const aliasedColumns = Object.fromEntries(Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]));
      if (config.where) {
        const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, getOperators()) : config.where;
        where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      }
      const fieldsSelection = [];
      let selectedColumns = [];
      if (config.columns) {
        let isIncludeMode = false;
        for (const [field, value] of Object.entries(config.columns)) {
          if (value === undefined) {
            continue;
          }
          if (field in tableConfig.columns) {
            if (!isIncludeMode && value === true) {
              isIncludeMode = true;
            }
            selectedColumns.push(field);
          }
        }
        if (selectedColumns.length > 0) {
          selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
        }
      } else {
        selectedColumns = Object.keys(tableConfig.columns);
      }
      for (const field of selectedColumns) {
        const column = tableConfig.columns[field];
        fieldsSelection.push({ tsKey: field, value: column });
      }
      let selectedRelations = [];
      if (config.with) {
        selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
      }
      let extras;
      if (config.extras) {
        extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql }) : config.extras;
        for (const [tsKey, value] of Object.entries(extras)) {
          fieldsSelection.push({
            tsKey,
            value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
          });
        }
      }
      for (const { tsKey, value } of fieldsSelection) {
        selection.push({
          dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
          tsKey,
          field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
          relationTableTsKey: undefined,
          isJson: false,
          selection: []
        });
      }
      let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, getOrderByOperators()) : config.orderBy ?? [];
      if (!Array.isArray(orderByOrig)) {
        orderByOrig = [orderByOrig];
      }
      orderBy = orderByOrig.map((orderByValue) => {
        if (is(orderByValue, Column)) {
          return aliasedTableColumn(orderByValue, tableAlias);
        }
        return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      });
      limit = config.limit;
      offset = config.offset;
      for (const {
        tsKey: selectedRelationTsKey,
        queryConfig: selectedRelationConfigValue,
        relation
      } of selectedRelations) {
        const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
        const relationTableName = getTableUniqueName(relation.referencedTable);
        const relationTableTsName = tableNamesMap[relationTableName];
        const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
        const joinOn2 = and(...normalizedRelation.fields.map((field2, i) => eq(aliasedTableColumn(normalizedRelation.references[i], relationTableAlias), aliasedTableColumn(field2, tableAlias))));
        const builtRelation = this.buildRelationalQuery({
          fullSchema,
          schema,
          tableNamesMap,
          table: fullSchema[relationTableTsName],
          tableConfig: schema[relationTableTsName],
          queryConfig: is(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
          tableAlias: relationTableAlias,
          joinOn: joinOn2,
          nestedQueryRelation: relation
        });
        const field = sql`(${builtRelation.sql})`.as(selectedRelationTsKey);
        selection.push({
          dbKey: selectedRelationTsKey,
          tsKey: selectedRelationTsKey,
          field,
          relationTableTsKey: relationTableTsName,
          isJson: true,
          selection: builtRelation.selection
        });
      }
    }
    if (selection.length === 0) {
      throw new DrizzleError({
        message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}"). You need to have at least one item in "columns", "with" or "extras". If you need to select all columns, omit the "columns" key or set it to undefined.`
      });
    }
    let result;
    where = and(joinOn, where);
    if (nestedQueryRelation) {
      let field = sql`json_array(${sql.join(selection.map(({ field: field2 }) => is(field2, SQLiteColumn) ? sql.identifier(this.casing.getColumnCasing(field2)) : is(field2, SQL.Aliased) ? field2.sql : field2), sql`, `)})`;
      if (is(nestedQueryRelation, Many)) {
        field = sql`coalesce(json_group_array(${field}), json_array())`;
      }
      const nestedSelection = [{
        dbKey: "data",
        tsKey: "data",
        field: field.as("data"),
        isJson: true,
        relationTableTsKey: tableConfig.tsName,
        selection
      }];
      const needsSubquery = limit !== undefined || offset !== undefined || orderBy.length > 0;
      if (needsSubquery) {
        result = this.buildSelectQuery({
          table: aliasedTable(table, tableAlias),
          fields: {},
          fieldsFlat: [
            {
              path: [],
              field: sql.raw("*")
            }
          ],
          where,
          limit,
          offset,
          orderBy,
          setOperators: []
        });
        where = undefined;
        limit = undefined;
        offset = undefined;
        orderBy = undefined;
      } else {
        result = aliasedTable(table, tableAlias);
      }
      result = this.buildSelectQuery({
        table: is(result, SQLiteTable) ? result : new Subquery(result, {}, tableAlias),
        fields: {},
        fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
          path: [],
          field: is(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    } else {
      result = this.buildSelectQuery({
        table: aliasedTable(table, tableAlias),
        fields: {},
        fieldsFlat: selection.map(({ field }) => ({
          path: [],
          field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    }
    return {
      tableTsKey: tableConfig.tsName,
      sql: result,
      selection
    };
  }
}

class SQLiteSyncDialect extends SQLiteDialect {
  static [entityKind] = "SQLiteSyncDialect";
  migrate(migrations, session, config) {
    const migrationsTable = config === undefined ? "__drizzle_migrations" : typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
    const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)
		`;
    session.run(migrationTableCreate);
    const dbMigrations = session.values(sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsTable)} ORDER BY created_at DESC LIMIT 1`);
    const lastDbMigration = dbMigrations[0] ?? undefined;
    session.run(sql`BEGIN`);
    try {
      for (const migration of migrations) {
        if (!lastDbMigration || Number(lastDbMigration[2]) < migration.folderMillis) {
          for (const stmt of migration.sql) {
            session.run(sql.raw(stmt));
          }
          session.run(sql`INSERT INTO ${sql.identifier(migrationsTable)} ("hash", "created_at") VALUES(${migration.hash}, ${migration.folderMillis})`);
        }
      }
      session.run(sql`COMMIT`);
    } catch (e) {
      session.run(sql`ROLLBACK`);
      throw e;
    }
  }
}

// node_modules/drizzle-orm/query-builders/query-builder.js
class TypedQueryBuilder {
  static [entityKind] = "TypedQueryBuilder";
  getSelectedFields() {
    return this._.selectedFields;
  }
}

// node_modules/drizzle-orm/sqlite-core/query-builders/select.js
class SQLiteSelectBuilder {
  static [entityKind] = "SQLiteSelectBuilder";
  fields;
  session;
  dialect;
  withList;
  distinct;
  constructor(config) {
    this.fields = config.fields;
    this.session = config.session;
    this.dialect = config.dialect;
    this.withList = config.withList;
    this.distinct = config.distinct;
  }
  from(source) {
    const isPartialSelect = !!this.fields;
    let fields;
    if (this.fields) {
      fields = this.fields;
    } else if (is(source, Subquery)) {
      fields = Object.fromEntries(Object.keys(source._.selectedFields).map((key) => [key, source[key]]));
    } else if (is(source, SQLiteViewBase)) {
      fields = source[ViewBaseConfig].selectedFields;
    } else if (is(source, SQL)) {
      fields = {};
    } else {
      fields = getTableColumns(source);
    }
    return new SQLiteSelectBase({
      table: source,
      fields,
      isPartialSelect,
      session: this.session,
      dialect: this.dialect,
      withList: this.withList,
      distinct: this.distinct
    });
  }
}

class SQLiteSelectQueryBuilderBase extends TypedQueryBuilder {
  static [entityKind] = "SQLiteSelectQueryBuilder";
  _;
  config;
  joinsNotNullableMap;
  tableName;
  isPartialSelect;
  session;
  dialect;
  cacheConfig = undefined;
  usedTables = /* @__PURE__ */ new Set;
  constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
    super();
    this.config = {
      withList,
      table,
      fields: { ...fields },
      distinct,
      setOperators: []
    };
    this.isPartialSelect = isPartialSelect;
    this.session = session;
    this.dialect = dialect;
    this._ = {
      selectedFields: fields,
      config: this.config
    };
    this.tableName = getTableLikeName(table);
    this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
    for (const item of extractUsedTable(table))
      this.usedTables.add(item);
  }
  getUsedTables() {
    return [...this.usedTables];
  }
  createJoin(joinType) {
    return (table, on3) => {
      const baseTableName = this.tableName;
      const tableName = getTableLikeName(table);
      for (const item of extractUsedTable(table))
        this.usedTables.add(item);
      if (typeof tableName === "string" && this.config.joins?.some((join5) => join5.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (!this.isPartialSelect) {
        if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
          this.config.fields = {
            [baseTableName]: this.config.fields
          };
        }
        if (typeof tableName === "string" && !is(table, SQL)) {
          const selection = is(table, Subquery) ? table._.selectedFields : is(table, View) ? table[ViewBaseConfig].selectedFields : table[Table.Symbol.Columns];
          this.config.fields[tableName] = selection;
        }
      }
      if (typeof on3 === "function") {
        on3 = on3(new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
      }
      if (!this.config.joins) {
        this.config.joins = [];
      }
      this.config.joins.push({ on: on3, table, joinType, alias: tableName });
      if (typeof tableName === "string") {
        switch (joinType) {
          case "left": {
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
          case "right": {
            this.joinsNotNullableMap = Object.fromEntries(Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false]));
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "cross":
          case "inner": {
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "full": {
            this.joinsNotNullableMap = Object.fromEntries(Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false]));
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
        }
      }
      return this;
    };
  }
  leftJoin = this.createJoin("left");
  rightJoin = this.createJoin("right");
  innerJoin = this.createJoin("inner");
  fullJoin = this.createJoin("full");
  crossJoin = this.createJoin("cross");
  createSetOperator(type, isAll) {
    return (rightSelection) => {
      const rightSelect = typeof rightSelection === "function" ? rightSelection(getSQLiteSetOperators()) : rightSelection;
      if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
        throw new Error("Set operator error (union / intersect / except): selected fields are not the same or are in a different order");
      }
      this.config.setOperators.push({ type, isAll, rightSelect });
      return this;
    };
  }
  union = this.createSetOperator("union", false);
  unionAll = this.createSetOperator("union", true);
  intersect = this.createSetOperator("intersect", false);
  except = this.createSetOperator("except", false);
  addSetOperators(setOperators) {
    this.config.setOperators.push(...setOperators);
    return this;
  }
  where(where) {
    if (typeof where === "function") {
      where = where(new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
    }
    this.config.where = where;
    return this;
  }
  having(having) {
    if (typeof having === "function") {
      having = having(new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
    }
    this.config.having = having;
    return this;
  }
  groupBy(...columns) {
    if (typeof columns[0] === "function") {
      const groupBy = columns[0](new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })));
      this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
    } else {
      this.config.groupBy = columns;
    }
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](new Proxy(this.config.fields, new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })));
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    } else {
      const orderByArray = columns;
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    }
    return this;
  }
  limit(limit) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).limit = limit;
    } else {
      this.config.limit = limit;
    }
    return this;
  }
  offset(offset) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).offset = offset;
    } else {
      this.config.offset = offset;
    }
    return this;
  }
  getSQL() {
    return this.dialect.buildSelectQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  as(alias) {
    const usedTables = [];
    usedTables.push(...extractUsedTable(this.config.table));
    if (this.config.joins) {
      for (const it of this.config.joins)
        usedTables.push(...extractUsedTable(it.table));
    }
    return new Proxy(new Subquery(this.getSQL(), this.config.fields, alias, false, [...new Set(usedTables)]), new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
  }
  getSelectedFields() {
    return new Proxy(this.config.fields, new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
  }
  $dynamic() {
    return this;
  }
}

class SQLiteSelectBase extends SQLiteSelectQueryBuilderBase {
  static [entityKind] = "SQLiteSelect";
  _prepare(isOneTimeQuery = true) {
    if (!this.session) {
      throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
    }
    const fieldsList = orderSelectedFields(this.config.fields);
    const query = this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](this.dialect.sqlToQuery(this.getSQL()), fieldsList, "all", true, undefined, {
      type: "select",
      tables: [...this.usedTables]
    }, this.cacheConfig);
    query.joinsNotNullableMap = this.joinsNotNullableMap;
    return query;
  }
  $withCache(config) {
    this.cacheConfig = config === undefined ? { config: {}, enable: true, autoInvalidate: true } : config === false ? { enable: false } : { enable: true, autoInvalidate: true, ...config };
    return this;
  }
  prepare() {
    return this._prepare(false);
  }
  run = (placeholderValues) => {
    return this._prepare().run(placeholderValues);
  };
  all = (placeholderValues) => {
    return this._prepare().all(placeholderValues);
  };
  get = (placeholderValues) => {
    return this._prepare().get(placeholderValues);
  };
  values = (placeholderValues) => {
    return this._prepare().values(placeholderValues);
  };
  async execute() {
    return this.all();
  }
}
applyMixins(SQLiteSelectBase, [QueryPromise]);
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select) => ({
      type,
      isAll,
      rightSelect: select
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error("Set operator error (union / intersect / except): selected fields are not the same or are in a different order");
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
var getSQLiteSetOperators = () => ({
  union,
  unionAll,
  intersect,
  except
});
var union = createSetOperator("union", false);
var unionAll = createSetOperator("union", true);
var intersect = createSetOperator("intersect", false);
var except = createSetOperator("except", false);

// node_modules/drizzle-orm/sqlite-core/query-builders/query-builder.js
class QueryBuilder {
  static [entityKind] = "SQLiteQueryBuilder";
  dialect;
  dialectConfig;
  constructor(dialect) {
    this.dialect = is(dialect, SQLiteDialect) ? dialect : undefined;
    this.dialectConfig = is(dialect, SQLiteDialect) ? undefined : dialect;
  }
  $with = (alias, selection) => {
    const queryBuilder = this;
    const as = (qb) => {
      if (typeof qb === "function") {
        qb = qb(queryBuilder);
      }
      return new Proxy(new WithSubquery(qb.getSQL(), selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}), alias, true), new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
    };
    return { as };
  };
  with(...queries) {
    const self = this;
    function select(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? undefined,
        session: undefined,
        dialect: self.getDialect(),
        withList: queries
      });
    }
    function selectDistinct(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? undefined,
        session: undefined,
        dialect: self.getDialect(),
        withList: queries,
        distinct: true
      });
    }
    return { select, selectDistinct };
  }
  select(fields) {
    return new SQLiteSelectBuilder({ fields: fields ?? undefined, session: undefined, dialect: this.getDialect() });
  }
  selectDistinct(fields) {
    return new SQLiteSelectBuilder({
      fields: fields ?? undefined,
      session: undefined,
      dialect: this.getDialect(),
      distinct: true
    });
  }
  getDialect() {
    if (!this.dialect) {
      this.dialect = new SQLiteSyncDialect(this.dialectConfig);
    }
    return this.dialect;
  }
}

// node_modules/drizzle-orm/sqlite-core/query-builders/insert.js
class SQLiteInsertBuilder {
  constructor(table, session, dialect, withList) {
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
  }
  static [entityKind] = "SQLiteInsertBuilder";
  values(values) {
    values = Array.isArray(values) ? values : [values];
    if (values.length === 0) {
      throw new Error("values() must be called with at least one value");
    }
    const mappedValues = values.map((entry) => {
      const result = {};
      const cols = this.table[Table.Symbol.Columns];
      for (const colKey of Object.keys(entry)) {
        const colValue = entry[colKey];
        result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
      }
      return result;
    });
    return new SQLiteInsertBase(this.table, mappedValues, this.session, this.dialect, this.withList);
  }
  select(selectQuery) {
    const select = typeof selectQuery === "function" ? selectQuery(new QueryBuilder) : selectQuery;
    if (!is(select, SQL) && !haveSameKeys(this.table[Columns], select._.selectedFields)) {
      throw new Error("Insert select error: selected fields are not the same or are in a different order compared to the table definition");
    }
    return new SQLiteInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
  }
}

class SQLiteInsertBase extends QueryPromise {
  constructor(table, values, session, dialect, withList, select) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { table, values, withList, select };
  }
  static [entityKind] = "SQLiteInsert";
  config;
  returning(fields = this.config.table[SQLiteTable.Symbol.Columns]) {
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  onConflictDoNothing(config = {}) {
    if (!this.config.onConflict)
      this.config.onConflict = [];
    if (config.target === undefined) {
      this.config.onConflict.push(sql` on conflict do nothing`);
    } else {
      const targetSql = Array.isArray(config.target) ? sql`${config.target}` : sql`${[config.target]}`;
      const whereSql = config.where ? sql` where ${config.where}` : sql``;
      this.config.onConflict.push(sql` on conflict ${targetSql} do nothing${whereSql}`);
    }
    return this;
  }
  onConflictDoUpdate(config) {
    if (config.where && (config.targetWhere || config.setWhere)) {
      throw new Error('You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.');
    }
    if (!this.config.onConflict)
      this.config.onConflict = [];
    const whereSql = config.where ? sql` where ${config.where}` : undefined;
    const targetWhereSql = config.targetWhere ? sql` where ${config.targetWhere}` : undefined;
    const setWhereSql = config.setWhere ? sql` where ${config.setWhere}` : undefined;
    const targetSql = Array.isArray(config.target) ? sql`${config.target}` : sql`${[config.target]}`;
    const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config.set));
    this.config.onConflict.push(sql` on conflict ${targetSql}${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`);
    return this;
  }
  getSQL() {
    return this.dialect.buildInsertQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  _prepare(isOneTimeQuery = true) {
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](this.dialect.sqlToQuery(this.getSQL()), this.config.returning, this.config.returning ? "all" : "run", true, undefined, {
      type: "insert",
      tables: extractUsedTable(this.config.table)
    });
  }
  prepare() {
    return this._prepare(false);
  }
  run = (placeholderValues) => {
    return this._prepare().run(placeholderValues);
  };
  all = (placeholderValues) => {
    return this._prepare().all(placeholderValues);
  };
  get = (placeholderValues) => {
    return this._prepare().get(placeholderValues);
  };
  values = (placeholderValues) => {
    return this._prepare().values(placeholderValues);
  };
  async execute() {
    return this.config.returning ? this.all() : this.run();
  }
  $dynamic() {
    return this;
  }
}

// node_modules/drizzle-orm/sqlite-core/query-builders/update.js
class SQLiteUpdateBuilder {
  constructor(table, session, dialect, withList) {
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
  }
  static [entityKind] = "SQLiteUpdateBuilder";
  set(values) {
    return new SQLiteUpdateBase(this.table, mapUpdateSet(this.table, values), this.session, this.dialect, this.withList);
  }
}

class SQLiteUpdateBase extends QueryPromise {
  constructor(table, set, session, dialect, withList) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { set, table, withList, joins: [] };
  }
  static [entityKind] = "SQLiteUpdate";
  config;
  from(source) {
    this.config.from = source;
    return this;
  }
  createJoin(joinType) {
    return (table, on3) => {
      const tableName = getTableLikeName(table);
      if (typeof tableName === "string" && this.config.joins.some((join5) => join5.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (typeof on3 === "function") {
        const from = this.config.from ? is(table, SQLiteTable) ? table[Table.Symbol.Columns] : is(table, Subquery) ? table._.selectedFields : is(table, SQLiteViewBase) ? table[ViewBaseConfig].selectedFields : undefined : undefined;
        on3 = on3(new Proxy(this.config.table[Table.Symbol.Columns], new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })), from && new Proxy(from, new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })));
      }
      this.config.joins.push({ on: on3, table, joinType, alias: tableName });
      return this;
    };
  }
  leftJoin = this.createJoin("left");
  rightJoin = this.createJoin("right");
  innerJoin = this.createJoin("inner");
  fullJoin = this.createJoin("full");
  where(where) {
    this.config.where = where;
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](new Proxy(this.config.table[Table.Symbol.Columns], new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })));
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      this.config.orderBy = orderByArray;
    } else {
      const orderByArray = columns;
      this.config.orderBy = orderByArray;
    }
    return this;
  }
  limit(limit) {
    this.config.limit = limit;
    return this;
  }
  returning(fields = this.config.table[SQLiteTable.Symbol.Columns]) {
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  getSQL() {
    return this.dialect.buildUpdateQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  _prepare(isOneTimeQuery = true) {
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](this.dialect.sqlToQuery(this.getSQL()), this.config.returning, this.config.returning ? "all" : "run", true, undefined, {
      type: "insert",
      tables: extractUsedTable(this.config.table)
    });
  }
  prepare() {
    return this._prepare(false);
  }
  run = (placeholderValues) => {
    return this._prepare().run(placeholderValues);
  };
  all = (placeholderValues) => {
    return this._prepare().all(placeholderValues);
  };
  get = (placeholderValues) => {
    return this._prepare().get(placeholderValues);
  };
  values = (placeholderValues) => {
    return this._prepare().values(placeholderValues);
  };
  async execute() {
    return this.config.returning ? this.all() : this.run();
  }
  $dynamic() {
    return this;
  }
}

// node_modules/drizzle-orm/sqlite-core/query-builders/count.js
class SQLiteCountBuilder extends SQL {
  constructor(params) {
    super(SQLiteCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
    this.params = params;
    this.session = params.session;
    this.sql = SQLiteCountBuilder.buildCount(params.source, params.filters);
  }
  sql;
  static [entityKind] = "SQLiteCountBuilderAsync";
  [Symbol.toStringTag] = "SQLiteCountBuilderAsync";
  session;
  static buildEmbeddedCount(source, filters) {
    return sql`(select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters})`;
  }
  static buildCount(source, filters) {
    return sql`select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters}`;
  }
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.session.count(this.sql)).then(onfulfilled, onrejected);
  }
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }
  finally(onFinally) {
    return this.then((value) => {
      onFinally?.();
      return value;
    }, (reason) => {
      onFinally?.();
      throw reason;
    });
  }
}

// node_modules/drizzle-orm/sqlite-core/query-builders/query.js
class RelationalQueryBuilder {
  constructor(mode, fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
    this.mode = mode;
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
  }
  static [entityKind] = "SQLiteAsyncRelationalQueryBuilder";
  findMany(config) {
    return this.mode === "sync" ? new SQLiteSyncRelationalQuery(this.fullSchema, this.schema, this.tableNamesMap, this.table, this.tableConfig, this.dialect, this.session, config ? config : {}, "many") : new SQLiteRelationalQuery(this.fullSchema, this.schema, this.tableNamesMap, this.table, this.tableConfig, this.dialect, this.session, config ? config : {}, "many");
  }
  findFirst(config) {
    return this.mode === "sync" ? new SQLiteSyncRelationalQuery(this.fullSchema, this.schema, this.tableNamesMap, this.table, this.tableConfig, this.dialect, this.session, config ? { ...config, limit: 1 } : { limit: 1 }, "first") : new SQLiteRelationalQuery(this.fullSchema, this.schema, this.tableNamesMap, this.table, this.tableConfig, this.dialect, this.session, config ? { ...config, limit: 1 } : { limit: 1 }, "first");
  }
}

class SQLiteRelationalQuery extends QueryPromise {
  constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
    super();
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
    this.config = config;
    this.mode = mode;
  }
  static [entityKind] = "SQLiteAsyncRelationalQuery";
  mode;
  getSQL() {
    return this.dialect.buildRelationalQuery({
      fullSchema: this.fullSchema,
      schema: this.schema,
      tableNamesMap: this.tableNamesMap,
      table: this.table,
      tableConfig: this.tableConfig,
      queryConfig: this.config,
      tableAlias: this.tableConfig.tsName
    }).sql;
  }
  _prepare(isOneTimeQuery = false) {
    const { query, builtQuery } = this._toSQL();
    return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](builtQuery, undefined, this.mode === "first" ? "get" : "all", true, (rawRows, mapColumnValue) => {
      const rows = rawRows.map((row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue));
      if (this.mode === "first") {
        return rows[0];
      }
      return rows;
    });
  }
  prepare() {
    return this._prepare(false);
  }
  _toSQL() {
    const query = this.dialect.buildRelationalQuery({
      fullSchema: this.fullSchema,
      schema: this.schema,
      tableNamesMap: this.tableNamesMap,
      table: this.table,
      tableConfig: this.tableConfig,
      queryConfig: this.config,
      tableAlias: this.tableConfig.tsName
    });
    const builtQuery = this.dialect.sqlToQuery(query.sql);
    return { query, builtQuery };
  }
  toSQL() {
    return this._toSQL().builtQuery;
  }
  executeRaw() {
    if (this.mode === "first") {
      return this._prepare(false).get();
    }
    return this._prepare(false).all();
  }
  async execute() {
    return this.executeRaw();
  }
}

class SQLiteSyncRelationalQuery extends SQLiteRelationalQuery {
  static [entityKind] = "SQLiteSyncRelationalQuery";
  sync() {
    return this.executeRaw();
  }
}

// node_modules/drizzle-orm/sqlite-core/query-builders/raw.js
class SQLiteRaw extends QueryPromise {
  constructor(execute, getSQL, action, dialect, mapBatchResult) {
    super();
    this.execute = execute;
    this.getSQL = getSQL;
    this.dialect = dialect;
    this.mapBatchResult = mapBatchResult;
    this.config = { action };
  }
  static [entityKind] = "SQLiteRaw";
  config;
  getQuery() {
    return { ...this.dialect.sqlToQuery(this.getSQL()), method: this.config.action };
  }
  mapResult(result, isFromBatch) {
    return isFromBatch ? this.mapBatchResult(result) : result;
  }
  _prepare() {
    return this;
  }
  isResponseInArrayMode() {
    return false;
  }
}

// node_modules/drizzle-orm/sqlite-core/db.js
class BaseSQLiteDatabase {
  constructor(resultKind, dialect, session, schema) {
    this.resultKind = resultKind;
    this.dialect = dialect;
    this.session = session;
    this._ = schema ? {
      schema: schema.schema,
      fullSchema: schema.fullSchema,
      tableNamesMap: schema.tableNamesMap
    } : {
      schema: undefined,
      fullSchema: {},
      tableNamesMap: {}
    };
    this.query = {};
    const query = this.query;
    if (this._.schema) {
      for (const [tableName, columns] of Object.entries(this._.schema)) {
        query[tableName] = new RelationalQueryBuilder(resultKind, schema.fullSchema, this._.schema, this._.tableNamesMap, schema.fullSchema[tableName], columns, dialect, session);
      }
    }
    this.$cache = { invalidate: async (_params) => {} };
  }
  static [entityKind] = "BaseSQLiteDatabase";
  query;
  $with = (alias, selection) => {
    const self = this;
    const as = (qb) => {
      if (typeof qb === "function") {
        qb = qb(new QueryBuilder(self.dialect));
      }
      return new Proxy(new WithSubquery(qb.getSQL(), selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}), alias, true), new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" }));
    };
    return { as };
  };
  $count(source, filters) {
    return new SQLiteCountBuilder({ source, filters, session: this.session });
  }
  with(...queries) {
    const self = this;
    function select(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? undefined,
        session: self.session,
        dialect: self.dialect,
        withList: queries
      });
    }
    function selectDistinct(fields) {
      return new SQLiteSelectBuilder({
        fields: fields ?? undefined,
        session: self.session,
        dialect: self.dialect,
        withList: queries,
        distinct: true
      });
    }
    function update(table) {
      return new SQLiteUpdateBuilder(table, self.session, self.dialect, queries);
    }
    function insert(into) {
      return new SQLiteInsertBuilder(into, self.session, self.dialect, queries);
    }
    function delete_(from) {
      return new SQLiteDeleteBase(from, self.session, self.dialect, queries);
    }
    return { select, selectDistinct, update, insert, delete: delete_ };
  }
  select(fields) {
    return new SQLiteSelectBuilder({ fields: fields ?? undefined, session: this.session, dialect: this.dialect });
  }
  selectDistinct(fields) {
    return new SQLiteSelectBuilder({
      fields: fields ?? undefined,
      session: this.session,
      dialect: this.dialect,
      distinct: true
    });
  }
  update(table) {
    return new SQLiteUpdateBuilder(table, this.session, this.dialect);
  }
  $cache;
  insert(into) {
    return new SQLiteInsertBuilder(into, this.session, this.dialect);
  }
  delete(from) {
    return new SQLiteDeleteBase(from, this.session, this.dialect);
  }
  run(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(async () => this.session.run(sequel), () => sequel, "run", this.dialect, this.session.extractRawRunValueFromBatchResult.bind(this.session));
    }
    return this.session.run(sequel);
  }
  all(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(async () => this.session.all(sequel), () => sequel, "all", this.dialect, this.session.extractRawAllValueFromBatchResult.bind(this.session));
    }
    return this.session.all(sequel);
  }
  get(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(async () => this.session.get(sequel), () => sequel, "get", this.dialect, this.session.extractRawGetValueFromBatchResult.bind(this.session));
    }
    return this.session.get(sequel);
  }
  values(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    if (this.resultKind === "async") {
      return new SQLiteRaw(async () => this.session.values(sequel), () => sequel, "values", this.dialect, this.session.extractRawValuesValueFromBatchResult.bind(this.session));
    }
    return this.session.values(sequel);
  }
  transaction(transaction, config) {
    return this.session.transaction(transaction, config);
  }
}

// node_modules/drizzle-orm/cache/core/cache.js
class Cache {
  static [entityKind] = "Cache";
}

class NoopCache extends Cache {
  strategy() {
    return "all";
  }
  static [entityKind] = "NoopCache";
  async get(_key) {
    return;
  }
  async put(_hashedQuery, _response, _tables, _config) {}
  async onMutate(_params) {}
}
async function hashQuery(sql2, params) {
  const dataToHash = `${sql2}-${JSON.stringify(params)}`;
  const encoder = new TextEncoder;
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// node_modules/drizzle-orm/sqlite-core/session.js
class ExecuteResultSync extends QueryPromise {
  constructor(resultCb) {
    super();
    this.resultCb = resultCb;
  }
  static [entityKind] = "ExecuteResultSync";
  async execute() {
    return this.resultCb();
  }
  sync() {
    return this.resultCb();
  }
}

class SQLitePreparedQuery {
  constructor(mode, executeMethod, query, cache, queryMetadata, cacheConfig) {
    this.mode = mode;
    this.executeMethod = executeMethod;
    this.query = query;
    this.cache = cache;
    this.queryMetadata = queryMetadata;
    this.cacheConfig = cacheConfig;
    if (cache && cache.strategy() === "all" && cacheConfig === undefined) {
      this.cacheConfig = { enable: true, autoInvalidate: true };
    }
    if (!this.cacheConfig?.enable) {
      this.cacheConfig = undefined;
    }
  }
  static [entityKind] = "PreparedQuery";
  joinsNotNullableMap;
  async queryWithCache(queryString, params, query) {
    if (this.cache === undefined || is(this.cache, NoopCache) || this.queryMetadata === undefined) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (this.cacheConfig && !this.cacheConfig.enable) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if ((this.queryMetadata.type === "insert" || this.queryMetadata.type === "update" || this.queryMetadata.type === "delete") && this.queryMetadata.tables.length > 0) {
      try {
        const [res] = await Promise.all([
          query(),
          this.cache.onMutate({ tables: this.queryMetadata.tables })
        ]);
        return res;
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (!this.cacheConfig) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (this.queryMetadata.type === "select") {
      const fromCache = await this.cache.get(this.cacheConfig.tag ?? await hashQuery(queryString, params), this.queryMetadata.tables, this.cacheConfig.tag !== undefined, this.cacheConfig.autoInvalidate);
      if (fromCache === undefined) {
        let result;
        try {
          result = await query();
        } catch (e) {
          throw new DrizzleQueryError(queryString, params, e);
        }
        await this.cache.put(this.cacheConfig.tag ?? await hashQuery(queryString, params), result, this.cacheConfig.autoInvalidate ? this.queryMetadata.tables : [], this.cacheConfig.tag !== undefined, this.cacheConfig.config);
        return result;
      }
      return fromCache;
    }
    try {
      return await query();
    } catch (e) {
      throw new DrizzleQueryError(queryString, params, e);
    }
  }
  getQuery() {
    return this.query;
  }
  mapRunResult(result, _isFromBatch) {
    return result;
  }
  mapAllResult(_result, _isFromBatch) {
    throw new Error("Not implemented");
  }
  mapGetResult(_result, _isFromBatch) {
    throw new Error("Not implemented");
  }
  execute(placeholderValues) {
    if (this.mode === "async") {
      return this[this.executeMethod](placeholderValues);
    }
    return new ExecuteResultSync(() => this[this.executeMethod](placeholderValues));
  }
  mapResult(response, isFromBatch) {
    switch (this.executeMethod) {
      case "run": {
        return this.mapRunResult(response, isFromBatch);
      }
      case "all": {
        return this.mapAllResult(response, isFromBatch);
      }
      case "get": {
        return this.mapGetResult(response, isFromBatch);
      }
    }
  }
}

class SQLiteSession {
  constructor(dialect) {
    this.dialect = dialect;
  }
  static [entityKind] = "SQLiteSession";
  prepareOneTimeQuery(query, fields, executeMethod, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig) {
    return this.prepareQuery(query, fields, executeMethod, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig);
  }
  run(query) {
    const staticQuery = this.dialect.sqlToQuery(query);
    try {
      return this.prepareOneTimeQuery(staticQuery, undefined, "run", false).run();
    } catch (err) {
      throw new DrizzleError({ cause: err, message: `Failed to run the query '${staticQuery.sql}'` });
    }
  }
  extractRawRunValueFromBatchResult(result) {
    return result;
  }
  all(query) {
    return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), undefined, "run", false).all();
  }
  extractRawAllValueFromBatchResult(_result) {
    throw new Error("Not implemented");
  }
  get(query) {
    return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), undefined, "run", false).get();
  }
  extractRawGetValueFromBatchResult(_result) {
    throw new Error("Not implemented");
  }
  values(query) {
    return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), undefined, "run", false).values();
  }
  async count(sql2) {
    const result = await this.values(sql2);
    return result[0][0];
  }
  extractRawValuesValueFromBatchResult(_result) {
    throw new Error("Not implemented");
  }
}

class SQLiteTransaction extends BaseSQLiteDatabase {
  constructor(resultType, dialect, session, schema, nestedIndex = 0) {
    super(resultType, dialect, session, schema);
    this.schema = schema;
    this.nestedIndex = nestedIndex;
  }
  static [entityKind] = "SQLiteTransaction";
  rollback() {
    throw new TransactionRollbackError;
  }
}

// node_modules/drizzle-orm/bun-sqlite/session.js
class SQLiteBunSession extends SQLiteSession {
  constructor(client, dialect, schema, options = {}) {
    super(dialect);
    this.client = client;
    this.schema = schema;
    this.logger = options.logger ?? new NoopLogger;
  }
  static [entityKind] = "SQLiteBunSession";
  logger;
  exec(query) {
    this.client.exec(query);
  }
  prepareQuery(query, fields, executeMethod, isResponseInArrayMode, customResultMapper) {
    const stmt = this.client.prepare(query.sql);
    return new PreparedQuery(stmt, query, this.logger, fields, executeMethod, isResponseInArrayMode, customResultMapper);
  }
  transaction(transaction, config = {}) {
    const tx = new SQLiteBunTransaction("sync", this.dialect, this, this.schema);
    let result;
    const nativeTx = this.client.transaction(() => {
      result = transaction(tx);
    });
    nativeTx[config.behavior ?? "deferred"]();
    return result;
  }
}

class SQLiteBunTransaction extends SQLiteTransaction {
  static [entityKind] = "SQLiteBunTransaction";
  transaction(transaction) {
    const savepointName = `sp${this.nestedIndex}`;
    const tx = new SQLiteBunTransaction("sync", this.dialect, this.session, this.schema, this.nestedIndex + 1);
    this.session.run(sql.raw(`savepoint ${savepointName}`));
    try {
      const result = transaction(tx);
      this.session.run(sql.raw(`release savepoint ${savepointName}`));
      return result;
    } catch (err) {
      this.session.run(sql.raw(`rollback to savepoint ${savepointName}`));
      throw err;
    }
  }
}

class PreparedQuery extends SQLitePreparedQuery {
  constructor(stmt, query, logger, fields, executeMethod, _isResponseInArrayMode, customResultMapper) {
    super("sync", executeMethod, query);
    this.stmt = stmt;
    this.logger = logger;
    this.fields = fields;
    this._isResponseInArrayMode = _isResponseInArrayMode;
    this.customResultMapper = customResultMapper;
  }
  static [entityKind] = "SQLiteBunPreparedQuery";
  run(placeholderValues) {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return this.stmt.run(...params);
  }
  all(placeholderValues) {
    const { fields, query, logger, joinsNotNullableMap, stmt, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      const params = fillPlaceholders(query.params, placeholderValues ?? {});
      logger.logQuery(query.sql, params);
      return stmt.all(...params);
    }
    const rows = this.values(placeholderValues);
    if (customResultMapper) {
      return customResultMapper(rows);
    }
    return rows.map((row) => mapResultRow(fields, row, joinsNotNullableMap));
  }
  get(placeholderValues) {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    const row = this.stmt.values(...params)[0];
    if (!row) {
      return;
    }
    const { fields, joinsNotNullableMap, customResultMapper } = this;
    if (!fields && !customResultMapper) {
      return row;
    }
    if (customResultMapper) {
      return customResultMapper([row]);
    }
    return mapResultRow(fields, row, joinsNotNullableMap);
  }
  values(placeholderValues) {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);
    return this.stmt.values(...params);
  }
  isResponseInArrayMode() {
    return this._isResponseInArrayMode;
  }
}

// node_modules/drizzle-orm/bun-sqlite/driver.js
class BunSQLiteDatabase extends BaseSQLiteDatabase {
  static [entityKind] = "BunSQLiteDatabase";
}
function construct(client, config = {}) {
  const dialect = new SQLiteSyncDialect({ casing: config.casing });
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger;
  } else if (config.logger !== false) {
    logger = config.logger;
  }
  let schema;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(config.schema, createTableRelationsHelpers);
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const session = new SQLiteBunSession(client, dialect, schema, { logger });
  const db = new BunSQLiteDatabase("sync", dialect, session, schema);
  db.$client = client;
  return db;
}
function drizzle(...params) {
  if (params[0] === undefined || typeof params[0] === "string") {
    const instance = params[0] === undefined ? new Database : new Database(params[0]);
    return construct(instance, params[1]);
  }
  if (isConfig(params[0])) {
    const { connection, client, ...drizzleConfig } = params[0];
    if (client)
      return construct(client, drizzleConfig);
    if (typeof connection === "object") {
      const { source, ...opts } = connection;
      const options = Object.values(opts).filter((v) => v !== undefined).length ? opts : undefined;
      const instance2 = new Database(source, options);
      return construct(instance2, drizzleConfig);
    }
    const instance = new Database(connection);
    return construct(instance, drizzleConfig);
  }
  return construct(params[0], params[1]);
}
((drizzle2) => {
  function mock(config) {
    return construct({}, config);
  }
  drizzle2.mock = mock;
})(drizzle || (drizzle = {}));

// src/bun/db/schema.ts
var exports_schema = {};
__export(exports_schema, {
  tasks: () => tasks,
  taskTags: () => taskTags,
  tags: () => tags,
  subTasks: () => subTasks,
  categories: () => categories
});
var categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull()
});
var tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "completed"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] }).notNull().default("none"),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  dueDate: text("due_date"),
  reminderTime: text("reminder_time"),
  recurrenceRule: text("recurrence_rule"),
  completedAt: text("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var subTasks = sqliteTable("sub_tasks", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", { enum: ["none", "low", "medium", "high"] }).notNull().default("none"),
  dueDate: text("due_date"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull()
});
var tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: text("created_at").notNull()
});
var taskTags = sqliteTable("task_tags", {
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
}, (table) => [primaryKey({ columns: [table.taskId, table.tagId] })]);

// src/bun/db/index.ts
var db = null;
var sqliteDb = null;
function initDatabase(dbPath) {
  if (db)
    return db;
  sqliteDb = new Database2(dbPath, { create: true });
  sqliteDb.exec("PRAGMA journal_mode = WAL");
  sqliteDb.exec("PRAGMA foreign_keys = ON");
  db = drizzle(sqliteDb, { schema: exports_schema });
  createTables(sqliteDb);
  runMigrations(sqliteDb);
  return db;
}
function closeDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    db = null;
  }
}
function getRawDatabase() {
  return sqliteDb;
}
function createTables(sqliteDb2) {
  sqliteDb2.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'completed')),
      priority TEXT NOT NULL DEFAULT 'none' CHECK(priority IN ('none', 'low', 'medium', 'high')),
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      due_date TEXT,
      reminder_time TEXT,
      recurrence_rule TEXT,
      completed_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'none',
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON sub_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
  `);
}
var MIGRATIONS = [
  {
    version: 1,
    description: "Add description, priority, due_date columns to sub_tasks",
    up: (db2) => {
      const columns = db2.query("PRAGMA table_info(sub_tasks)").all();
      const colNames = columns.map((col) => col.name);
      if (!colNames.includes("description")) {
        db2.exec("ALTER TABLE sub_tasks ADD COLUMN description TEXT");
      }
      if (!colNames.includes("priority")) {
        db2.exec("ALTER TABLE sub_tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'");
      }
      if (!colNames.includes("due_date")) {
        db2.exec("ALTER TABLE sub_tasks ADD COLUMN due_date TEXT");
      }
    }
  },
  {
    version: 2,
    description: "Add index on tasks(completed_at) for statistics queries",
    up: (db2) => {
      db2.exec("CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)");
    }
  },
  {
    version: 3,
    description: "Add sort_order column to tasks for drag-and-drop reordering",
    up: (db2) => {
      const columns = db2.query("PRAGMA table_info(tasks)").all();
      const colNames = columns.map((col) => col.name);
      if (!colNames.includes("sort_order")) {
        db2.exec("ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
        db2.exec(`
          UPDATE tasks SET sort_order = (
            SELECT COUNT(*) FROM tasks AS t2 WHERE t2.created_at > tasks.created_at
          )
        `);
      }
      db2.exec("CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)");
    }
  }
];
function getCurrentVersion(db2) {
  try {
    const row = db2.query("SELECT MAX(version) as version FROM schema_version").get();
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}
function runMigrations(sqliteDb2) {
  const currentVersion = getCurrentVersion(sqliteDb2);
  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);
  if (pendingMigrations.length === 0)
    return;
  const runAll = sqliteDb2.transaction(() => {
    for (const migration of pendingMigrations) {
      migration.up(sqliteDb2);
      sqliteDb2.query("INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)").run(migration.version, new Date().toISOString());
    }
  });
  runAll();
}

// node_modules/uuid/dist-node/stringify.js
var byteToHex = [];
for (let i = 0;i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/uuid/dist-node/rng.js
import { randomFillSync } from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist-node/native.js
import { randomUUID } from "crypto";
var native_default = { randomUUID };

// node_modules/uuid/dist-node/v4.js
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0;i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  return _v4(options, buf, offset);
}
var v4_default = v4;
// src/shared/types.ts
class AppException extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "AppException";
    this.code = code;
    this.details = details;
  }
  toAppError() {
    return {
      code: this.code,
      message: this.message,
      ...this.details ? { details: this.details } : {}
    };
  }
}

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1000;
var minTime = -maxTime;
var millisecondsInWeek = 604800000;
var millisecondsInDay = 86400000;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function")
    return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date)
    return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/addDays.js
function addDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount))
    return constructFrom(options?.in || date, NaN);
  if (!amount)
    return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}

// node_modules/date-fns/addMonths.js
function addMonths(date, amount, options) {
  const _date = toDate(date, options?.in);
  if (isNaN(amount))
    return constructFrom(options?.in || date, NaN);
  if (!amount) {
    return _date;
  }
  const dayOfMonth = _date.getDate();
  const endOfDesiredMonth = constructFrom(options?.in || date, _date.getTime());
  endOfDesiredMonth.setMonth(_date.getMonth() + amount + 1, 0);
  const daysInMonth = endOfDesiredMonth.getDate();
  if (dayOfMonth >= daysInMonth) {
    return endOfDesiredMonth;
  } else {
    _date.setFullYear(endOfDesiredMonth.getFullYear(), endOfDesiredMonth.getMonth(), dayOfMonth);
    return _date;
  }
}

// node_modules/date-fns/_lib/defaultOptions.js
var defaultOptions3 = {};
function getDefaultOptions() {
  return defaultOptions3;
}

// node_modules/date-fns/startOfWeek.js
function startOfWeek(date, options) {
  const defaultOptions4 = getDefaultOptions();
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions4.weekStartsOn ?? defaultOptions4.locale?.options?.weekStartsOn ?? 0;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  _date.setDate(_date.getDate() - diff);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/startOfISOWeek.js
function startOfISOWeek(date, options) {
  return startOfWeek(date, { ...options, weekStartsOn: 1 });
}

// node_modules/date-fns/getISOWeekYear.js
function getISOWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
  const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
  if (_date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (_date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
function getTimezoneOffsetInMilliseconds(date) {
  const _date = toDate(date);
  const utcDate = new Date(Date.UTC(_date.getFullYear(), _date.getMonth(), _date.getDate(), _date.getHours(), _date.getMinutes(), _date.getSeconds(), _date.getMilliseconds()));
  utcDate.setUTCFullYear(_date.getFullYear());
  return +date - +utcDate;
}

// node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
  const normalize = constructFrom.bind(null, context || dates.find((date) => typeof date === "object"));
  return dates.map(normalize);
}

// node_modules/date-fns/startOfDay.js
function startOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/differenceInCalendarDays.js
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(options?.in, laterDate, earlierDate);
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}

// node_modules/date-fns/startOfISOWeekYear.js
function startOfISOWeekYear(date, options) {
  const year = getISOWeekYear(date, options);
  const fourthOfJanuary = constructFrom(options?.in || date, 0);
  fourthOfJanuary.setFullYear(year, 0, 4);
  fourthOfJanuary.setHours(0, 0, 0, 0);
  return startOfISOWeek(fourthOfJanuary);
}

// node_modules/date-fns/addWeeks.js
function addWeeks(date, amount, options) {
  return addDays(date, amount * 7, options);
}

// node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}

// node_modules/date-fns/endOfDay.js
function endOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(23, 59, 59, 999);
  return _date;
}

// node_modules/date-fns/endOfMonth.js
function endOfMonth(date, options) {
  const _date = toDate(date, options?.in);
  const month = _date.getMonth();
  _date.setFullYear(_date.getFullYear(), month + 1, 0);
  _date.setHours(23, 59, 59, 999);
  return _date;
}

// node_modules/date-fns/startOfMonth.js
function startOfMonth(date, options) {
  const _date = toDate(date, options?.in);
  _date.setDate(1);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/startOfYear.js
function startOfYear(date, options) {
  const date_ = toDate(date, options?.in);
  date_.setFullYear(date_.getFullYear(), 0, 1);
  date_.setHours(0, 0, 0, 0);
  return date_;
}

// node_modules/date-fns/endOfWeek.js
function endOfWeek(date, options) {
  const defaultOptions4 = getDefaultOptions();
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions4.weekStartsOn ?? defaultOptions4.locale?.options?.weekStartsOn ?? 0;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn);
  _date.setDate(_date.getDate() + diff);
  _date.setHours(23, 59, 59, 999);
  return _date;
}

// node_modules/date-fns/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = (token, count, options) => {
  let result;
  const tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options?.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};

// node_modules/date-fns/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
  return (options = {}) => {
    const width = options.width ? String(options.width) : args.defaultWidth;
    const format = args.formats[width] || args.formats[args.defaultWidth];
    return format;
  };
}

// node_modules/date-fns/locale/en-US/_lib/formatLong.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};

// node_modules/date-fns/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = (token, _date, _baseDate, _options) => formatRelativeLocale[token];

// node_modules/date-fns/locale/_lib/buildLocalizeFn.js
function buildLocalizeFn(args) {
  return (value, options) => {
    const context = options?.context ? String(options.context) : "standalone";
    let valuesArray;
    if (context === "formatting" && args.formattingValues) {
      const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      const width = options?.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      const defaultWidth = args.defaultWidth;
      const width = options?.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[width] || args.values[defaultWidth];
    }
    const index = args.argumentCallback ? args.argumentCallback(value) : value;
    return valuesArray[index];
  };
}

// node_modules/date-fns/locale/en-US/_lib/localize.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  wide: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = (dirtyNumber, _options) => {
  const number = Number(dirtyNumber);
  const rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: (quarter) => quarter - 1
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};

// node_modules/date-fns/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
  return (string, options = {}) => {
    const width = options.width;
    const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    const matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    const matchedString = matchResult[0];
    const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : findKey(parsePatterns, (pattern) => pattern.test(matchedString));
    let value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? options.valueCallback(value) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}
function findKey(object, predicate) {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) {
      return key;
    }
  }
  return;
}
function findIndex(array, predicate) {
  for (let key = 0;key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return;
}

// node_modules/date-fns/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
  return (string, options = {}) => {
    const matchResult = string.match(args.matchPattern);
    if (!matchResult)
      return null;
    const matchedString = matchResult[0];
    const parseResult = string.match(args.parsePattern);
    if (!parseResult)
      return null;
    let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}

// node_modules/date-fns/locale/en-US/_lib/match.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [
    /^j/i,
    /^f/i,
    /^m/i,
    /^a/i,
    /^m/i,
    /^j/i,
    /^j/i,
    /^a/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ap/i,
    /^may/i,
    /^jun/i,
    /^jul/i,
    /^au/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: (value) => parseInt(value, 10)
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: (index) => index + 1
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};

// node_modules/date-fns/locale/en-US.js
var enUS = {
  code: "en-US",
  formatDistance,
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};
// node_modules/date-fns/getDayOfYear.js
function getDayOfYear(date, options) {
  const _date = toDate(date, options?.in);
  const diff = differenceInCalendarDays(_date, startOfYear(_date));
  const dayOfYear = diff + 1;
  return dayOfYear;
}

// node_modules/date-fns/getISOWeek.js
function getISOWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/getWeekYear.js
function getWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const defaultOptions4 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions4.firstWeekContainsDate ?? defaultOptions4.locale?.options?.firstWeekContainsDate ?? 1;
  const firstWeekOfNextYear = constructFrom(options?.in || date, 0);
  firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
  const firstWeekOfThisYear = constructFrom(options?.in || date, 0);
  firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
  if (+_date >= +startOfNextYear) {
    return year + 1;
  } else if (+_date >= +startOfThisYear) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/startOfWeekYear.js
function startOfWeekYear(date, options) {
  const defaultOptions4 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions4.firstWeekContainsDate ?? defaultOptions4.locale?.options?.firstWeekContainsDate ?? 1;
  const year = getWeekYear(date, options);
  const firstWeek = constructFrom(options?.in || date, 0);
  firstWeek.setFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setHours(0, 0, 0, 0);
  const _date = startOfWeek(firstWeek, options);
  return _date;
}

// node_modules/date-fns/getWeek.js
function getWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/_lib/addLeadingZeros.js
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}

// node_modules/date-fns/_lib/format/lightFormatters.js
var lightFormatters = {
  y(date, token) {
    const signedYear = date.getFullYear();
    const year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
  },
  M(date, token) {
    const month = date.getMonth();
    return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  d(date, token) {
    return addLeadingZeros(date.getDate(), token.length);
  },
  a(date, token) {
    const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  h(date, token) {
    return addLeadingZeros(date.getHours() % 12 || 12, token.length);
  },
  H(date, token) {
    return addLeadingZeros(date.getHours(), token.length);
  },
  m(date, token) {
    return addLeadingZeros(date.getMinutes(), token.length);
  },
  s(date, token) {
    return addLeadingZeros(date.getSeconds(), token.length);
  },
  S(date, token) {
    const numberOfDigits = token.length;
    const milliseconds = date.getMilliseconds();
    const fractionalSeconds = Math.trunc(milliseconds * Math.pow(10, numberOfDigits - 3));
    return addLeadingZeros(fractionalSeconds, token.length);
  }
};

// node_modules/date-fns/_lib/format/formatters.js
var dayPeriodEnum = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
var formatters = {
  G: function(date, token, localize2) {
    const era = date.getFullYear() > 0 ? 1 : 0;
    switch (token) {
      case "G":
      case "GG":
      case "GGG":
        return localize2.era(era, { width: "abbreviated" });
      case "GGGGG":
        return localize2.era(era, { width: "narrow" });
      case "GGGG":
      default:
        return localize2.era(era, { width: "wide" });
    }
  },
  y: function(date, token, localize2) {
    if (token === "yo") {
      const signedYear = date.getFullYear();
      const year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize2.ordinalNumber(year, { unit: "year" });
    }
    return lightFormatters.y(date, token);
  },
  Y: function(date, token, localize2, options) {
    const signedWeekYear = getWeekYear(date, options);
    const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token === "YY") {
      const twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token === "Yo") {
      return localize2.ordinalNumber(weekYear, { unit: "year" });
    }
    return addLeadingZeros(weekYear, token.length);
  },
  R: function(date, token) {
    const isoWeekYear = getISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token.length);
  },
  u: function(date, token) {
    const year = date.getFullYear();
    return addLeadingZeros(year, token.length);
  },
  Q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      case "Q":
        return String(quarter);
      case "QQ":
        return addLeadingZeros(quarter, 2);
      case "Qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      case "QQQ":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      case "QQQQQ":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      case "QQQQ":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      case "q":
        return String(quarter);
      case "qq":
        return addLeadingZeros(quarter, 2);
      case "qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      case "qqq":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      case "qqqqq":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      case "qqqq":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  M: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "M":
      case "MM":
        return lightFormatters.M(date, token);
      case "Mo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      case "MMM":
        return localize2.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      case "MMMMM":
        return localize2.month(month, {
          width: "narrow",
          context: "formatting"
        });
      case "MMMM":
      default:
        return localize2.month(month, { width: "wide", context: "formatting" });
    }
  },
  L: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "L":
        return String(month + 1);
      case "LL":
        return addLeadingZeros(month + 1, 2);
      case "Lo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      case "LLL":
        return localize2.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      case "LLLLL":
        return localize2.month(month, {
          width: "narrow",
          context: "standalone"
        });
      case "LLLL":
      default:
        return localize2.month(month, { width: "wide", context: "standalone" });
    }
  },
  w: function(date, token, localize2, options) {
    const week = getWeek(date, options);
    if (token === "wo") {
      return localize2.ordinalNumber(week, { unit: "week" });
    }
    return addLeadingZeros(week, token.length);
  },
  I: function(date, token, localize2) {
    const isoWeek = getISOWeek(date);
    if (token === "Io") {
      return localize2.ordinalNumber(isoWeek, { unit: "week" });
    }
    return addLeadingZeros(isoWeek, token.length);
  },
  d: function(date, token, localize2) {
    if (token === "do") {
      return localize2.ordinalNumber(date.getDate(), { unit: "date" });
    }
    return lightFormatters.d(date, token);
  },
  D: function(date, token, localize2) {
    const dayOfYear = getDayOfYear(date);
    if (token === "Do") {
      return localize2.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
    }
    return addLeadingZeros(dayOfYear, token.length);
  },
  E: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    switch (token) {
      case "E":
      case "EE":
      case "EEE":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "EEEEE":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "EEEEEE":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "EEEE":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  e: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      case "e":
        return String(localDayOfWeek);
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      case "eo":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "eee":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "eeeee":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "eeeeee":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "eeee":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  c: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      case "c":
        return String(localDayOfWeek);
      case "cc":
        return addLeadingZeros(localDayOfWeek, token.length);
      case "co":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "ccc":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      case "ccccc":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      case "cccccc":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      case "cccc":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  i: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token) {
      case "i":
        return String(isoDayOfWeek);
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token.length);
      case "io":
        return localize2.ordinalNumber(isoDayOfWeek, { unit: "day" });
      case "iii":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "iiiii":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "iiiiii":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "iiii":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  a: function(date, token, localize2) {
    const hours = date.getHours();
    const dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  b: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token) {
      case "b":
      case "bb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  B: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token) {
      case "B":
      case "BB":
      case "BBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  h: function(date, token, localize2) {
    if (token === "ho") {
      let hours = date.getHours() % 12;
      if (hours === 0)
        hours = 12;
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return lightFormatters.h(date, token);
  },
  H: function(date, token, localize2) {
    if (token === "Ho") {
      return localize2.ordinalNumber(date.getHours(), { unit: "hour" });
    }
    return lightFormatters.H(date, token);
  },
  K: function(date, token, localize2) {
    const hours = date.getHours() % 12;
    if (token === "Ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  k: function(date, token, localize2) {
    let hours = date.getHours();
    if (hours === 0)
      hours = 24;
    if (token === "ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  m: function(date, token, localize2) {
    if (token === "mo") {
      return localize2.ordinalNumber(date.getMinutes(), { unit: "minute" });
    }
    return lightFormatters.m(date, token);
  },
  s: function(date, token, localize2) {
    if (token === "so") {
      return localize2.ordinalNumber(date.getSeconds(), { unit: "second" });
    }
    return lightFormatters.s(date, token);
  },
  S: function(date, token) {
    return lightFormatters.S(date, token);
  },
  X: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token) {
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      case "XXXXX":
      case "XXX":
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  x: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      case "xxxxx":
      case "xxx":
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  O: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  z: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  t: function(date, token, _localize) {
    const timestamp = Math.trunc(+date / 1000);
    return addLeadingZeros(timestamp, token.length);
  },
  T: function(date, token, _localize) {
    return addLeadingZeros(+date, token.length);
  }
};
function formatTimezoneShort(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = Math.trunc(absOffset / 60);
  const minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
function formatTimezoneWithOptionalMinutes(offset, delimiter) {
  if (offset % 60 === 0) {
    const sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, delimiter);
}
function formatTimezone(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
  const minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}

// node_modules/date-fns/_lib/format/longFormatters.js
var dateLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "P":
      return formatLong2.date({ width: "short" });
    case "PP":
      return formatLong2.date({ width: "medium" });
    case "PPP":
      return formatLong2.date({ width: "long" });
    case "PPPP":
    default:
      return formatLong2.date({ width: "full" });
  }
};
var timeLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "p":
      return formatLong2.time({ width: "short" });
    case "pp":
      return formatLong2.time({ width: "medium" });
    case "ppp":
      return formatLong2.time({ width: "long" });
    case "pppp":
    default:
      return formatLong2.time({ width: "full" });
  }
};
var dateTimeLongFormatter = (pattern, formatLong2) => {
  const matchResult = pattern.match(/(P+)(p+)?/) || [];
  const datePattern = matchResult[1];
  const timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong2);
  }
  let dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong2.dateTime({ width: "short" });
      break;
    case "PP":
      dateTimeFormat = formatLong2.dateTime({ width: "medium" });
      break;
    case "PPP":
      dateTimeFormat = formatLong2.dateTime({ width: "long" });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong2.dateTime({ width: "full" });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong2)).replace("{{time}}", timeLongFormatter(timePattern, formatLong2));
};
var longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};

// node_modules/date-fns/_lib/protectedTokens.js
var dayOfYearTokenRE = /^D+$/;
var weekYearTokenRE = /^Y+$/;
var throwTokens = ["D", "DD", "YY", "YYYY"];
function isProtectedDayOfYearToken(token) {
  return dayOfYearTokenRE.test(token);
}
function isProtectedWeekYearToken(token) {
  return weekYearTokenRE.test(token);
}
function warnOrThrowProtectedError(token, format, input) {
  const _message = message(token, format, input);
  console.warn(_message);
  if (throwTokens.includes(token))
    throw new RangeError(_message);
}
function message(token, format, input) {
  const subject = token[0] === "Y" ? "years" : "days of the month";
  return `Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
}

// node_modules/date-fns/format.js
var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
var escapedStringRegExp = /^'([^]*?)'?$/;
var doubleQuoteRegExp = /''/g;
var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(date, formatStr, options) {
  const defaultOptions4 = getDefaultOptions();
  const locale = options?.locale ?? defaultOptions4.locale ?? enUS;
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions4.firstWeekContainsDate ?? defaultOptions4.locale?.options?.firstWeekContainsDate ?? 1;
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions4.weekStartsOn ?? defaultOptions4.locale?.options?.weekStartsOn ?? 0;
  const originalDate = toDate(date, options?.in);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
    const firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      const longFormatter = longFormatters[firstCharacter];
      return longFormatter(substring, locale.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map((substring) => {
    if (substring === "''") {
      return { isToken: false, value: "'" };
    }
    const firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return { isToken: false, value: cleanEscapedString(substring) };
    }
    if (formatters[firstCharacter]) {
      return { isToken: true, value: substring };
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError("Format string contains an unescaped latin alphabet character `" + firstCharacter + "`");
    }
    return { isToken: false, value: substring };
  });
  if (locale.localize.preprocessor) {
    parts = locale.localize.preprocessor(originalDate, parts);
  }
  const formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale
  };
  return parts.map((part) => {
    if (!part.isToken)
      return part.value;
    const token = part.value;
    if (!options?.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token) || !options?.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) {
      warnOrThrowProtectedError(token, formatStr, String(date));
    }
    const formatter = formatters[token[0]];
    return formatter(originalDate, token, locale.localize, formatterOptions);
  }).join("");
}
function cleanEscapedString(input) {
  const matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
}

// node_modules/date-fns/getDay.js
function getDay(date, options) {
  return toDate(date, options?.in).getDay();
}

// node_modules/date-fns/getDaysInMonth.js
function getDaysInMonth(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const monthIndex = _date.getMonth();
  const lastDayOfMonth = constructFrom(_date, 0);
  lastDayOfMonth.setFullYear(year, monthIndex + 1, 0);
  lastDayOfMonth.setHours(0, 0, 0, 0);
  return lastDayOfMonth.getDate();
}

// node_modules/date-fns/subDays.js
function subDays(date, amount, options) {
  return addDays(date, -amount, options);
}

// node_modules/date-fns/setDate.js
function setDate(date, dayOfMonth, options) {
  const _date = toDate(date, options?.in);
  _date.setDate(dayOfMonth);
  return _date;
}

// src/bun/utils/recurrence.ts
function getNextOccurrence(rule, currentDate) {
  switch (rule.type) {
    case "daily":
      return addDays(currentDate, rule.interval);
    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return getNextWeeklyOccurrence(currentDate, rule.interval, rule.daysOfWeek);
      }
      return addWeeks(currentDate, rule.interval);
    case "monthly":
      return getNextMonthlyOccurrence(currentDate, rule.interval, rule.dayOfMonth);
    case "custom":
      return addDays(currentDate, rule.interval);
    default:
      return addDays(currentDate, 1);
  }
}
function getNextWeeklyOccurrence(currentDate, interval, daysOfWeek) {
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  const currentDay = getDay(currentDate);
  for (const day of sorted) {
    if (day > currentDay) {
      return addDays(currentDate, day - currentDay);
    }
  }
  const firstDay = sorted[0];
  const daysUntilNextWeek = 7 * interval - (currentDay - firstDay);
  return addDays(currentDate, daysUntilNextWeek);
}
function getNextMonthlyOccurrence(currentDate, interval, dayOfMonth) {
  const nextMonth = addMonths(currentDate, interval);
  if (dayOfMonth) {
    const maxDay = getDaysInMonth(nextMonth);
    const clampedDay = Math.min(dayOfMonth, maxDay);
    return setDate(nextMonth, clampedDay);
  }
  return nextMonth;
}

// src/bun/utils/mappers.ts
function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.categoryId,
    dueDate: row.dueDate,
    reminderTime: row.reminderTime,
    recurrenceRule: row.recurrenceRule ? JSON.parse(row.recurrenceRule) : null,
    completedAt: row.completedAt,
    sortOrder: row.sortOrder ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
function rowToSubTask(row) {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    description: row.description ?? null,
    priority: row.priority ?? "none",
    dueDate: row.dueDate ?? null,
    completed: row.completed,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt
  };
}

// src/bun/services/task.service.ts
class TaskService {
  db;
  rawDb;
  constructor(db2, rawDb) {
    this.db = db2;
    this.rawDb = rawDb;
  }
  validateTitle(title) {
    if (!title || title.trim().length === 0) {
      throw new AppException("VALIDATION_ERROR", "Title must not be empty or whitespace-only");
    }
  }
  create(input) {
    this.validateTitle(input.title);
    const id = v4_default();
    const now = new Date().toISOString();
    this.db.update(tasks).set({ sortOrder: sql`${tasks.sortOrder} + 1` }).run();
    const row = {
      id,
      title: input.title.trim(),
      description: input.description ?? null,
      status: "todo",
      priority: input.priority ?? "none",
      categoryId: input.categoryId ?? null,
      dueDate: input.dueDate ?? null,
      reminderTime: input.reminderTime ?? null,
      recurrenceRule: input.recurrenceRule ? JSON.stringify(input.recurrenceRule) : null,
      completedAt: null,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };
    this.db.insert(tasks).values(row).run();
    return rowToTask(row);
  }
  getById(id) {
    const row = this.db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!row)
      return null;
    const task = rowToTask(row);
    const subTaskRows = this.db.select().from(subTasks).where(eq(subTasks.taskId, id)).orderBy(subTasks.sortOrder).all();
    task.subTasks = subTaskRows.map((r) => rowToSubTask(r));
    const tagRows = this.db.select({ tag: tags }).from(taskTags).innerJoin(tags, eq(taskTags.tagId, tags.id)).where(eq(taskTags.taskId, id)).all();
    task.tags = tagRows.map((r) => ({
      id: r.tag.id,
      name: r.tag.name,
      color: r.tag.color,
      createdAt: r.tag.createdAt
    }));
    return task;
  }
  getAll(filter) {
    let rows;
    if (filter?.status) {
      rows = this.db.select().from(tasks).where(eq(tasks.status, filter.status)).orderBy(tasks.sortOrder).all();
    } else {
      rows = this.db.select().from(tasks).orderBy(tasks.sortOrder).all();
    }
    const taskList = rows.map((r) => rowToTask(r));
    if (taskList.length === 0)
      return taskList;
    const allSubTasks = this.db.select().from(subTasks).orderBy(subTasks.sortOrder).all();
    const subTasksByTaskId = new Map;
    for (const st of allSubTasks) {
      const list = subTasksByTaskId.get(st.taskId) ?? [];
      list.push(st);
      subTasksByTaskId.set(st.taskId, list);
    }
    const allTaskTags = this.db.select({ taskId: taskTags.taskId, tag: tags }).from(taskTags).innerJoin(tags, eq(taskTags.tagId, tags.id)).all();
    const tagsByTaskId = new Map;
    for (const row of allTaskTags) {
      const list = tagsByTaskId.get(row.taskId) ?? [];
      list.push({ id: row.tag.id, name: row.tag.name, color: row.tag.color, createdAt: row.tag.createdAt });
      tagsByTaskId.set(row.taskId, list);
    }
    for (const task of taskList) {
      const stRows = subTasksByTaskId.get(task.id);
      task.subTasks = stRows ? stRows.map((r) => rowToSubTask(r)) : [];
      task.tags = tagsByTaskId.get(task.id) ?? [];
    }
    return taskList;
  }
  update(id, input) {
    if (input.title !== undefined) {
      this.validateTitle(input.title);
    }
    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      throw new AppException("NOT_FOUND", "Task not found");
    }
    const now = new Date().toISOString();
    const updates = { updatedAt: now };
    if (input.title !== undefined)
      updates.title = input.title.trim();
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.priority !== undefined)
      updates.priority = input.priority;
    if (input.categoryId !== undefined)
      updates.categoryId = input.categoryId;
    if (input.dueDate !== undefined)
      updates.dueDate = input.dueDate;
    if (input.reminderTime !== undefined)
      updates.reminderTime = input.reminderTime;
    if (input.recurrenceRule !== undefined) {
      updates.recurrenceRule = input.recurrenceRule ? JSON.stringify(input.recurrenceRule) : null;
    }
    this.db.update(tasks).set(updates).where(eq(tasks.id, id)).run();
    return this.getById(id);
  }
  delete(id) {
    this.db.delete(tasks).where(eq(tasks.id, id)).run();
  }
  complete(id) {
    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      throw new AppException("NOT_FOUND", "Task not found");
    }
    const now = new Date().toISOString();
    this.db.update(tasks).set({
      status: "completed",
      completedAt: now,
      updatedAt: now
    }).where(eq(tasks.id, id)).run();
    const completedTask = this.getById(id);
    let nextTask;
    if (existing.recurrenceRule) {
      const rule = JSON.parse(existing.recurrenceRule);
      const currentDate = existing.dueDate ? new Date(existing.dueDate) : new Date;
      const nextDate = getNextOccurrence(rule, currentDate);
      if (rule.endDate && nextDate > new Date(rule.endDate)) {
        return { completedTask };
      }
      nextTask = this.create({
        title: existing.title,
        description: existing.description ?? undefined,
        priority: existing.priority,
        categoryId: existing.categoryId ?? undefined,
        dueDate: nextDate.toISOString().split("T")[0],
        reminderTime: existing.reminderTime ?? undefined,
        recurrenceRule: rule
      });
    }
    return { completedTask, nextTask };
  }
  createSubTask(taskId, input) {
    this.validateTitle(input.title);
    const parent = this.db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (!parent) {
      throw new AppException("NOT_FOUND", "Parent task not found");
    }
    const id = v4_default();
    const now = new Date().toISOString();
    const maxOrder = this.db.select({ max: sql`MAX(${subTasks.sortOrder})` }).from(subTasks).where(eq(subTasks.taskId, taskId)).get();
    const row = {
      id,
      taskId,
      title: input.title.trim(),
      description: input.description ?? null,
      priority: input.priority ?? "none",
      dueDate: input.dueDate ?? null,
      completed: false,
      sortOrder: input.sortOrder ?? (maxOrder?.max ?? -1) + 1,
      createdAt: now
    };
    this.db.insert(subTasks).values(row).run();
    return rowToSubTask(row);
  }
  updateSubTask(id, input) {
    if (input.title !== undefined) {
      this.validateTitle(input.title);
    }
    const existing = this.db.select().from(subTasks).where(eq(subTasks.id, id)).get();
    if (!existing) {
      throw new AppException("NOT_FOUND", "Sub-task not found");
    }
    const updates = {};
    if (input.title !== undefined)
      updates.title = input.title.trim();
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.priority !== undefined)
      updates.priority = input.priority;
    if (input.dueDate !== undefined)
      updates.dueDate = input.dueDate;
    if (input.completed !== undefined)
      updates.completed = input.completed;
    if (input.sortOrder !== undefined)
      updates.sortOrder = input.sortOrder;
    if (Object.keys(updates).length > 0) {
      this.db.update(subTasks).set(updates).where(eq(subTasks.id, id)).run();
    }
    const updated = this.db.select().from(subTasks).where(eq(subTasks.id, id)).get();
    return rowToSubTask(updated);
  }
  deleteSubTask(id) {
    this.db.delete(subTasks).where(eq(subTasks.id, id)).run();
  }
  getSubTasks(taskId) {
    const rows = this.db.select().from(subTasks).where(eq(subTasks.taskId, taskId)).orderBy(subTasks.sortOrder).all();
    return rows.map((r) => rowToSubTask(r));
  }
  reorder(items) {
    if (items.length === 0)
      return;
    if (this.rawDb) {
      const updateStmt = this.rawDb.prepare("UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?");
      const now = new Date().toISOString();
      const runAll = this.rawDb.transaction(() => {
        for (const item of items) {
          updateStmt.run(item.sortOrder, now, item.id);
        }
      });
      runAll();
    } else {
      const now = new Date().toISOString();
      for (const item of items) {
        this.db.update(tasks).set({ sortOrder: item.sortOrder, updatedAt: now }).where(eq(tasks.id, item.id)).run();
      }
    }
  }
  count(filter) {
    if (filter?.status) {
      const result2 = this.db.select({ count: sql`COUNT(*)` }).from(tasks).where(eq(tasks.status, filter.status)).get();
      return result2?.count ?? 0;
    }
    const result = this.db.select({ count: sql`COUNT(*)` }).from(tasks).get();
    return result?.count ?? 0;
  }
}

// src/bun/services/category.service.ts
class CategoryService {
  db;
  constructor(db2) {
    this.db = db2;
  }
  rowToCategory(row) {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt
    };
  }
  create(input) {
    if (!input.name || input.name.trim().length === 0) {
      throw new AppException("VALIDATION_ERROR", "Category name must not be empty");
    }
    const existing = this.db.select().from(categories).where(eq(categories.name, input.name.trim())).get();
    if (existing) {
      throw new AppException("VALIDATION_ERROR", "Category name already exists");
    }
    const id = v4_default();
    const now = new Date().toISOString();
    const maxOrder = this.db.select({ max: sql`MAX(${categories.sortOrder})` }).from(categories).get();
    const row = {
      id,
      name: input.name.trim(),
      color: input.color ?? null,
      sortOrder: (maxOrder?.max ?? -1) + 1,
      createdAt: now
    };
    this.db.insert(categories).values(row).run();
    return this.rowToCategory(row);
  }
  getAll() {
    const rows = this.db.select().from(categories).orderBy(categories.sortOrder).all();
    return rows.map((r) => this.rowToCategory(r));
  }
  getById(id) {
    const row = this.db.select().from(categories).where(eq(categories.id, id)).get();
    return row ? this.rowToCategory(row) : null;
  }
  update(id, input) {
    const existing = this.db.select().from(categories).where(eq(categories.id, id)).get();
    if (!existing) {
      throw new AppException("NOT_FOUND", "Category not found");
    }
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new AppException("VALIDATION_ERROR", "Category name must not be empty");
      }
      const dup = this.db.select().from(categories).where(eq(categories.name, input.name.trim())).get();
      if (dup && dup.id !== id) {
        throw new AppException("VALIDATION_ERROR", "Category name already exists");
      }
    }
    const updates = {};
    if (input.name !== undefined)
      updates.name = input.name.trim();
    if (input.color !== undefined)
      updates.color = input.color;
    if (input.sortOrder !== undefined)
      updates.sortOrder = input.sortOrder;
    if (Object.keys(updates).length > 0) {
      this.db.update(categories).set(updates).where(eq(categories.id, id)).run();
    }
    return this.getById(id);
  }
  delete(id) {
    this.db.delete(categories).where(eq(categories.id, id)).run();
  }
  count() {
    const result = this.db.select({ count: sql`COUNT(*)` }).from(categories).get();
    return result?.count ?? 0;
  }
}

// src/bun/services/tag.service.ts
class TagService {
  db;
  constructor(db2) {
    this.db = db2;
  }
  rowToTag(row) {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt
    };
  }
  create(name, color) {
    if (!name || name.trim().length === 0) {
      throw new AppException("VALIDATION_ERROR", "Tag name must not be empty");
    }
    const existing = this.db.select().from(tags).where(eq(tags.name, name.trim())).get();
    if (existing) {
      throw new AppException("VALIDATION_ERROR", "Tag name already exists");
    }
    const id = v4_default();
    const now = new Date().toISOString();
    const row = {
      id,
      name: name.trim(),
      color: color ?? null,
      createdAt: now
    };
    this.db.insert(tags).values(row).run();
    return this.rowToTag(row);
  }
  update(id, name, color) {
    const existing = this.db.select().from(tags).where(eq(tags.id, id)).get();
    if (!existing) {
      throw new AppException("NOT_FOUND", "Tag not found");
    }
    if (!name || name.trim().length === 0) {
      throw new AppException("VALIDATION_ERROR", "Tag name must not be empty");
    }
    const duplicate = this.db.select().from(tags).where(and(eq(tags.name, name.trim()), sql`${tags.id} != ${id}`)).get();
    if (duplicate) {
      throw new AppException("VALIDATION_ERROR", "Tag name already exists");
    }
    const updates = { name: name.trim() };
    if (color !== undefined)
      updates.color = color ?? null;
    this.db.update(tags).set(updates).where(eq(tags.id, id)).run();
    const updated = this.db.select().from(tags).where(eq(tags.id, id)).get();
    return this.rowToTag(updated);
  }
  getAll() {
    return this.db.select().from(tags).orderBy(tags.name).all().map((r) => this.rowToTag(r));
  }
  getById(id) {
    const row = this.db.select().from(tags).where(eq(tags.id, id)).get();
    return row ? this.rowToTag(row) : null;
  }
  delete(id) {
    this.db.delete(tags).where(eq(tags.id, id)).run();
  }
  addToTask(taskId, tagId) {
    const existing = this.db.select().from(taskTags).where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId))).get();
    if (existing)
      return;
    this.db.insert(taskTags).values({ taskId, tagId }).run();
  }
  removeFromTask(taskId, tagId) {
    this.db.delete(taskTags).where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId))).run();
  }
  getTagsForTask(taskId) {
    const rows = this.db.select({ tag: tags }).from(taskTags).innerJoin(tags, eq(taskTags.tagId, tags.id)).where(eq(taskTags.taskId, taskId)).all();
    return rows.map((r) => this.rowToTag(r.tag));
  }
  findTaskIdsByTags(tagIds) {
    if (tagIds.length === 0)
      return [];
    const taskIdSets = tagIds.map((tagId) => {
      const rows = this.db.select({ taskId: taskTags.taskId }).from(taskTags).where(eq(taskTags.tagId, tagId)).all();
      return new Set(rows.map((r) => r.taskId));
    });
    let result = taskIdSets[0];
    for (let i = 1;i < taskIdSets.length; i++) {
      result = new Set([...result].filter((id) => taskIdSets[i].has(id)));
    }
    return [...result];
  }
  count() {
    const result = this.db.select({ count: sql`COUNT(*)` }).from(tags).get();
    return result?.count ?? 0;
  }
}

// src/bun/services/search.service.ts
class SearchService {
  db;
  tagService;
  constructor(db2, tagService) {
    this.db = db2;
    this.tagService = tagService;
  }
  search(query, filters) {
    const conditions = [];
    if (query && query.trim().length > 0) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push(or(like(tasks.title, searchTerm), like(tasks.description, searchTerm)));
    }
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    if (filters?.categoryId !== undefined) {
      if (filters.categoryId === null) {
        conditions.push(sql`${tasks.categoryId} IS NULL`);
      } else {
        conditions.push(eq(tasks.categoryId, filters.categoryId));
      }
    }
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }
    if (filters?.dueDateFrom) {
      conditions.push(gte(tasks.dueDate, filters.dueDateFrom));
    }
    if (filters?.dueDateTo) {
      conditions.push(lte(tasks.dueDate, filters.dueDateTo));
    }
    let queryBuilder = this.db.select().from(tasks);
    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }
    const sortBy = filters?.sortBy ?? "createdAt";
    const sortOrder = filters?.sortOrder ?? "desc";
    const priorityOrder = sql`CASE ${tasks.priority} 
      WHEN 'high' THEN 0 
      WHEN 'medium' THEN 1 
      WHEN 'low' THEN 2 
      WHEN 'none' THEN 3 
    END`;
    let sortCol;
    if (sortBy === "priority") {
      sortCol = sortOrder === "asc" ? asc(priorityOrder) : desc(priorityOrder);
    } else if (sortBy === "dueDate") {
      sortCol = sortOrder === "asc" ? asc(tasks.dueDate) : desc(tasks.dueDate);
    } else {
      sortCol = sortOrder === "asc" ? asc(tasks.createdAt) : desc(tasks.createdAt);
    }
    const rows = queryBuilder.orderBy(sortCol).all();
    let results = rows.map((r) => rowToTask(r));
    if (filters?.tagIds && filters.tagIds.length > 0) {
      const matchingTaskIds = new Set(this.tagService.findTaskIdsByTags(filters.tagIds));
      results = results.filter((t) => matchingTaskIds.has(t.id));
    }
    return results;
  }
}

// src/bun/services/notification.service.ts
class NotificationService {
  db;
  scheduledReminders = new Map;
  constructor(db2) {
    this.db = db2;
  }
  schedule(taskId, title, reminderTime) {
    this.cancel(taskId);
    const now = Date.now();
    const delay = reminderTime.getTime() - now;
    if (delay <= 0) {
      this.deliverNotification(taskId, title);
      return;
    }
    const timer = setTimeout(() => {
      this.deliverNotification(taskId, title);
      this.scheduledReminders.delete(taskId);
    }, delay);
    this.scheduledReminders.set(taskId, { taskId, title, timer });
  }
  cancel(taskId) {
    const reminder = this.scheduledReminders.get(taskId);
    if (reminder) {
      clearTimeout(reminder.timer);
      this.scheduledReminders.delete(taskId);
    }
  }
  reschedule(taskId, title, newTime) {
    this.cancel(taskId);
    this.schedule(taskId, title, newTime);
  }
  checkMissedReminders() {
    const now = new Date().toISOString();
    const missedTasks = this.db.select().from(tasks).where(and(eq(tasks.status, "todo"), isNotNull(tasks.reminderTime), lte(tasks.reminderTime, now))).all();
    for (const task of missedTasks) {
      this.deliverNotification(task.id, task.title);
      this.db.update(tasks).set({ reminderTime: null }).where(eq(tasks.id, task.id)).run();
    }
  }
  scheduleAllFutureReminders() {
    const now = new Date().toISOString();
    const futureTasks = this.db.select().from(tasks).where(and(eq(tasks.status, "todo"), isNotNull(tasks.reminderTime))).all();
    for (const task of futureTasks) {
      if (task.reminderTime && task.reminderTime > now) {
        this.schedule(task.id, task.title, new Date(task.reminderTime));
      }
    }
  }
  getScheduledCount() {
    return this.scheduledReminders.size;
  }
  hasScheduled(taskId) {
    return this.scheduledReminders.has(taskId);
  }
  clearAll() {
    for (const [, reminder] of this.scheduledReminders) {
      clearTimeout(reminder.timer);
    }
    this.scheduledReminders.clear();
  }
  deliverNotification(_taskId, title) {
    exports_Utils.showNotification({
      title: "\u5C0F\u897F\u74DC\u63D0\u9192",
      body: title
    });
  }
}

// src/bun/services/statistics.service.ts
class StatisticsService {
  db;
  constructor(db2) {
    this.db = db2;
  }
  getStats(period, referenceDate = new Date) {
    let periodStart;
    let periodEnd;
    switch (period) {
      case "day":
        periodStart = startOfDay(referenceDate);
        periodEnd = endOfDay(referenceDate);
        break;
      case "week":
        periodStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
        periodEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
        break;
      case "month":
        periodStart = startOfMonth(referenceDate);
        periodEnd = endOfMonth(referenceDate);
        break;
    }
    const periodStartStr = periodStart.toISOString();
    const periodEndStr = periodEnd.toISOString();
    const completedResult = this.db.select({ count: sql`COUNT(*)` }).from(tasks).where(and(eq(tasks.status, "completed"), gte(tasks.completedAt, periodStartStr), lte(tasks.completedAt, periodEndStr))).get();
    const totalResult = this.db.select({ count: sql`COUNT(*)` }).from(tasks).where(lte(tasks.createdAt, periodEndStr)).get();
    const completedTasks = completedResult?.count ?? 0;
    const totalTasks = totalResult?.count ?? 0;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    return {
      totalTasks,
      completedTasks,
      completionRate,
      periodStart: periodStartStr,
      periodEnd: periodEndStr
    };
  }
  getDailyTrend(days = 30, referenceDate = new Date) {
    const rangeStart = startOfDay(subDays(referenceDate, days - 1));
    const rangeEnd = endOfDay(referenceDate);
    const rangeStartStr = rangeStart.toISOString();
    const rangeEndStr = rangeEnd.toISOString();
    const completedRows = this.db.select({
      date: sql`DATE(${tasks.completedAt})`,
      count: sql`COUNT(*)`
    }).from(tasks).where(and(eq(tasks.status, "completed"), gte(tasks.completedAt, rangeStartStr), lte(tasks.completedAt, rangeEndStr))).groupBy(sql`DATE(${tasks.completedAt})`).all();
    const createdRows = this.db.select({
      date: sql`DATE(${tasks.createdAt})`,
      count: sql`COUNT(*)`
    }).from(tasks).where(and(gte(tasks.createdAt, rangeStartStr), lte(tasks.createdAt, rangeEndStr))).groupBy(sql`DATE(${tasks.createdAt})`).all();
    const completedByDate = new Map(completedRows.map((r) => [r.date, r.count]));
    const createdByDate = new Map(createdRows.map((r) => [r.date, r.count]));
    const trends = [];
    for (let i = days - 1;i >= 0; i--) {
      const date = subDays(referenceDate, i);
      const dateStr = format(date, "yyyy-MM-dd");
      trends.push({
        date: dateStr,
        completed: completedByDate.get(dateStr) ?? 0,
        created: createdByDate.get(dateStr) ?? 0
      });
    }
    return trends;
  }
}

// src/bun/services/data.service.ts
class DataService {
  db;
  constructor(db2) {
    this.db = db2;
  }
  exportData() {
    const allTasks = this.db.select().from(tasks).all();
    const allSubTasks = this.db.select().from(subTasks).all();
    const allCategories = this.db.select().from(categories).all();
    const allTags = this.db.select().from(tags).all();
    const allTaskTags = this.db.select({ taskId: taskTags.taskId, tagId: taskTags.tagId }).from(taskTags).all();
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: allTasks,
      subTasks: allSubTasks,
      categories: allCategories,
      tags: allTags,
      taskTags: allTaskTags
    };
    return JSON.stringify(data, null, 2);
  }
  importData(jsonStr) {
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      throw new AppException("VALIDATION_ERROR", "Invalid JSON format");
    }
    if (!data.version || data.version !== 1) {
      throw new AppException("VALIDATION_ERROR", "Unsupported export version");
    }
    for (const cat of data.categories ?? []) {
      try {
        this.db.insert(categories).values(cat).run();
      } catch {}
    }
    for (const tag of data.tags ?? []) {
      try {
        this.db.insert(tags).values(tag).run();
      } catch {}
    }
    for (const task of data.tasks ?? []) {
      try {
        this.db.insert(tasks).values(task).run();
      } catch {}
    }
    for (const st of data.subTasks ?? []) {
      try {
        this.db.insert(subTasks).values(st).run();
      } catch {}
    }
    for (const tt of data.taskTags ?? []) {
      try {
        this.db.insert(taskTags).values(tt).run();
      } catch {}
    }
  }
}

// src/bun/index.ts
var dataDir = exports_Utils.paths.userData;
if (!existsSync(dataDir)) {
  mkdirSync2(dataDir, { recursive: true });
}
var dbPath = join5(dataDir, "watermelon.db");
var db2 = initDatabase(dbPath);
var rawDb = getRawDatabase();
var taskService = new TaskService(db2, rawDb ?? undefined);
var categoryService = new CategoryService(db2);
var tagService = new TagService(db2);
var searchService = new SearchService(db2, tagService);
var notificationService = new NotificationService(db2);
var statisticsService = new StatisticsService(db2);
var dataService = new DataService(db2);
notificationService.checkMissedReminders();
notificationService.scheduleAllFutureReminders();
function wrapError(error) {
  if (error instanceof AppException) {
    return error.toAppError();
  }
  if (error instanceof Error) {
    return { code: "UNKNOWN_ERROR", message: error.message };
  }
  return { code: "UNKNOWN_ERROR", message: String(error) };
}
function handleSync(fn) {
  try {
    return fn();
  } catch (error) {
    return { __error: wrapError(error) };
  }
}
var savedBounds = null;
var DEV_SERVER_PORT = 5173;
var DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
var watermelonRPC = BrowserView.defineRPC({
  maxRequestTime: 1e4,
  handlers: {
    requests: {
      createTask: ({ data }) => {
        return handleSync(() => {
          const task = taskService.create(data);
          if (data.reminderTime) {
            notificationService.schedule(task.id, task.title, new Date(data.reminderTime));
          }
          return task;
        });
      },
      updateTask: ({ id, data }) => {
        return handleSync(() => {
          const task = taskService.update(id, data);
          if (data.reminderTime !== undefined) {
            if (data.reminderTime) {
              notificationService.reschedule(id, task.title, new Date(data.reminderTime));
            } else {
              notificationService.cancel(id);
            }
          }
          return task;
        });
      },
      deleteTask: ({ id }) => {
        return handleSync(() => {
          notificationService.cancel(id);
          taskService.delete(id);
        });
      },
      getTasks: ({ filter }) => {
        return handleSync(() => taskService.getAll(filter));
      },
      getTaskById: ({ id }) => {
        return handleSync(() => taskService.getById(id));
      },
      completeTask: ({ id }) => {
        return handleSync(() => {
          const result = taskService.complete(id);
          notificationService.cancel(id);
          if (result.nextTask?.reminderTime) {
            notificationService.schedule(result.nextTask.id, result.nextTask.title, new Date(result.nextTask.reminderTime));
          }
          return result;
        });
      },
      reorderTasks: ({ items }) => {
        return handleSync(() => taskService.reorder(items));
      },
      createSubTask: ({ taskId, data }) => {
        return handleSync(() => taskService.createSubTask(taskId, data));
      },
      updateSubTask: ({ id, data }) => {
        return handleSync(() => taskService.updateSubTask(id, data));
      },
      deleteSubTask: ({ id }) => {
        return handleSync(() => taskService.deleteSubTask(id));
      },
      createCategory: ({ data }) => {
        return handleSync(() => categoryService.create(data));
      },
      updateCategory: ({ id, data }) => {
        return handleSync(() => categoryService.update(id, data));
      },
      deleteCategory: ({ id }) => {
        return handleSync(() => categoryService.delete(id));
      },
      getCategories: () => {
        return handleSync(() => categoryService.getAll());
      },
      createTag: ({ name, color }) => {
        return handleSync(() => tagService.create(name, color));
      },
      updateTag: ({ id, name, color }) => {
        return handleSync(() => tagService.update(id, name, color));
      },
      deleteTag: ({ id }) => {
        return handleSync(() => tagService.delete(id));
      },
      getTags: () => {
        return handleSync(() => tagService.getAll());
      },
      addTagToTask: ({ taskId, tagId }) => {
        return handleSync(() => tagService.addToTask(taskId, tagId));
      },
      removeTagFromTask: ({ taskId, tagId }) => {
        return handleSync(() => tagService.removeFromTask(taskId, tagId));
      },
      searchTasks: ({ query, filters }) => {
        return handleSync(() => searchService.search(query, filters));
      },
      scheduleNotification: ({ taskId, title, reminderTime }) => {
        return handleSync(() => notificationService.schedule(taskId, title, new Date(reminderTime)));
      },
      cancelNotification: ({ taskId }) => {
        return handleSync(() => notificationService.cancel(taskId));
      },
      getStats: ({ period }) => {
        return handleSync(() => statisticsService.getStats(period));
      },
      getDailyTrend: ({ days }) => {
        return handleSync(() => statisticsService.getDailyTrend(days));
      },
      exportData: () => {
        return handleSync(() => dataService.exportData());
      },
      importData: ({ jsonStr }) => {
        return handleSync(() => dataService.importData(jsonStr));
      },
      setCompactMode: ({ compact }) => {
        const COMPACT_WIDTH = 420;
        const COMPACT_HEIGHT = 600;
        if (compact) {
          savedBounds = mainWindow.getFrame();
          const currentBounds = savedBounds;
          const x = Math.round(currentBounds.x + (currentBounds.width - COMPACT_WIDTH) / 2);
          const y = Math.round(currentBounds.y + (currentBounds.height - COMPACT_HEIGHT) / 2);
          mainWindow.setFrame(x, y, COMPACT_WIDTH, COMPACT_HEIGHT);
        } else {
          if (savedBounds) {
            mainWindow.setFrame(savedBounds.x, savedBounds.y, savedBounds.width, savedBounds.height);
            savedBounds = null;
          } else {
            mainWindow.setSize(1200, 800);
          }
        }
      }
    },
    messages: {}
  }
});
async function getMainViewUrl() {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log('Vite dev server not running. Run "bun run dev:hmr" for HMR support.');
    }
  }
  return "views://mainview/index.html";
}
var url = await getMainViewUrl();
var mainWindow = new BrowserWindow({
  title: "\u5C0F\u897F\u74DC",
  url,
  rpc: watermelonRPC,
  titleBarStyle: "hiddenInset",
  frame: {
    width: 1200,
    height: 800,
    x: 200,
    y: 200
  }
});
bun_default.events.on("app-before-quit", () => {
  notificationService.clearAll();
  closeDatabase();
});
console.log("\u5C0F\u897F\u74DC app started!");
console.log(`Database: ${dbPath}`);
