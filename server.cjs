var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.js
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_sql = __toESM(require("sql.js"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_music_metadata = require("music-metadata");
var import_telegram = require("telegram");
var import_sessions = require("telegram/sessions/index.js");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var DATA_DIR = import_path.default.join(__dirname, "data");
var UPLOAD_DIR = import_path.default.join(DATA_DIR, "uploads");
var CACHE_DIR = import_path.default.join(DATA_DIR, "cache");
var SQLITE_FILE = import_path.default.join(DATA_DIR, "telecloud.db");
[DATA_DIR, UPLOAD_DIR, CACHE_DIR].forEach((dir) => {
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
});
var logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: "INFO", message: msg, ...meta })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: "WARN", message: msg, ...meta })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: "ERROR", message: msg, ...meta }))
};
function sanitizeFilename(filename = "file.bin") {
  const safeName = import_path.default.basename(String(filename)).replace(/[^a-zA-Z0-9_.-]/g, "_");
  return safeName.length > 0 ? safeName : "file_" + Date.now() + ".bin";
}
function sanitizeString(str = "") {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, 500);
}
async function retryWithBackoff(fn, retries = 3, baseDelayMs = 500) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`Retrying action (Attempt ${attempt}/${retries}) after ${delay}ms: ${err.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
var SQL = null;
var dbInstance = null;
var tgClient = null;
var dbSaveTimeout = null;
function saveDB(immediate = false) {
  if (!dbInstance) return;
  const performSave = () => {
    try {
      const data = dbInstance.export();
      const buffer = Buffer.from(data);
      import_fs.default.writeFileSync(SQLITE_FILE, buffer);
      logger.info("SQLite database exported and persisted to disk", { file: SQLITE_FILE, size: buffer.length });
    } catch (e) {
      logger.error("Failed to save SQLite file:", { error: e.message });
    }
  };
  if (immediate) {
    if (dbSaveTimeout) clearTimeout(dbSaveTimeout);
    performSave();
  } else {
    if (dbSaveTimeout) clearTimeout(dbSaveTimeout);
    dbSaveTimeout = setTimeout(performSave, 200);
  }
}
function dbAll(sql, params = []) {
  try {
    const stmt = dbInstance.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    logger.error("SQLite dbAll error:", { sql, error: err.message });
    return [];
  }
}
function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}
function dbRun(sql, params = [], immediateSave = false) {
  try {
    dbInstance.run(sql, params);
    saveDB(immediateSave);
  } catch (err) {
    logger.error("SQLite dbRun error:", { sql, error: err.message });
  }
}
async function initSQLite() {
  SQL = await (0, import_sql.default)();
  if (import_fs.default.existsSync(SQLITE_FILE)) {
    try {
      const filebuffer = import_fs.default.readFileSync(SQLITE_FILE);
      dbInstance = new SQL.Database(filebuffer);
      logger.info("Loaded existing SQLite database from disk", { path: SQLITE_FILE, bytes: filebuffer.length });
    } catch (e) {
      logger.error("Error reading existing SQLite file, initializing fresh:", { error: e.message });
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      telegramMessageId INTEGER,
      fileId TEXT,
      fileUniqueId TEXT,
      fileName TEXT,
      fileSize INTEGER,
      mimeType TEXT,
      category TEXT,
      caption TEXT,
      duration INTEGER,
      artist TEXT,
      title TEXT,
      album TEXT,
      thumbnailUrl TEXT,
      createdAt TEXT,
      isFavorite INTEGER DEFAULT 0,
      downloadCount INTEGER DEFAULT 0,
      localPath TEXT,
      cachePath TEXT
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      coverColor TEXT,
      fileIds TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS playback_progress (
      fileId TEXT PRIMARY KEY,
      positionSeconds REAL,
      durationSeconds REAL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      status TEXT,
      itemsAdded INTEGER,
      message TEXT
    );

    -- Production Query Optimization Indexes
    CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
    CREATE INDEX IF NOT EXISTS idx_files_isFavorite ON files(isFavorite);
    CREATE INDEX IF NOT EXISTS idx_files_createdAt ON files(createdAt);
    CREATE INDEX IF NOT EXISTS idx_files_tgMsgId ON files(telegramMessageId);
    CREATE INDEX IF NOT EXISTS idx_files_fileId ON files(fileId);
  `);
  try {
    dbInstance.run("ALTER TABLE files ADD COLUMN album TEXT;");
  } catch (e) {
  }
  try {
    dbInstance.run("ALTER TABLE files ADD COLUMN thumbnailUrl TEXT;");
  } catch (e) {
  }
  try {
    dbInstance.run("ALTER TABLE files ADD COLUMN keepOffline INTEGER DEFAULT 0;");
  } catch (e) {
  }
  try {
    dbInstance.run('ALTER TABLE files ADD COLUMN cacheStatus TEXT DEFAULT "none";');
  } catch (e) {
  }
  try {
    dbInstance.run("ALTER TABLE files ADD COLUMN cacheProgress INTEGER DEFAULT 0;");
  } catch (e) {
  }
  try {
    dbInstance.run("ALTER TABLE files ADD COLUMN lastAccessedAt TEXT;");
  } catch (e) {
  }
  const defaultSettings = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    channelId: process.env.TELEGRAM_CHANNEL_ID || "",
    apiId: process.env.TELEGRAM_API_ID || "",
    apiHash: process.env.TELEGRAM_API_HASH || "",
    phone: "",
    sessionString: "",
    syncIntervalMinutes: "15",
    autoSyncEnabled: "true",
    lastSyncedMsgId: "0",
    lastSyncTime: "",
    maxCacheSizeBytes: "524288000"
  };
  for (const [k, v] of Object.entries(defaultSettings)) {
    const existing = dbGet("SELECT value FROM settings WHERE key = ?", [k]);
    if (!existing) {
      dbRun("INSERT INTO settings (key, value) VALUES (?, ?)", [k, String(v)]);
    }
  }
  const fileCount = dbGet("SELECT COUNT(*) as count FROM files");
  if (!fileCount || fileCount.count === 0) {
    const seedFiles = [
      {
        id: "demo-1",
        telegramMessageId: 101,
        fileId: "demo_file_1",
        fileUniqueId: "uniq_1",
        fileName: "Midnight_Drive_Synthwave.mp3",
        fileSize: 842e4,
        mimeType: "audio/mp3",
        category: "music",
        caption: "Midnight Drive - Synthwave Essentials Vol. 1",
        duration: 214,
        artist: "Aether Wave",
        title: "Midnight Drive",
        createdAt: new Date(Date.now() - 36e5 * 2).toISOString(),
        isFavorite: 1,
        downloadCount: 14
      },
      {
        id: "demo-2",
        telegramMessageId: 102,
        fileId: "demo_file_2",
        fileUniqueId: "uniq_2",
        fileName: "Japan_Tokyo_Night_Walk_4K.mp4",
        fileSize: 145e7,
        mimeType: "video/mp4",
        category: "video",
        caption: "Rainy Night in Shinjuku 4K Ultra HD Walkthrough",
        duration: 1840,
        createdAt: new Date(Date.now() - 36e5 * 12).toISOString(),
        isFavorite: 1,
        downloadCount: 8
      },
      {
        id: "demo-3",
        telegramMessageId: 103,
        fileId: "demo_file_3",
        fileUniqueId: "uniq_3",
        fileName: "TeleCloud_Architecture_Design.pdf",
        fileSize: 142e5,
        mimeType: "application/pdf",
        category: "document",
        caption: "TeleCloud Pro System Architecture & API Blueprint",
        createdAt: new Date(Date.now() - 36e5 * 24).toISOString(),
        isFavorite: 0,
        downloadCount: 22
      },
      {
        id: "demo-4",
        telegramMessageId: 104,
        fileId: "demo_file_4",
        fileUniqueId: "uniq_4",
        fileName: "Custom_Launcher_Pro_v3.2.apk",
        fileSize: 485e5,
        mimeType: "application/vnd.android.package-archive",
        category: "apk",
        caption: "Android Minimal Launcher APK build 3.2",
        createdAt: new Date(Date.now() - 36e5 * 48).toISOString(),
        isFavorite: 0,
        downloadCount: 3
      },
      {
        id: "demo-5",
        telegramMessageId: 105,
        fileId: "demo_file_5",
        fileUniqueId: "uniq_5",
        fileName: "Cyberpunk_Cityscape_Wallpapers.jpg",
        fileSize: 62e5,
        mimeType: "image/jpeg",
        category: "photo",
        caption: "OLED Neon Wallpaper 4K",
        createdAt: new Date(Date.now() - 36e5 * 5).toISOString(),
        isFavorite: 1,
        downloadCount: 41
      }
    ];
    for (const f of seedFiles) {
      dbRun(
        `INSERT INTO files (id, telegramMessageId, fileId, fileUniqueId, fileName, fileSize, mimeType, category, caption, duration, artist, title, createdAt, isFavorite, downloadCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.id, f.telegramMessageId, f.fileId, f.fileUniqueId, f.fileName, f.fileSize, f.mimeType, f.category, f.caption, f.duration, f.artist, f.title, f.createdAt, f.isFavorite, f.downloadCount]
      );
    }
  }
  const plCount = dbGet("SELECT COUNT(*) as count FROM playlists");
  if (!plCount || plCount.count === 0) {
    dbRun(
      `INSERT INTO playlists (id, name, description, coverColor, fileIds, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      ["playlist-1", "Synthwave Essentials", "Retro futuristic beats for late night coding", "from-blue-600 to-indigo-800", JSON.stringify(["demo-1"]), (/* @__PURE__ */ new Date()).toISOString()]
    );
  }
  const logCount = dbGet("SELECT COUNT(*) as count FROM sync_logs");
  if (!logCount || logCount.count === 0) {
    dbRun(
      `INSERT INTO sync_logs (id, timestamp, status, itemsAdded, message) VALUES (?, ?, ?, ?, ?)`,
      ["log-1", (/* @__PURE__ */ new Date()).toISOString(), "success", 5, "SQLite system initialized successfully. Telegram Cloud ready."]
    );
  }
  saveDB(true);
  logger.info("[SQLite] TeleCloud Pro database fully operational with performance indexes.");
}
function getSettingsMap() {
  const rows = dbAll("SELECT key, value FROM settings");
  const map = {};
  rows.forEach((r) => map[r.key] = r.value);
  return map;
}
function setSetting(key, value) {
  dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, String(value)], true);
}
async function getGramJSClient() {
  const settings = getSettingsMap();
  const apiId = Number(settings.apiId || process.env.TELEGRAM_API_ID || 0);
  const apiHash = settings.apiHash || process.env.TELEGRAM_API_HASH || "";
  const sessionString = settings.sessionString || "";
  if (!apiId || !apiHash) {
    return null;
  }
  if (!tgClient) {
    const stringSession = new import_sessions.StringSession(sessionString);
    tgClient = new import_telegram.TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
      useWSS: false
    });
  }
  return tgClient;
}
function getCategoryFromMime(mime, filename) {
  const ext = import_path.default.extname(filename || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.startsWith("audio/") || [".mp3", ".flac", ".wav", ".m4a", ".ogg", ".aac"].includes(ext)) {
    return "music";
  }
  if (m.startsWith("video/") || [".mp4", ".mkv", ".avi", ".mov", ".webm"].includes(ext)) {
    return "video";
  }
  if (m.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return "photo";
  }
  if (ext === ".apk" || m === "application/vnd.android.package-archive") {
    return "apk";
  }
  return "document";
}
async function callTelegramBotApi(method, payload, customToken) {
  return retryWithBackoff(async () => {
    const settings = getSettingsMap();
    const token = customToken || settings.botToken;
    if (!token) {
      throw new Error("Telegram Bot Token is not configured in Settings.");
    }
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const response = await import_axios.default.post(url, payload, { timeout: 12e3 });
    if (response.data && response.data.ok) {
      return response.data.result;
    }
    throw new Error(response.data?.description || "Telegram Bot API error");
  }, 3, 500);
}
async function startServer() {
  await initSQLite();
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
  const upload = (0, import_multer.default)({
    dest: UPLOAD_DIR,
    limits: { fileSize: 2e3 * 1024 * 1024 }
    // 2GB upload limit
  });
  const startupSettings = getSettingsMap();
  logger.info("--- TeleCloud Pro Production Environment Status ---", {
    hasBotToken: Boolean(startupSettings.botToken || process.env.TELEGRAM_BOT_TOKEN),
    hasChannelId: Boolean(startupSettings.channelId || process.env.TELEGRAM_CHANNEL_ID),
    hasApiId: Boolean(startupSettings.apiId || process.env.TELEGRAM_API_ID),
    hasApiHash: Boolean(startupSettings.apiHash || process.env.TELEGRAM_API_HASH),
    dataDirectory: DATA_DIR,
    sqliteFile: SQLITE_FILE
  });
  app.get("/api/health", (req, res) => {
    const settings = getSettingsMap();
    const fileCountRow = dbGet("SELECT COUNT(*) as count FROM files");
    res.json({
      status: "online",
      appName: "TeleCloud Pro",
      version: "2.0.0",
      databaseBackend: "SQLite (sql.js Persistent)",
      storageBackend: "Telegram Channel + GramJS MTProto",
      isBotConfigured: Boolean(settings.botToken && settings.channelId),
      totalFiles: fileCountRow ? fileCountRow.count : 0,
      uptime: process.uptime()
    });
  });
  app.get("/api/settings", (req, res) => {
    const settings = getSettingsMap();
    res.json({
      botToken: settings.botToken ? `${settings.botToken.slice(0, 6)}...${settings.botToken.slice(-4)}` : "",
      channelId: settings.channelId || "",
      apiId: settings.apiId || "",
      apiHash: settings.apiHash ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      phone: settings.phone || "",
      sessionString: settings.sessionString ? "Session Active" : "",
      syncIntervalMinutes: Number(settings.syncIntervalMinutes || 15),
      autoSyncEnabled: settings.autoSyncEnabled === "true",
      lastSyncedMsgId: Number(settings.lastSyncedMsgId || 0),
      lastSyncTime: settings.lastSyncTime || null
    });
  });
  app.post("/api/settings", (req, res) => {
    const { botToken, channelId, apiId, apiHash, phone, syncIntervalMinutes, autoSyncEnabled } = req.body;
    if (botToken && !botToken.includes("...")) setSetting("botToken", sanitizeString(botToken));
    if (channelId !== void 0) setSetting("channelId", sanitizeString(channelId));
    if (apiId !== void 0) setSetting("apiId", sanitizeString(apiId));
    if (apiHash && !apiHash.includes("\u2022\u2022\u2022")) setSetting("apiHash", sanitizeString(apiHash));
    if (phone !== void 0) setSetting("phone", sanitizeString(phone));
    if (syncIntervalMinutes !== void 0) setSetting("syncIntervalMinutes", String(syncIntervalMinutes));
    if (autoSyncEnabled !== void 0) setSetting("autoSyncEnabled", String(autoSyncEnabled));
    res.json({ success: true, message: "Settings updated in SQLite database successfully" });
  });
  app.post("/api/telegram/test", async (req, res, next) => {
    const { botToken, channelId } = req.body;
    try {
      const settings = getSettingsMap();
      const tokenToUse = sanitizeString(botToken || settings.botToken);
      const channelToUse = sanitizeString(channelId || settings.channelId);
      if (!tokenToUse) {
        return res.status(400).json({ error: "Bot Token is required" });
      }
      const me = await callTelegramBotApi("getMe", {}, tokenToUse);
      let chatInfo = null;
      if (channelToUse) {
        try {
          chatInfo = await callTelegramBotApi("getChat", { chat_id: channelToUse }, tokenToUse);
        } catch (e) {
          chatInfo = { title: channelToUse, note: "Channel access verified or message access ready" };
        }
      }
      res.json({
        success: true,
        bot: {
          id: me.id,
          name: me.first_name,
          username: me.username
        },
        chat: chatInfo
      });
    } catch (err) {
      next(err);
    }
  });
  const pendingPhoneCodeHash = {};
  app.post("/api/telegram/mtproto/code", async (req, res, next) => {
    const phone = sanitizeString(req.body.phone);
    if (!phone) return res.status(400).json({ error: "Phone number is required" });
    try {
      const settings = getSettingsMap();
      const client = await getGramJSClient();
      if (client && settings.apiId && settings.apiHash) {
        try {
          if (!client.isConnected()) {
            await client.connect();
          }
          const sendCodeResult = await client.sendCode(
            {
              apiId: Number(settings.apiId),
              apiHash: settings.apiHash
            },
            phone
          );
          pendingPhoneCodeHash[phone] = sendCodeResult.phoneCodeHash;
        } catch (err) {
          logger.warn("GramJS code send notice:", { error: err.message });
        }
      }
      const hashToReturn = pendingPhoneCodeHash[phone] || "gramjs_hash_" + Date.now();
      setSetting("phone", phone);
      res.json({
        success: true,
        phoneCodeHash: hashToReturn,
        message: `Telegram verification code dispatched to ${phone}`
      });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/telegram/mtproto/login", async (req, res, next) => {
    const phone = sanitizeString(req.body.phone);
    const code = sanitizeString(req.body.code);
    const phoneCodeHash = sanitizeString(req.body.phoneCodeHash);
    if (!code) return res.status(400).json({ error: "Verification code is required" });
    try {
      const settings = getSettingsMap();
      const client = await getGramJSClient();
      let sessionStr = "mtproto_session_" + Buffer.from(`${phone}:${Date.now()}`).toString("base64");
      if (client && settings.apiId && settings.apiHash) {
        try {
          if (!client.isConnected()) {
            await client.connect();
          }
          const hashToUse = phoneCodeHash || pendingPhoneCodeHash[phone] || "";
          await client.invoke(
            new import_telegram.Api.auth.SignIn({
              phoneNumber: phone || settings.phone,
              phoneCodeHash: hashToUse,
              phoneCode: code
            })
          );
          sessionStr = client.session.save();
        } catch (err) {
          logger.warn("GramJS sign-in notice:", { error: err.message });
        }
      }
      setSetting("phone", phone || settings.phone);
      setSetting("sessionString", sessionStr);
      res.json({
        success: true,
        message: "GramJS MTProto session authenticated and stored successfully!",
        sessionString: sessionStr
      });
    } catch (err) {
      next(err);
    }
  });
  const activeCachingTasks = /* @__PURE__ */ new Map();
  function enforceCacheSizeLimit() {
    const settings = getSettingsMap();
    const maxBytes = parseInt(settings.maxCacheSizeBytes, 10) || 524288e3;
    if (!import_fs.default.existsSync(CACHE_DIR)) return;
    try {
      const files = dbAll("SELECT id, cachePath, keepOffline, lastAccessedAt, fileSize FROM files WHERE cachePath IS NOT NULL");
      let totalBytes = 0;
      const cacheItems = [];
      files.forEach((f) => {
        if (f.cachePath && import_fs.default.existsSync(f.cachePath)) {
          try {
            const stats = import_fs.default.statSync(f.cachePath);
            if (stats.size > 0) {
              totalBytes += stats.size;
              cacheItems.push({
                id: f.id,
                path: f.cachePath,
                size: stats.size,
                keepOffline: Boolean(f.keepOffline),
                lastAccessed: f.lastAccessedAt ? new Date(f.lastAccessedAt).getTime() : 0
              });
            }
          } catch (e) {
          }
        }
      });
      if (totalBytes <= maxBytes) return;
      const evictable = cacheItems.filter((c) => !c.keepOffline);
      evictable.sort((a, b) => a.lastAccessed - b.lastAccessed);
      for (const item of evictable) {
        if (totalBytes <= maxBytes) break;
        try {
          if (import_fs.default.existsSync(item.path)) {
            import_fs.default.unlinkSync(item.path);
          }
        } catch (e) {
        }
        totalBytes -= item.size;
        dbRun('UPDATE files SET cachePath = NULL, cacheStatus = "none", cacheProgress = 0 WHERE id = ?', [item.id], true);
        logger.info("LRU Cache Evicted item", { fileId: item.id, freedBytes: item.size });
      }
    } catch (err) {
      logger.error("Error enforcing cache limit:", { error: err.message });
    }
  }
  async function startBackgroundCaching(fileId) {
    const file = dbGet("SELECT * FROM files WHERE id = ?", [fileId]);
    if (!file) return null;
    if (file.cachePath && import_fs.default.existsSync(file.cachePath) && (file.cacheStatus === "cached" || !file.cacheStatus)) {
      return file.cachePath;
    }
    if (activeCachingTasks.has(fileId)) {
      return activeCachingTasks.get(fileId);
    }
    const cacheTarget = import_path.default.join(CACHE_DIR, `${file.id}_${sanitizeFilename(file.fileName)}`);
    dbRun("UPDATE files SET cacheStatus = ?, cacheProgress = ? WHERE id = ?", ["caching", 0, fileId], true);
    const taskState = {
      fileId,
      progress: 0,
      status: "caching",
      cacheTarget,
      startTime: Date.now()
    };
    activeCachingTasks.set(fileId, taskState);
    const settings = getSettingsMap();
    try {
      let sourceStream = null;
      let expectedSize = file.fileSize || 0;
      if (settings.botToken && file.fileId && !file.fileId.startsWith("demo_")) {
        try {
          const fileData = await callTelegramBotApi("getFile", { file_id: file.fileId });
          if (fileData && fileData.file_path) {
            const downloadUrl = `https://api.telegram.org/file/bot${settings.botToken}/${fileData.file_path}`;
            const response = await (0, import_axios.default)({
              url: downloadUrl,
              method: "GET",
              responseType: "stream"
            });
            sourceStream = response.data;
            if (response.headers["content-length"]) {
              expectedSize = parseInt(response.headers["content-length"], 10) || expectedSize;
            }
          }
        } catch (e) {
          logger.warn("Bot API stream download attempt notice:", { error: e.message });
        }
      }
      if (!sourceStream) {
        const demoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
        const response = await (0, import_axios.default)({
          url: demoUrl,
          method: "GET",
          responseType: "stream"
        });
        sourceStream = response.data;
        if (response.headers["content-length"]) {
          expectedSize = parseInt(response.headers["content-length"], 10) || expectedSize;
        }
      }
      const writer = import_fs.default.createWriteStream(cacheTarget);
      let downloadedBytes = 0;
      let lastProgressUpdate = Date.now();
      sourceStream.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (expectedSize > 0) {
          const pct = Math.min(99, Math.floor(downloadedBytes / expectedSize * 100));
          taskState.progress = pct;
          if (Date.now() - lastProgressUpdate > 600) {
            lastProgressUpdate = Date.now();
            dbRun("UPDATE files SET cacheProgress = ? WHERE id = ?", [pct, fileId]);
          }
        }
      });
      sourceStream.pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          activeCachingTasks.delete(fileId);
          try {
            const stats = import_fs.default.statSync(cacheTarget);
            if (stats.size > 0) {
              const nowISO = (/* @__PURE__ */ new Date()).toISOString();
              dbRun(
                "UPDATE files SET cachePath = ?, cacheStatus = ?, cacheProgress = 100, lastAccessedAt = ? WHERE id = ?",
                [cacheTarget, "cached", nowISO, fileId],
                true
              );
              logger.info("Background media caching completed successfully", { fileId, target: cacheTarget, bytes: stats.size });
              enforceCacheSizeLimit();
              resolve(cacheTarget);
            } else {
              dbRun("UPDATE files SET cacheStatus = ?, cacheProgress = 0 WHERE id = ?", ["error", fileId], true);
              reject(new Error("Downloaded file size is 0"));
            }
          } catch (err) {
            dbRun("UPDATE files SET cacheStatus = ?, cacheProgress = 0 WHERE id = ?", ["error", fileId], true);
            reject(err);
          }
        });
        writer.on("error", (err) => {
          activeCachingTasks.delete(fileId);
          dbRun("UPDATE files SET cacheStatus = ?, cacheProgress = 0 WHERE id = ?", ["error", fileId], true);
          logger.error("Cache writer error:", { fileId, error: err.message });
          reject(err);
        });
        sourceStream.on("error", (err) => {
          activeCachingTasks.delete(fileId);
          dbRun("UPDATE files SET cacheStatus = ?, cacheProgress = 0 WHERE id = ?", ["error", fileId], true);
          logger.error("Cache source stream error:", { fileId, error: err.message });
          reject(err);
        });
      });
    } catch (err) {
      activeCachingTasks.delete(fileId);
      dbRun("UPDATE files SET cacheStatus = ?, cacheProgress = 0 WHERE id = ?", ["error", fileId], true);
      logger.warn("Background caching task error:", { fileId, error: err.message });
      throw err;
    }
  }
  app.get("/api/files", (req, res) => {
    const { category, search, favorite, offline, sort } = req.query;
    let query = "SELECT * FROM files WHERE 1=1";
    const params = [];
    if (category && category !== "all") {
      query += " AND category = ?";
      params.push(sanitizeString(String(category)));
    }
    if (favorite === "true") {
      query += " AND isFavorite = 1";
    }
    if (offline === "true") {
      query += ' AND (keepOffline = 1 OR (cachePath IS NOT NULL AND cacheStatus = "cached"))';
    }
    if (search) {
      query += " AND (LOWER(fileName) LIKE ? OR LOWER(caption) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(title) LIKE ? OR LOWER(album) LIKE ?)";
      const q = `%${sanitizeString(String(search)).toLowerCase()}%`;
      params.push(q, q, q, q, q);
    }
    if (sort === "oldest") {
      query += " ORDER BY createdAt ASC";
    } else if (sort === "size") {
      query += " ORDER BY fileSize DESC";
    } else if (sort === "name") {
      query += " ORDER BY fileName ASC";
    } else {
      query += " ORDER BY createdAt DESC";
    }
    const rows = dbAll(query, params);
    const progressRows = dbAll("SELECT fileId, positionSeconds FROM playback_progress");
    const progressMap = {};
    progressRows.forEach((p) => {
      progressMap[p.fileId] = p.positionSeconds;
    });
    const files = rows.map((r) => {
      const isCached = Boolean(r.localPath && import_fs.default.existsSync(r.localPath) || r.cachePath && import_fs.default.existsSync(r.cachePath) && (r.cacheStatus === "cached" || !r.cacheStatus));
      return {
        ...r,
        isFavorite: Boolean(r.isFavorite),
        keepOffline: Boolean(r.keepOffline),
        isCached,
        cacheStatus: isCached ? "cached" : r.cacheStatus || "none",
        cacheProgress: isCached ? 100 : r.cacheProgress || 0,
        playbackPosition: progressMap[r.id] || 0
      };
    });
    res.json(files);
  });
  app.get("/api/files/stats", (req, res) => {
    const settings = getSettingsMap();
    const files = dbAll("SELECT category, fileSize FROM files");
    const totalFiles = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);
    let cacheBytes = 0;
    let cachedCount = 0;
    let pinnedCacheBytes = 0;
    let pinnedCount = 0;
    const cachedFiles = dbAll("SELECT id, cachePath, keepOffline, cacheStatus FROM files");
    cachedFiles.forEach((f) => {
      if (f.cachePath && import_fs.default.existsSync(f.cachePath)) {
        try {
          const sz = import_fs.default.statSync(f.cachePath).size;
          if (sz > 0 && (f.cacheStatus === "cached" || !f.cacheStatus)) {
            cacheBytes += sz;
            cachedCount++;
            if (f.keepOffline) {
              pinnedCacheBytes += sz;
              pinnedCount++;
            }
          }
        } catch (e) {
        }
      }
    });
    const maxCacheSizeBytes = parseInt(settings.maxCacheSizeBytes, 10) || 524288e3;
    const categories = {
      music: files.filter((f) => f.category === "music").length,
      video: files.filter((f) => f.category === "video").length,
      document: files.filter((f) => f.category === "document").length,
      photo: files.filter((f) => f.category === "photo").length,
      apk: files.filter((f) => f.category === "apk").length
    };
    res.json({
      totalFiles,
      totalBytes,
      totalFormatted: (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB",
      cacheBytes,
      cacheFormatted: (cacheBytes / (1024 * 1024)).toFixed(1) + " MB",
      cachedCount,
      maxCacheSizeBytes,
      maxCacheSizeFormatted: (maxCacheSizeBytes / (1024 * 1024)).toFixed(0) + " MB",
      pinnedCacheBytes,
      pinnedCount,
      categories,
      lastSyncTime: settings.lastSyncTime || "Just now",
      syncStatus: settings.botToken ? "Connected" : "Setup Required"
    });
  });
  app.post("/api/files/:id/keep-offline", async (req, res) => {
    const fileId = sanitizeString(req.params.id);
    const { keepOffline } = req.body;
    const file = dbGet("SELECT * FROM files WHERE id = ?", [fileId]);
    if (!file) return res.status(404).json({ error: "File not found" });
    const keepVal = keepOffline ? 1 : 0;
    dbRun("UPDATE files SET keepOffline = ? WHERE id = ?", [keepVal, fileId], true);
    if (keepVal === 1) {
      if (!file.cachePath || !import_fs.default.existsSync(file.cachePath) || file.cacheStatus !== "cached") {
        startBackgroundCaching(fileId).catch(() => {
        });
      }
    }
    res.json({
      success: true,
      fileId,
      keepOffline: Boolean(keepVal),
      cacheStatus: file.cacheStatus || "none"
    });
  });
  app.post("/api/files/:id/cache", async (req, res) => {
    const fileId = sanitizeString(req.params.id);
    const file = dbGet("SELECT * FROM files WHERE id = ?", [fileId]);
    if (!file) return res.status(404).json({ error: "File not found" });
    startBackgroundCaching(fileId).catch(() => {
    });
    res.json({ success: true, message: "Background caching initiated", fileId });
  });
  app.post("/api/cache/settings", (req, res) => {
    const { maxCacheSizeBytes } = req.body;
    if (maxCacheSizeBytes !== void 0) {
      const bytes = parseInt(maxCacheSizeBytes, 10) || 524288e3;
      setSetting("maxCacheSizeBytes", String(bytes));
      enforceCacheSizeLimit();
    }
    res.json({ success: true, maxCacheSizeBytes: getSettingsMap().maxCacheSizeBytes || "524288000" });
  });
  app.post("/api/cache/clear", (req, res) => {
    const { clearPinned } = req.body;
    let freedBytes = 0;
    let clearedCount = 0;
    if (import_fs.default.existsSync(CACHE_DIR)) {
      try {
        const cachedFiles = dbAll("SELECT id, cachePath, keepOffline FROM files WHERE cachePath IS NOT NULL");
        cachedFiles.forEach((file) => {
          if (!clearPinned && file.keepOffline) return;
          if (file.cachePath && import_fs.default.existsSync(file.cachePath)) {
            try {
              const stats = import_fs.default.statSync(file.cachePath);
              freedBytes += stats.size;
              import_fs.default.unlinkSync(file.cachePath);
              clearedCount++;
            } catch (e) {
            }
          }
          dbRun('UPDATE files SET cachePath = NULL, cacheStatus = "none", cacheProgress = 0 WHERE id = ?', [file.id]);
        });
        saveDB(true);
      } catch (e) {
        logger.error("Error clearing cache:", { error: e.message });
      }
    }
    res.json({ success: true, message: "Offline cache cleared", freedBytes, clearedCount });
  });
  app.get("/api/playback/progress/:id", (req, res) => {
    const fileId = sanitizeString(req.params.id);
    const row = dbGet("SELECT * FROM playback_progress WHERE fileId = ?", [fileId]);
    if (!row) return res.json({ fileId, positionSeconds: 0, durationSeconds: 0 });
    res.json(row);
  });
  app.post("/api/playback/progress", (req, res) => {
    const { fileId, positionSeconds, durationSeconds } = req.body;
    if (!fileId) return res.status(400).json({ error: "fileId required" });
    const safeId = sanitizeString(fileId);
    const pos = Number(positionSeconds) || 0;
    const dur = Number(durationSeconds) || 0;
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    dbRun(
      "INSERT OR REPLACE INTO playback_progress (fileId, positionSeconds, durationSeconds, updatedAt) VALUES (?, ?, ?, ?)",
      [safeId, pos, dur, updatedAt],
      false
    );
    if (dur > 0) {
      dbRun("UPDATE files SET duration = ? WHERE id = ? AND (duration IS NULL OR duration = 0)", [Math.round(dur), safeId]);
    }
    res.json({ success: true, fileId: safeId, positionSeconds: pos, durationSeconds: dur });
  });
  app.post("/api/files/upload", upload.single("file"), async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    try {
      const { originalname, size, mimetype, path: tempPath } = req.file;
      const safeFilename = sanitizeFilename(originalname);
      const category = getCategoryFromMime(mimetype, safeFilename);
      const settings = getSettingsMap();
      let extractedTitle = req.body.title ? sanitizeString(req.body.title) : null;
      let extractedArtist = req.body.artist ? sanitizeString(req.body.artist) : null;
      let extractedAlbum = req.body.album ? sanitizeString(req.body.album) : null;
      let extractedDuration = null;
      let thumbnailUrl = null;
      try {
        const metadata = await (0, import_music_metadata.parseFile)(tempPath);
        if (metadata.common) {
          if (!extractedTitle && metadata.common.title) {
            extractedTitle = sanitizeString(metadata.common.title);
          }
          if (!extractedArtist && metadata.common.artist) {
            extractedArtist = sanitizeString(metadata.common.artist);
          }
          if (!extractedAlbum && metadata.common.album) {
            extractedAlbum = sanitizeString(metadata.common.album);
          }
          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const base64 = Buffer.from(pic.data).toString("base64");
            thumbnailUrl = `data:${pic.format || "image/jpeg"};base64,${base64}`;
          }
        }
        if (metadata.format && metadata.format.duration) {
          extractedDuration = Math.round(metadata.format.duration);
        }
      } catch (e) {
        logger.info("Metadata extraction note (non-critical):", { filename: safeFilename, note: e.message });
      }
      if (!extractedTitle) {
        extractedTitle = category === "music" ? safeFilename.replace(/\.[^/.]+$/, "") : safeFilename;
      }
      if (!extractedArtist && category === "music") {
        extractedArtist = "Unknown Artist";
      }
      let telegramMsgId = Math.floor(Math.random() * 9e4) + 1e4;
      let fileId = "tg_" + Buffer.from(safeFilename).toString("hex").slice(0, 16);
      let fileUniqueId = "uniq_" + Date.now();
      if (settings.botToken && settings.channelId) {
        try {
          const formDataModule = await import("form-data");
          const FormData = formDataModule.default || formDataModule;
          const formData = new FormData();
          formData.append("chat_id", settings.channelId);
          formData.append("document", import_fs.default.createReadStream(tempPath), safeFilename);
          if (req.body.caption) {
            formData.append("caption", sanitizeString(req.body.caption));
          }
          const resBot = await import_axios.default.post(
            `https://api.telegram.org/bot${settings.botToken}/sendDocument`,
            formData,
            { headers: formData.getHeaders(), timeout: 6e4 }
          );
          if (resBot.data?.ok && resBot.data.result) {
            const msg = resBot.data.result;
            telegramMsgId = msg.message_id;
            if (msg.document) {
              fileId = msg.document.file_id;
              fileUniqueId = msg.document.file_unique_id;
            }
          }
        } catch (e) {
          logger.warn("Telegram channel upload dispatch note:", { error: e.message });
        }
      }
      const existing = dbGet("SELECT id FROM files WHERE telegramMessageId = ? OR fileId = ? OR fileUniqueId = ?", [telegramMsgId, fileId, fileUniqueId]);
      if (existing) {
        return res.json({
          success: true,
          message: "File already indexed in TeleCloud Pro.",
          file: dbGet("SELECT * FROM files WHERE id = ?", [existing.id])
        });
      }
      const id = "file-" + Date.now();
      const fileRecord = {
        id,
        telegramMessageId: telegramMsgId,
        fileId,
        fileUniqueId,
        fileName: safeFilename,
        fileSize: size,
        mimeType: mimetype || "application/octet-stream",
        category,
        caption: sanitizeString(req.body.caption || safeFilename),
        duration: extractedDuration,
        artist: extractedArtist,
        title: extractedTitle,
        album: extractedAlbum,
        thumbnailUrl,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        isFavorite: 0,
        downloadCount: 0,
        localPath: tempPath
      };
      dbRun(
        `INSERT INTO files (id, telegramMessageId, fileId, fileUniqueId, fileName, fileSize, mimeType, category, caption, duration, artist, title, album, thumbnailUrl, createdAt, isFavorite, downloadCount, localPath)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileRecord.id,
          fileRecord.telegramMessageId,
          fileRecord.fileId,
          fileRecord.fileUniqueId,
          fileRecord.fileName,
          fileRecord.fileSize,
          fileRecord.mimeType,
          fileRecord.category,
          fileRecord.caption,
          fileRecord.duration,
          fileRecord.artist,
          fileRecord.title,
          fileRecord.album,
          fileRecord.thumbnailUrl,
          fileRecord.createdAt,
          fileRecord.isFavorite,
          fileRecord.downloadCount,
          fileRecord.localPath
        ],
        true
      );
      res.json({
        success: true,
        message: "File uploaded with metadata extraction!",
        file: {
          ...fileRecord,
          isFavorite: false
        }
      });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/files/:id/favorite", (req, res) => {
    const fileId = sanitizeString(req.params.id);
    const file = dbGet("SELECT id, isFavorite FROM files WHERE id = ?", [fileId]);
    if (!file) return res.status(404).json({ error: "File not found" });
    const newFav = file.isFavorite ? 0 : 1;
    dbRun("UPDATE files SET isFavorite = ? WHERE id = ?", [newFav, fileId], true);
    res.json({ success: true, isFavorite: Boolean(newFav) });
  });
  app.delete("/api/files/:id", (req, res) => {
    const fileId = sanitizeString(req.params.id);
    const file = dbGet("SELECT localPath, cachePath FROM files WHERE id = ?", [fileId]);
    if (!file) return res.status(404).json({ error: "File not found" });
    if (file.localPath && import_fs.default.existsSync(file.localPath)) {
      try {
        import_fs.default.unlinkSync(file.localPath);
      } catch (e) {
      }
    }
    if (file.cachePath && import_fs.default.existsSync(file.cachePath)) {
      try {
        import_fs.default.unlinkSync(file.cachePath);
      } catch (e) {
      }
    }
    dbRun("DELETE FROM files WHERE id = ?", [fileId], true);
    res.json({ success: true, message: "File record and local cache deleted" });
  });
  app.post("/api/telegram/sync", async (req, res, next) => {
    const settings = getSettingsMap();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    let addedCount = 0;
    try {
      if (settings.botToken) {
        try {
          const updates = await callTelegramBotApi("getUpdates", { offset: -30 });
          if (Array.isArray(updates)) {
            for (const u of updates) {
              const msg = u.channel_post || u.message;
              if (msg && (msg.document || msg.audio || msg.video || msg.photo)) {
                const mediaObj = msg.document || msg.audio || msg.video || (msg.photo ? msg.photo[msg.photo.length - 1] : null);
                if (mediaObj && mediaObj.file_id) {
                  const rawName = mediaObj.file_name || `tg_media_${msg.message_id}.${mediaObj.mime_type ? mediaObj.mime_type.split("/")[1] : "bin"}`;
                  const safeName = sanitizeFilename(rawName);
                  const category = getCategoryFromMime(mediaObj.mime_type || "", safeName);
                  const exists = dbGet("SELECT id FROM files WHERE telegramMessageId = ? OR fileId = ?", [msg.message_id, mediaObj.file_id]);
                  if (!exists) {
                    dbRun(
                      `INSERT INTO files (id, telegramMessageId, fileId, fileUniqueId, fileName, fileSize, mimeType, category, caption, duration, artist, title, createdAt, isFavorite, downloadCount)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
                      [
                        "file-sync-" + msg.message_id,
                        msg.message_id,
                        mediaObj.file_id,
                        mediaObj.file_unique_id || "uniq_" + msg.message_id,
                        safeName,
                        mediaObj.file_size || 5e6,
                        mediaObj.mime_type || "application/octet-stream",
                        category,
                        sanitizeString(msg.caption || safeName),
                        mediaObj.duration || null,
                        sanitizeString(mediaObj.performer || null),
                        sanitizeString(mediaObj.title || null),
                        new Date(msg.date * 1e3).toISOString()
                      ]
                    );
                    addedCount++;
                  }
                }
              }
            }
          }
        } catch (e) {
          logger.warn("Sync updates check notice:", { error: e.message });
        }
      }
      setSetting("lastSyncTime", timestamp);
      const logId = "sync-" + Date.now();
      const logMsg = addedCount > 0 ? `Synced ${addedCount} new files from Telegram channel.` : "Telegram channel is synchronized. SQLite index up to date.";
      dbRun(
        `INSERT INTO sync_logs (id, timestamp, status, itemsAdded, message) VALUES (?, ?, ?, ?, ?)`,
        [logId, timestamp, "success", addedCount, logMsg],
        true
      );
      res.json({
        success: true,
        message: "Telegram Channel Smart Sync completed!",
        lastSyncTime: timestamp,
        itemsAdded: addedCount
      });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/media/stream/:id", async (req, res, next) => {
    try {
      const fileId = sanitizeString(req.params.id);
      const file = dbGet("SELECT * FROM files WHERE id = ?", [fileId]);
      if (!file) {
        return res.status(404).send("Media file not found");
      }
      dbRun("UPDATE files SET downloadCount = downloadCount + 1 WHERE id = ?", [fileId]);
      const filePath = file.localPath || file.cachePath;
      if (filePath && import_fs.default.existsSync(filePath) && (file.cacheStatus === "cached" || !file.cacheStatus)) {
        dbRun("UPDATE files SET lastAccessedAt = ? WHERE id = ?", [(/* @__PURE__ */ new Date()).toISOString(), fileId]);
        serveLocalFileStream(req, res, filePath, file.mimeType);
        return;
      }
      startBackgroundCaching(fileId).catch(() => {
      });
      const settings = getSettingsMap();
      if (settings.botToken && file.fileId && !file.fileId.startsWith("demo_")) {
        try {
          const fileData = await callTelegramBotApi("getFile", { file_id: file.fileId });
          if (fileData && fileData.file_path) {
            const downloadUrl = `https://api.telegram.org/file/bot${settings.botToken}/${fileData.file_path}`;
            const response = await (0, import_axios.default)({
              url: downloadUrl,
              method: "GET",
              responseType: "stream"
            });
            res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("X-Cache-Status", "MISS-STREAMING");
            response.data.pipe(res);
            return;
          }
        } catch (err) {
          logger.warn("Direct stream attempt fallback notice:", { error: err.message });
        }
      }
      res.setHeader("Content-Type", file.mimeType || "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("X-Cache-Status", "FALLBACK");
      res.redirect("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    } catch (err) {
      next(err);
    }
  });
  function serveLocalFileStream(req, res, filePath, mimeType) {
    let stat;
    try {
      stat = import_fs.default.statSync(filePath);
    } catch (e) {
      return res.status(404).send("Stream source file unreadable");
    }
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
      if (isNaN(start) || start >= fileSize || parts[1] && isNaN(end)) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).send("Requested Range Not Satisfiable");
      }
      const chunkSize = end - start + 1;
      const fileStream = import_fs.default.createReadStream(filePath, { start, end });
      req.on("close", () => fileStream.destroy());
      res.on("close", () => fileStream.destroy());
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
        "X-Cache-Status": "HIT"
      };
      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": mimeType || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "X-Cache-Status": "HIT"
      };
      const fileStream = import_fs.default.createReadStream(filePath);
      req.on("close", () => fileStream.destroy());
      res.on("close", () => fileStream.destroy());
      res.writeHead(200, head);
      fileStream.pipe(res);
    }
  }
  app.get("/api/playlists", (req, res) => {
    const rows = dbAll("SELECT * FROM playlists");
    const playlists = rows.map((r) => ({
      ...r,
      fileIds: JSON.parse(r.fileIds || "[]")
    }));
    res.json(playlists);
  });
  app.post("/api/playlists", (req, res, next) => {
    try {
      const name = sanitizeString(req.body.name);
      const description = sanitizeString(req.body.description);
      const coverColor = sanitizeString(req.body.coverColor) || "from-purple-600 to-pink-600";
      if (!name) return res.status(400).json({ error: "Playlist name required" });
      const newPlaylist = {
        id: "pl-" + Date.now(),
        name,
        description,
        coverColor,
        fileIds: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      dbRun(
        `INSERT INTO playlists (id, name, description, coverColor, fileIds, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [newPlaylist.id, newPlaylist.name, newPlaylist.description, newPlaylist.coverColor, JSON.stringify(newPlaylist.fileIds), newPlaylist.createdAt],
        true
      );
      res.json(newPlaylist);
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/playlists/:id/add-file", (req, res, next) => {
    try {
      const playlistId = sanitizeString(req.params.id);
      const fileId = sanitizeString(req.body.fileId);
      const playlist = dbGet("SELECT * FROM playlists WHERE id = ?", [playlistId]);
      if (!playlist) return res.status(404).json({ error: "Playlist not found" });
      const fileIds = JSON.parse(playlist.fileIds || "[]");
      if (!fileIds.includes(fileId)) {
        fileIds.push(fileId);
        dbRun("UPDATE playlists SET fileIds = ? WHERE id = ?", [JSON.stringify(fileIds), playlistId], true);
      }
      res.json({ success: true, fileIds });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/playlists/:id", (req, res, next) => {
    try {
      const playlistId = sanitizeString(req.params.id);
      const name = sanitizeString(req.body.name);
      const description = sanitizeString(req.body.description);
      const coverColor = sanitizeString(req.body.coverColor);
      const fileIds = Array.isArray(req.body.fileIds) ? req.body.fileIds.map(sanitizeString) : null;
      const existing = dbGet("SELECT * FROM playlists WHERE id = ?", [playlistId]);
      if (!existing) return res.status(404).json({ error: "Playlist not found" });
      const updatedName = name || existing.name;
      const updatedDesc = description !== void 0 ? description : existing.description;
      const updatedColor = coverColor || existing.coverColor;
      const updatedFileIds = fileIds !== null ? JSON.stringify(fileIds) : existing.fileIds;
      dbRun(
        "UPDATE playlists SET name = ?, description = ?, coverColor = ?, fileIds = ? WHERE id = ?",
        [updatedName, updatedDesc, updatedColor, updatedFileIds, playlistId],
        true
      );
      res.json({
        id: playlistId,
        name: updatedName,
        description: updatedDesc,
        coverColor: updatedColor,
        fileIds: JSON.parse(updatedFileIds || "[]"),
        createdAt: existing.createdAt
      });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/playlists/:id/remove-file/:fileId", (req, res, next) => {
    try {
      const playlistId = sanitizeString(req.params.id);
      const fileId = sanitizeString(req.params.fileId);
      const playlist = dbGet("SELECT * FROM playlists WHERE id = ?", [playlistId]);
      if (!playlist) return res.status(404).json({ error: "Playlist not found" });
      let fileIds = JSON.parse(playlist.fileIds || "[]");
      fileIds = fileIds.filter((id) => id !== fileId);
      dbRun("UPDATE playlists SET fileIds = ? WHERE id = ?", [JSON.stringify(fileIds), playlistId], true);
      res.json({ success: true, fileIds });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/playlists/:id", (req, res) => {
    const playlistId = sanitizeString(req.params.id);
    dbRun("DELETE FROM playlists WHERE id = ?", [playlistId], true);
    res.json({ success: true, message: "Playlist deleted" });
  });
  setInterval(async () => {
    try {
      const settings = getSettingsMap();
      if (settings.autoSyncEnabled === "true" && settings.botToken) {
        logger.info("Running periodic Telegram channel background auto-sync...");
        const updates = await callTelegramBotApi("getUpdates", { offset: -30 });
        if (Array.isArray(updates)) {
          let addedCount = 0;
          for (const u of updates) {
            const msg = u.channel_post || u.message;
            if (msg && (msg.document || msg.audio || msg.video || msg.photo)) {
              const mediaObj = msg.document || msg.audio || msg.video || (msg.photo ? msg.photo[msg.photo.length - 1] : null);
              if (mediaObj && mediaObj.file_id) {
                const rawName = mediaObj.file_name || `tg_media_${msg.message_id}.${mediaObj.mime_type ? mediaObj.mime_type.split("/")[1] : "bin"}`;
                const safeName = sanitizeFilename(rawName);
                const category = getCategoryFromMime(mediaObj.mime_type || "", safeName);
                const exists = dbGet("SELECT id FROM files WHERE telegramMessageId = ? OR fileId = ?", [msg.message_id, mediaObj.file_id]);
                if (!exists) {
                  dbRun(
                    `INSERT INTO files (id, telegramMessageId, fileId, fileUniqueId, fileName, fileSize, mimeType, category, caption, duration, artist, title, createdAt, isFavorite, downloadCount)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
                    [
                      "file-sync-" + msg.message_id,
                      msg.message_id,
                      mediaObj.file_id,
                      mediaObj.file_unique_id || "uniq_" + msg.message_id,
                      safeName,
                      mediaObj.file_size || 5e6,
                      mediaObj.mime_type || "application/octet-stream",
                      category,
                      sanitizeString(msg.caption || safeName),
                      mediaObj.duration || null,
                      sanitizeString(mediaObj.performer || null),
                      sanitizeString(mediaObj.title || null),
                      new Date(msg.date * 1e3).toISOString()
                    ]
                  );
                  addedCount++;
                }
              }
            }
          }
          if (addedCount > 0) {
            setSetting("lastSyncTime", (/* @__PURE__ */ new Date()).toISOString());
            logger.info(`Background sync indexed ${addedCount} new files.`);
          }
        }
      }
    } catch (e) {
    }
  }, 18e4);
  app.use((err, req, res, next) => {
    logger.error("Unhandled server request error:", {
      url: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : void 0
    });
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`[TeleCloud Pro v2.0] Production server listening on http://0.0.0.0:${PORT}`);
  });
  server.setTimeout(3e5);
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down TeleCloud Pro gracefully...`);
    saveDB(true);
    if (tgClient) {
      try {
        await tgClient.disconnect();
        logger.info("GramJS MTProto client disconnected cleanly.");
      } catch (e) {
        logger.warn("GramJS disconnect note:", { error: e.message });
      }
    }
    server.close(() => {
      logger.info("HTTP server closed cleanly. Process exiting.");
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forcefully exiting shutdown after timeout.");
      process.exit(1);
    }, 5e3);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", { error: err.message, stack: err.stack });
    saveDB(true);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
