const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: () => ipcRenderer.invoke('todo:load'),
  saveTodos: (todos) => ipcRenderer.invoke('todo:save', todos),
  exportTodos: (todos) => ipcRenderer.invoke('todo:export', todos),
  importTodos: () => ipcRenderer.invoke('todo:import'),
  loadHabits: () => ipcRenderer.invoke('habit:load'),
  saveHabits: (habits) => ipcRenderer.invoke('habit:save', habits),
  loadArchives: () => ipcRenderer.invoke('archive:load'),
  saveArchives: (archives) => ipcRenderer.invoke('archive:save', archives),
  loadGoals: () => ipcRenderer.invoke('goal:load'),
  saveGoals: (goals) => ipcRenderer.invoke('goal:save', goals),
  openUrl: async (url) => {
    try {
      const result = await ipcRenderer.invoke('app:openUrl', url);
      if (!result.success) {
        throw new Error(result.error || '打开链接失败');
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      throw error;
    }
  },
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  fetchChangelog: () => ipcRenderer.invoke('changelog:fetch'),
  log: (message, level = 'info') => ipcRenderer.invoke('log', level, message),
  configGet: () => ipcRenderer.invoke('config:get'),
  setLogLevel: (level) => ipcRenderer.invoke('config:setLogLevel', level),
  setDebugMode: (enabled) => ipcRenderer.invoke('config:setDebug', enabled),
  toggleDevTools: (enabled) => {
    if (enabled) {
      ipcRenderer.invoke('devtools:open');
    } else {
      ipcRenderer.invoke('devtools:close');
    }
  }
});