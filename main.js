const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

let mainWindow = null;
let debugEnabled = false;
let logLevel = 'info';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fsSync.existsSync(configPath)) {
      const raw = fsSync.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      debugEnabled = config.debugEnabled || false;
      logLevel = config.logLevel || 'info';
    }
  } catch (e) {
    console.warn('读取配置失败，使用默认值', e.message);
  }
}

function saveConfig(config) {
  try {
    fsSync.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('保存配置失败', e.message);
  }
}

// 保存日志到当前工作目录下的 app.log（避免依赖不存在的 logs 目录）
const logFilePath = path.join(process.cwd(), 'app.log');

function ensureLogFile() {
  const dir = path.dirname(logFilePath);
  try {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
    if (!fsSync.existsSync(logFilePath)) {
      fsSync.writeFileSync(logFilePath, '\uFEFF', { encoding: 'utf8' });
    }
  } catch (e) {
    console.error('无法创建日志文件:', e && e.message ? e.message : e);
  }
}

function logMessage(level, ...args) {
  const shouldLog = debugEnabled || (LOG_LEVELS[level] >= LOG_LEVELS[logLevel]);
  if (!shouldLog) return;

  const timestamp = new Date().toISOString();
  const msg = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  const entry = `[${timestamp}] [${level.toUpperCase()}] ${msg}\n`;
  ensureLogFile();
  fsSync.appendFile(logFilePath, entry, { encoding: 'utf8' }, (err) => {
    if (err) console.error('写入日志失败:', err);
  });
  if (process.argv.includes('--debug') || debugEnabled) {
    console.log(`[${level}]`, ...args);
  }
}

const getDataPath = () => path.join(app.getPath('userData'), 'todos.json');

let tasksCache = [];

async function ensureDataFile() {
  try {
    await fs.access(getDataPath());
  } catch {
    await fs.writeFile(getDataPath(), JSON.stringify([], null, 2));
    logMessage('info', '初始化数据文件');
  }
}

async function loadTodos() {
  try {
    const data = await fs.readFile(getDataPath(), 'utf-8');
    const parsed = JSON.parse(data);
    tasksCache = parsed;
    return parsed;
  } catch (error) {
    logMessage('error', '加载数据失败', error.message);
    return [];
  }
}

async function saveTodos(todos) {
  await fs.writeFile(getDataPath(), JSON.stringify(todos, null, 2));
  tasksCache = todos;
  logMessage('info', '保存任务数据，共', todos.length, '项');
}

function createWindow() {
  app.commandLine.appendSwitch('--force-device-scale-factor', '1');
  app.setAppUserModelId('com.junloye.todolist');

  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 550,
    frame: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      zoomFactor: 1.0,
    },
    title: 'Todo List',
    autoHideMenuBar: true,
  });

  win.loadFile('index.html');

  logMessage('info', '应用窗口已创建');
  mainWindow = win;
  return win;
}

app.whenReady().then(async () => {
  loadConfig();
  if (debugEnabled) {
    logLevel = 'debug';
    saveConfig({ debugEnabled, logLevel });
  }
  await ensureDataFile();
  await loadTodos();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  logMessage('info', '应用退出');
});

ipcMain.handle('todo:load', loadTodos);
ipcMain.handle('todo:save', (event, todos) => saveTodos(todos));

ipcMain.handle('todo:export', async (event, todos) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: '导出任务数据',
    defaultPath: `todos_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) {
    logMessage('info', '导出取消');
    return { success: false };
  }
  await fs.writeFile(filePath, JSON.stringify(todos, null, 2));
  logMessage('info', '导出成功', filePath);
  return { success: true, path: filePath };
});

ipcMain.handle('todo:import', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '导入任务数据',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) {
    logMessage('info', '导入取消');
    return { success: false };
  }
  try {
    const content = await fs.readFile(filePaths[0], 'utf-8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      logMessage('info', '导入成功', filePaths[0]);
      return { success: true, data: data };
    } else {
      const error = '导入的文件格式无效，应该是一个数组';
      logMessage('error', error);
      return { success: false, error };
    }
  } catch (error) {
    logMessage('error', '导入失败', error.message);
    return { success: false, error: `解析文件失败: ${error.message}` };
  }
});

ipcMain.handle('update:check', async () => {
  logMessage('info', '开始检查更新');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.github.com/repos/junloye/Todo-List/releases/latest', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Todo-List-Desktop-App/1.5.0'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `网络错误: HTTP ${response.status}`;
      if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetTime = response.headers.get('x-ratelimit-reset');
        if (remaining === '0' && resetTime) {
          const resetDate = new Date(parseInt(resetTime) * 1000);
          errorMsg = `API 请求限制已用尽，将在 ${resetDate.toLocaleTimeString()} 重置`;
        } else {
          errorMsg = `GitHub API 请求过于频繁，请稍后重试 (剩余 ${remaining})`;
        }
      } else if (response.status === 404) {
        errorMsg = '未找到仓库发布信息';
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    logMessage('info', '更新检查成功，最新版本', data.tag_name);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('网络请求超时，请检查网络连接');
    }
    throw error;
  }
});

ipcMain.handle('app:openUrl', async (event, url) => {
  try {
    await shell.openExternal(url);
    logMessage('info', '打开外部链接', url);
    return { success: true };
  } catch (error) {
    logMessage('error', '打开URL失败', url, error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('log', (event, level, message) => {
  logMessage(level, message);
});

ipcMain.handle('config:get', () => {
  return { debugEnabled, logLevel };
});

ipcMain.handle('config:setLogLevel', (event, level) => {
  if (LOG_LEVELS[level] !== undefined) {
    logLevel = level;
    saveConfig({ debugEnabled, logLevel });
    logMessage('info', '日志级别已更新为', level);
    return { success: true };
  }
  return { success: false, error: '无效的日志级别' };
});

ipcMain.handle('config:setDebug', (event, enabled) => {
  debugEnabled = enabled;
  if (enabled) {
    logLevel = 'debug';
  } else {
    logLevel = 'info';
  }
  saveConfig({ debugEnabled, logLevel });
  logMessage('info', `调试模式已${enabled ? '启用' : '禁用'}，日志级别自动设为 ${logLevel}`);
  return { success: true };
});

ipcMain.handle('devtools:open', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});
ipcMain.handle('devtools:close', () => {
  if (mainWindow) {
    mainWindow.webContents.closeDevTools();
  }
});