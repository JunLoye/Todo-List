const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

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
	//titleBarStyle: 'hidden',
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