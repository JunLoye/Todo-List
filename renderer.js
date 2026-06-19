const todoListEl = document.getElementById('todoList');
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const totalSpan = document.getElementById('totalCount');
const activeSpan = document.getElementById('activeCount');
const completedSpan = document.getElementById('completedCount');
const exportBtn = document.getElementById('exportBtn');
const settingsBtn = document.getElementById('settingsBtn');

const tasksView = document.getElementById('tasksView');
const settingsView = document.getElementById('settingsView');
const closeSettingsViewBtn = document.getElementById('closeSettingsViewBtn');

const themePicker = document.getElementById('themePicker');
const themeBtns = document.querySelectorAll('.theme-btn');
const dueDateEnableToggle = document.getElementById('dueDateEnableToggle');
const debugModeToggle = document.getElementById('debugModeToggle');
const logLevelSelect = document.getElementById('logLevelSelect');
const importDataBtn = document.getElementById('importDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const openGithubBtn = document.getElementById('openGithubBtn');
const settingsVersionSpan = document.getElementById('settingsVersionSpan');
const updateStatusText = document.getElementById('updateStatusText');
const dueDateContainer = document.getElementById('dueDateContainer');

const taskTagsInput = document.getElementById('taskTagsInput');
const taskSubtasksInput = document.getElementById('taskSubtasksInput');

const sortTrigger = document.getElementById('sortTrigger');
const sortOptions = document.getElementById('sortOptions');
const sortSelectedText = document.getElementById('sortSelectedText');
const customSelect = document.getElementById('customSortSelect');
const sortDueAscOpt = document.getElementById('sortDueAscOpt');

const editModal = document.getElementById('editModal');
const editTitle = document.getElementById('editTitle');
const editDueDate = document.getElementById('editDueDate');
const editTags = document.getElementById('editTags');
const saveEditBtn = document.getElementById('saveEditBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const customDialog = document.getElementById('customDialog');
const dialogMessage = document.getElementById('dialogMessage');
const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
const dialogCancelBtn = document.getElementById('dialogCancelBtn');
const dialogIconPath = document.getElementById('dialogIconPath');
const toastContainer = document.getElementById('toastContainer');

const VERSION = '1.3.0';
let tasks = [];
let currentFilter = 'all';
let currentSort = 'create-desc';
let editingTaskId = null;
let expandedTaskIds = new Set();

const APP_CONFIG = {
  theme: 'light',
  dueDateEnabled: true,
  debugMode: false
};

function log(message, level = 'info') {
  if (window.electronAPI && window.electronAPI.log) {
    window.electronAPI.log(message, level);
  } else {
    console.log(`[${level}]`, message);
  }
}

async function init() {
  settingsVersionSpan.textContent = VERSION;

  try {
    const config = await window.electronAPI.configGet();
    const debugFromMain = config.debugEnabled;
    localStorage.setItem('todo_debug_mode', String(debugFromMain));
    APP_CONFIG.debugMode = debugFromMain;
    debugModeToggle.checked = debugFromMain;

    const level = config.logLevel || 'info';
    if (logLevelSelect) {
      logLevelSelect.value = level;
    }
    if (debugFromMain && window.electronAPI.setDebugMode) {
      window.electronAPI.setDebugMode(true);
    }
  } catch (e) {
    console.warn('读取主进程配置失败，使用 localStorage 默认值', e);
  }

  loadConfig();
  tasks = await window.electronAPI.loadTodos();
  tasks = tasks.map(t => ({
    ...t,
    tags: t.tags || [],
    subtasks: t.subtasks || []
  }));
  updateSortDisplay(currentSort);
  render();
  log('应用初始化完成');
}

function loadConfig() {
  let theme = localStorage.getItem('todo_theme') || 'light';
  const validThemes = ['light', 'dark', 'blue', 'green', 'purple', 'orange', 'pink', 'yellow'];
  if (!validThemes.includes(theme)) {
    theme = 'light';
  }
  APP_CONFIG.theme = theme;
  document.body.setAttribute('data-theme', theme);

  themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  const savedDue = localStorage.getItem('todo_due_enabled');
  APP_CONFIG.dueDateEnabled = savedDue !== null ? savedDue === 'true' : true;
  dueDateEnableToggle.checked = APP_CONFIG.dueDateEnabled;
  applyDueDateFeatureState();

  const debug = localStorage.getItem('todo_debug_mode') === 'true';
  APP_CONFIG.debugMode = debug;
  debugModeToggle.checked = debug;
}

function saveConfig() {
  localStorage.setItem('todo_theme', APP_CONFIG.theme);
  localStorage.setItem('todo_due_enabled', APP_CONFIG.dueDateEnabled);
  localStorage.setItem('todo_debug_mode', APP_CONFIG.debugMode);
}

function applyDueDateFeatureState() {
  if (APP_CONFIG.dueDateEnabled) {
    dueDateContainer.style.display = 'inline-block';
    if (sortDueAscOpt) sortDueAscOpt.style.display = 'block';
    editDueDate.style.display = 'block';
  } else {
    dueDateContainer.style.display = 'none';
    if (sortDueAscOpt) sortDueAscOpt.style.display = 'none';
    editDueDate.style.display = 'none';
    if (currentSort === 'due-asc') {
      const firstOption = sortOptions.querySelector('.option-item');
      if (firstOption) {
        firstOption.click();
      }
    }
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  if (type === 'error') {
    icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  }
  
  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'opacity 0.15s, transform 0.15s';
    setTimeout(() => toast.remove(), 150);
  }, 2500);
}

function showConfirmDialog(message, type = 'warning') {
  return new Promise((resolve) => {
    dialogMessage.textContent = message;
    if (type === 'danger') {
      dialogIconPath.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z');
      dialogConfirmBtn.className = 'primary-btn';
      dialogConfirmBtn.style.background = '#d32f2f';
    } else {
      dialogIconPath.setAttribute('d', 'M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z');
      dialogConfirmBtn.className = 'primary-btn';
      dialogConfirmBtn.style.background = 'var(--btn-primary-bg)';
    }

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      customDialog.close();
    };

    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    customDialog.showModal();
  });
}

