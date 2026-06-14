const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadTodos: () => ipcRenderer.invoke('todo:load'),
  saveTodos: (todos) => ipcRenderer.invoke('todo:save', todos),
  exportTodos: (todos) => ipcRenderer.invoke('todo:export', todos)
});