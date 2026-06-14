const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

const getDataPath = () => path.join(app.getPath('userData'), 'todos.json');

async function ensureDataFile() {
  try {
    await fs.access(getDataPath());
  } catch {
    await fs.writeFile(getDataPath(), JSON.stringify([], null, 2));
  }
}

async function loadTodos() {
  try {
    const data = await fs.readFile(getDataPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveTodos(todos) {
  await fs.writeFile(getDataPath(), JSON.stringify(todos, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 550,
    frame: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Todo List',
    autoHideMenuBar: true,
  });
  win.loadFile('index.html');
}

app.whenReady().then(async () => {
  await ensureDataFile();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('todo:load', loadTodos);
ipcMain.handle('todo:save', (event, todos) => saveTodos(todos));

ipcMain.handle('todo:export', async (event, todos) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: '导出任务数据',
    defaultPath: `todos_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { success: false };
  await fs.writeFile(filePath, JSON.stringify(todos, null, 2));
  return { success: true, path: filePath };
});

ipcMain.handle('todo:import', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: '导入任务数据',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return null;
  const content = await fs.readFile(filePaths[0], 'utf-8');
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) return data;
    else return null;
  } catch {
    return null;
  }
});

ipcMain.handle('update:check', async () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/junloye/Todo-List/releases/latest',
      method: 'GET',
      timeout: 10000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Todo-List-Desktop-App/1.0.0'
      }
    };

    // 尝试使用 GitHub Token（如果存在）来提高速率限制
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      options.headers['Authorization'] = `token ${githubToken}`;
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          if (res.statusCode === 403) {
            const remaining = res.headers['x-ratelimit-remaining'];
            const limit = res.headers['x-ratelimit-limit'];
            const resetTime = res.headers['x-ratelimit-reset'];
            let errorMsg = 'GitHub API 请求过于频繁，请稍后重试';
            if (remaining === '0' && resetTime) {
              const resetDate = new Date(parseInt(resetTime) * 1000);
              errorMsg = `API 请求限制已用尽，将在 ${resetDate.toLocaleTimeString()} 重置`;
            } else if (limit) {
              errorMsg = `API 请求限制: ${remaining}/${limit}，请稍后重试`;
            }
            reject(new Error(errorMsg));
          } else if (res.statusCode === 404) {
            reject(new Error('未找到仓库发布信息'));
          } else if (res.statusCode === 401) {
            reject(new Error('GitHub 认证失败'));
          } else {
            reject(new Error(`网络错误: HTTP ${res.statusCode} ${res.statusMessage}`));
          }
        } else {
          try {
            const releaseData = JSON.parse(data);
            resolve(releaseData);
          } catch (e) {
            reject(new Error('解析更新信息失败'));
          }
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('网络请求超时，请检查网络连接'));
    });

    req.on('error', (error) => {
      reject(new Error(`网络连接失败: ${error.message}`));
    });

    req.end();
  });
});

ipcMain.handle('app:openUrl', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('打开 URL 失败:', error);
    return { success: false, error: error.message };
  }
});