function render() {
  const todayStr = new Date().toISOString().split('T')[0];
  todoListEl.innerHTML = '';
  let filtered = [...tasks];

  if (currentFilter === 'active') {
    filtered = tasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = tasks.filter(t => t.completed);
  }

  filtered.sort((a, b) => {
    if (currentSort === 'create-desc') return b.createdAt - a.createdAt;
    if (currentSort === 'create-asc') return a.createdAt - b.createdAt;
    if (currentSort === 'due-asc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  });

  filtered.forEach(task => {
    const item = document.createElement('div');
    let classes = 'todo-item';
    if (task.completed) classes += ' completed';
    if (!task.completed && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]) {
      classes += ' overdue';
    }
    item.className = classes;
    item.setAttribute('data-id', task.id);

    let tagsHtml = '';
    if (task.tags && task.tags.length) {
      tagsHtml = `<div class="todo-tags">${task.tags.map(tag =>
        `<span class="tag">${tag}</span>`
      ).join('')}</div>`;
    }

    let metaHtml = '';
    if (APP_CONFIG.dueDateEnabled && task.dueDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      const isOverdue = !task.completed && task.dueDate < todayStr;
      metaHtml = `
        <div class="todo-meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span class="${isOverdue ? 'overdue' : ''}">${task.dueDate}${isOverdue ? ' (已过期)' : ''}</span>
        </div>
      `;
    }

    let subtaskHtml = '';
    if (task.subtasks && task.subtasks.length) {
      subtaskHtml = `<ul class="subtask-list">${task.subtasks.map(st =>
        `<li class="subtask-item" data-subtask-id="${st.id}">
          <input type="checkbox" class="subtask-checkbox" ${st.completed ? 'checked' : ''}>
          <span class="subtask-title">${st.title}</span>
          <div class="subtask-actions">
            <button class="icon-btn edit-subtask-btn" title="编辑子任务">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="icon-btn delete-subtask-btn" title="删除子任务">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </li>`
      ).join('')}</ul>`;
    }

    const addSubtaskHtml = `
      <div class="add-subtask">
        <input type="text" class="subtask-input" placeholder="添加子任务...">
        <button class="icon-btn add-subtask-btn" title="添加子任务">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    `;

    const isExpanded = expandedTaskIds.has(task.id);

    item.innerHTML = `
      <div class="todo-main">
        <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="todo-content">
          <span class="todo-title">${task.title}</span>
          ${tagsHtml}
          ${metaHtml}
        </div>
        <div class="todo-actions">
          <button class="icon-btn toggle-subtasks-btn" title="子任务">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <button class="icon-btn edit-btn" title="编辑">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="icon-btn delete-btn" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="subtask-container" style="display:${isExpanded ? 'block' : 'none'};">
        ${subtaskHtml}
        ${addSubtaskHtml}
      </div>
    `;

    todoListEl.appendChild(item);
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  totalSpan.textContent = total;
  activeSpan.textContent = total - completed;
  completedSpan.textContent = completed;
}

function updateSortDisplay(value) {
  const option = sortOptions.querySelector(`.option-item[data-value="${value}"]`);
  if (option) {
    sortSelectedText.textContent = option.textContent;
    sortOptions.querySelectorAll('.option-item').forEach(item => item.classList.remove('active'));
    option.classList.add('active');
    currentSort = value;
  }
}

function handleSortChange(value) {
  updateSortDisplay(value);
  render();
  log(`排序方式切换为: ${value}`);
}

function initCustomSelect() {
  sortTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
  });

  sortOptions.addEventListener('click', (e) => {
    const option = e.target.closest('.option-item');
    if (!option) return;
    const value = option.dataset.value;
    if (!APP_CONFIG.dueDateEnabled && value === 'due-asc') {
      showToast('截止日期功能已禁用', 'error');
      customSelect.classList.remove('open');
      return;
    }
    handleSortChange(value);
    customSelect.classList.remove('open');
  });

  document.addEventListener('click', () => {
    customSelect.classList.remove('open');
  });

  sortTrigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      customSelect.classList.toggle('open');
    }
    if (e.key === 'Escape') {
      customSelect.classList.remove('open');
    }
  });
}

