const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: () => ipcRenderer.invoke('todo:load'),
  saveTodos: (todos) => ipcRenderer.invoke('todo:save', todos),
  exportTodos: (todos) => ipcRenderer.invoke('todo:export', todos),
  importTodos: () => ipcRenderer.invoke('todo:import'),
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
  log: (message, level = 'info') => ipcRenderer.invoke('log', level, message),
  configGet: () => ipcRenderer.invoke('config:get'),
  setLogLevel: (level) => ipcRenderer.invoke('config:setLogLevel', level),
  // 新增：同步调试模式状态到主进程
  setDebugMode: (enabled) => ipcRenderer.invoke('config:setDebug', enabled),
  // 可选：切换开发者工具（原代码中调用，但未暴露，现补上）
  toggleDevTools: (enabled) => {
    if (enabled) {
      ipcRenderer.invoke('devtools:open'); // 主进程需实现，但非必须，可另加
    }
  }
});