async function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;
  const dueDate = APP_CONFIG.dueDateEnabled ? dueDateInput.value : '';

  const tagsRaw = taskTagsInput.value.trim();
  const tags = tagsRaw ? tagsRaw.split(/[，,]\s*/).filter(s => s !== '') : [];

  const subtasksRaw = taskSubtasksInput.value.trim();
  const subtaskTitles = subtasksRaw ? subtasksRaw.split(/[，,]\s*/).filter(s => s !== '') : [];
  const subtasks = subtaskTitles.map(title => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
    title,
    completed: false
  }));

  const newTask = {
    id: Date.now().toString(),
    title,
    completed: false,
    dueDate,
    createdAt: Date.now(),
    tags,
    subtasks
  };

  tasks.push(newTask);
  taskInput.value = '';
  dueDateInput.value = '';
  taskTagsInput.value = '';
  taskSubtasksInput.value = '';
  await window.electronAPI.saveTodos(tasks);
  render();
  showToast('任务已成功添加');
  log(`添加任务: ${title}`);
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  expandedTaskIds.delete(id);
  await window.electronAPI.saveTodos(tasks);
  render();
  showToast('任务已成功删除');
  log(`删除任务: ${id}`);
}

async function toggleComplete(id, completed) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = completed;
    await window.electronAPI.saveTodos(tasks);
    render();
    if (completed) {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.85 } });
    }
    log(`任务 ${id} 完成状态: ${completed}`);
  }
}

function openEditModal(task) {
  editingTaskId = task.id;
  editTitle.value = task.title;
  editDueDate.value = task.dueDate || '';
  editTags.value = (task.tags || []).join(', ');
  editModal.showModal();
}

async function saveEdit() {
  const title = editTitle.value.trim();
  if (!title) return;
  const tags = editTags.value.split(/[，,]\s*/).filter(s => s !== '');

  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.title = title;
    task.tags = tags;
    if (APP_CONFIG.dueDateEnabled) {
      task.dueDate = editDueDate.value;
    }
    await window.electronAPI.saveTodos(tasks);
    render();
    editModal.close();
    showToast('任务更新成功');
    log(`编辑任务: ${editingTaskId}`);
  }
}

async function clearCompleted() {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount === 0) {
    showToast('当前没有已完成的任务', 'error');
    return;
  }
  const confirm = await showConfirmDialog(`确定要清除这 ${completedCount} 个已完成的任务吗？`);
  if (confirm) {
    const toRemove = tasks.filter(t => t.completed).map(t => t.id);
    tasks = tasks.filter(t => !t.completed);
    toRemove.forEach(id => expandedTaskIds.delete(id));
    await window.electronAPI.saveTodos(tasks);
    render();
    showToast('已完成任务清理完毕');
    log(`清理已完成任务，共 ${completedCount} 项`);
  }
}

function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  render();
}

async function exportData() {
  const res = await window.electronAPI.exportTodos(tasks);
  if (res.success) {
    showToast('数据导出成功');
    log('导出数据成功');
  } else {
    log('导出数据取消或失败');
  }
}

async function importData() {
  const res = await window.electronAPI.importTodos();
  if (res.success && res.data) {
    tasks = res.data.map(t => ({
      ...t,
      tags: t.tags || [],
      subtasks: t.subtasks || []
    }));
    expandedTaskIds.clear();
    await window.electronAPI.saveTodos(tasks);
    render();
    showToast('外部数据导入成功');
    log(`导入数据，共 ${tasks.length} 项`);
  } else if (res.error) {
    showToast(res.error, 'error');
    log(`导入失败: ${res.error}`, 'error');
  } else if (!res.success) {
    showToast('导入取消', 'error');
    log('导入取消');
  }
}

function styleSpin() {
  if (!document.getElementById('spinStyle')) {
    const style = document.createElement('style');
    style.id = 'spinStyle';
    style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // ----- 初始化 -----
  init();
  initCustomSelect();

  // ----- 添加任务 -----
  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
  if (dueDateInput) dueDateInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

  // ----- 清除已完成 -----
  clearCompletedBtn.addEventListener('click', clearCompleted);

  // ----- 导出（原 exportBtn 已在 HTML 中移除，保留以防万一）-----
  exportBtn?.addEventListener('click', exportData);

  // ----- 筛选 -----
  filterBtns.forEach(btn => btn.addEventListener('click', () => setFilter(btn.getAttribute('data-filter'))));

  // ----- 任务列表事件（点击、变更）-----
  todoListEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = item.getAttribute('data-id');

    if (e.target.closest('.edit-btn')) {
      const task = tasks.find(t => t.id === id);
      if (task) openEditModal(task);
      return;
    }
    if (e.target.closest('.delete-btn')) {
      await deleteTask(id);
      return;
    }
    if (e.target.closest('.toggle-subtasks-btn')) {
      if (expandedTaskIds.has(id)) {
        expandedTaskIds.delete(id);
      } else {
        expandedTaskIds.add(id);
      }
      render();
      return;
    }
    if (e.target.closest('.add-subtask-btn')) {
      const container = item.querySelector('.subtask-container');
      const input = container.querySelector('.subtask-input');
      const title = input.value.trim();
      if (!title) return;
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.subtasks.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
          title,
          completed: false
        });
        expandedTaskIds.add(id);
        await window.electronAPI.saveTodos(tasks);
        render();
      }
      return;
    }
    if (e.target.closest('.delete-subtask-btn')) {
      const subtaskItem = e.target.closest('.subtask-item');
      const subtaskId = subtaskItem.dataset.subtaskId;
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
        await window.electronAPI.saveTodos(tasks);
        render();
      }
      return;
    }

    // 编辑子任务（内联编辑）
    if (e.target.closest('.edit-subtask-btn')) {
      const subtaskItem = e.target.closest('.subtask-item');
      if (!subtaskItem) return;
      const subtaskId = subtaskItem.dataset.subtaskId;
      const taskItem = subtaskItem.closest('.todo-item');
      const taskId = taskItem.dataset.id;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (!subtask) return;

      // 如果有其他正在编辑的，先保存
      const existingInput = document.querySelector('.subtask-edit-input');
      if (existingInput) {
        const original = existingInput.dataset.originalText || '';
        const span = document.createElement('span');
        span.className = 'subtask-title';
        span.textContent = original;
        existingInput.replaceWith(span);
      }

      const titleSpan = subtaskItem.querySelector('.subtask-title');
      const originalText = titleSpan.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'subtask-edit-input';
      input.value = originalText;
      input.dataset.originalText = originalText;
      titleSpan.replaceWith(input);
      input.focus();
      input.select();

      const saveEdit = () => {
        input.removeEventListener('blur', saveEdit);
        if (input.dataset.saving) return;
        input.dataset.saving = 'true';
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
          subtask.title = newText;
          window.electronAPI.saveTodos(tasks);
          render();
        } else {
          const newSpan = document.createElement('span');
          newSpan.className = 'subtask-title';
          newSpan.textContent = originalText;
          input.replaceWith(newSpan);
        }
      };

      const cancelEdit = () => {
        input.removeEventListener('blur', saveEdit);
        const newSpan = document.createElement('span');
        newSpan.className = 'subtask-title';
        newSpan.textContent = originalText;
        input.replaceWith(newSpan);
      };

      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          input.blur();
        } else if (ev.key === 'Escape') {
          ev.preventDefault();
          cancelEdit();
        }
      });
      return;
    }
  });

  todoListEl.addEventListener('change', async (e) => {
    if (e.target.classList.contains('subtask-checkbox')) {
      const item = e.target.closest('.todo-item');
      const taskId = item.dataset.id;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const subtaskItem = e.target.closest('.subtask-item');
      const subtaskId = subtaskItem.dataset.subtaskId;
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        subtask.completed = e.target.checked;
        await window.electronAPI.saveTodos(tasks);
        render();
      }
      return;
    }
    if (e.target.classList.contains('todo-checkbox')) {
      const item = e.target.closest('.todo-item');
      const id = item.getAttribute('data-id');
      await toggleComplete(id, e.target.checked);
    }
  });

  todoListEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
      const addBtn = e.target.closest('.subtask-container').querySelector('.add-subtask-btn');
      if (addBtn) addBtn.click();
    }
  });

  // ----- 编辑模态框 -----
  saveEditBtn.addEventListener('click', saveEdit);
  closeModalBtn.addEventListener('click', () => editModal.close());

  // ----- 视图切换（任务 / 设置）-----
  settingsBtn.addEventListener('click', () => {
    tasksView.classList.remove('active');
    settingsView.classList.add('active');
    log('打开设置面板');
  });
  closeSettingsViewBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    tasksView.classList.add('active');
  });

  // ----- 主题切换（圆形按钮）-----
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const newTheme = btn.dataset.theme;
      if (APP_CONFIG.theme === newTheme) return;

      APP_CONFIG.theme = newTheme;
      document.body.setAttribute('data-theme', newTheme);

      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      saveConfig();
      log(`切换主题: ${newTheme}`);
    });
  });

  // ----- 截止日期开关 -----
  dueDateEnableToggle.addEventListener('change', (e) => {
    APP_CONFIG.dueDateEnabled = e.target.checked;
    saveConfig();
    applyDueDateFeatureState();
    render();
    log(`截止日期功能: ${APP_CONFIG.dueDateEnabled ? '启用' : '禁用'}`);
  });

  // ----- 调试模式开关 -----
  debugModeToggle.addEventListener('change', (e) => {
    APP_CONFIG.debugMode = e.target.checked;
    saveConfig();
    if (window.electronAPI && window.electronAPI.setDebugMode) {
      window.electronAPI.setDebugMode(APP_CONFIG.debugMode);
    }
    if (window.electronAPI && window.electronAPI.toggleDevTools) {
      window.electronAPI.toggleDevTools(APP_CONFIG.debugMode);
    }
    log(`调试模式: ${APP_CONFIG.debugMode ? '启用' : '禁用'}`);
  });

  // ----- 日志级别选择 -----
  logLevelSelect?.addEventListener('change', async (e) => {
    const level = e.target.value;
    if (window.electronAPI && window.electronAPI.setLogLevel) {
      const result = await window.electronAPI.setLogLevel(level);
      if (result.success) {
        showToast(`日志级别已切换为 ${level}`);
        log(`日志级别切换为 ${level}`);
      } else {
        showToast(result.error || '设置失败', 'error');
      }
    }
  });

  importDataBtn.addEventListener('click', importData);
  exportDataBtn.addEventListener('click', exportData);

  deleteAllDataBtn.addEventListener('click', async () => {
    const confirm = await showConfirmDialog('确认删除所有的任务数据吗？此操作无法撤销！', 'danger');
    if (confirm) {
      tasks = [];
      expandedTaskIds.clear();
      await window.electronAPI.saveTodos(tasks);
      render();
      showToast('所有本地存储已被重置清空', 'error');
      log('清空全部数据');
    }
  });

  resetSettingsBtn.addEventListener('click', async () => {
    const confirm = await showConfirmDialog('确定恢复默认设置吗？');
    if (confirm) {
      localStorage.removeItem('todo_theme');
      localStorage.removeItem('todo_due_enabled');
      localStorage.removeItem('todo_debug_mode');
      loadConfig();
      updateSortDisplay(currentSort);
      render();
      showToast('设置偏好已恢复默认');
      log('重置设置');
    }
  });

  openGithubBtn.addEventListener('click', async () => {
    try {
      openGithubBtn.disabled = true;
      showToast('正在打开 GitHub...');
      await window.electronAPI.openUrl('https://github.com/junloye/Todo-List');
      log('打开 GitHub 页面');
    } catch (error) {
      console.error('打开 GitHub 失败:', error);
      showToast('无法打开 GitHub，请检查网络连接', 'error');
      log(`打开 GitHub 失败: ${error.message}`, 'error');
    } finally {
      openGithubBtn.disabled = false;
    }
  });

  const openReleasesBtn = document.getElementById('openReleasesBtn');
  if (openReleasesBtn) {
    openReleasesBtn.addEventListener('click', async () => {
      try {
        openReleasesBtn.disabled = true;
        await window.electronAPI.openUrl('https://github.com/junloye/Todo-List/releases');
        log('打开更新日志页面');
      } catch (error) {
        showToast('无法打开更新日志，请检查网络', 'error');
        log(`打开更新日志失败: ${error.message}`, 'error');
      } finally {
        openReleasesBtn.disabled = false;
      }
    });
  }

  let updating = false;
  checkUpdateBtn.addEventListener('click', async () => {
    if (updating) return;
    updating = true;
    checkUpdateBtn.disabled = true;

    updateStatusText.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
      检查中...
    `;
    updateStatusText.style.color = 'var(--text-secondary)';

    styleSpin();

    try {
      const data = await window.electronAPI.checkUpdate();
      const latestVersion = data.tag_name.replace(/^v/, '');

      if (latestVersion !== VERSION) {
        updateStatusText.innerHTML = `检测到新版本 v${latestVersion}`;
        updateStatusText.style.color = '#e57373';
        const updateConfirm = await showConfirmDialog(`发现新版本 v${latestVersion}，是否前往下载？`);
        if (updateConfirm) {
          window.electronAPI.openUrl('https://github.com/junloye/Todo-List/releases');
        }
        log(`发现新版本 v${latestVersion}`);
      } else {
        updateStatusText.innerHTML = '当前已是最新版本';
        updateStatusText.style.color = '#81c784';
        showToast('暂无更新');
        log('已是最新版本');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      let errorMsg = '网络请求失败';
      
      if (error.message) {
        if (error.message.includes('请求限制') || error.message.includes('速率限制')) {
          errorMsg = error.message;
        } else if (error.message.includes('超时')) {
          errorMsg = '网络请求超时，请检查网络连接';
        } else if (error.message.includes('连接')) {
          errorMsg = '无法连接网络，请检查网络设置';
        } else {
          errorMsg = error.message;
        }
      }

      updateStatusText.innerHTML = errorMsg;
      updateStatusText.style.color = '#e57373';
      showToast(errorMsg, 'error');
      log(`检查更新失败: ${errorMsg}`, 'error');
    } finally {
      updating = false;
      checkUpdateBtn.disabled = false;
    }
  });
});