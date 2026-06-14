const todoListEl = document.getElementById('todoList');
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortSelect = document.getElementById('sortSelect');
const totalSpan = document.getElementById('totalCount');
const activeSpan = document.getElementById('activeCount');
const completedSpan = document.getElementById('completedCount');
const exportBtn = document.getElementById('exportBtn');
const settingsBtn = document.getElementById('settingsBtn');

const tasksView = document.getElementById('tasksView');
const settingsView = document.getElementById('settingsView');
const closeSettingsViewBtn = document.getElementById('closeSettingsViewBtn');

const darkModeToggle = document.getElementById('darkModeToggle');
const dueDateEnableToggle = document.getElementById('dueDateEnableToggle');
const importDataBtn = document.getElementById('importDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const openGithubBtn = document.getElementById('openGithubBtn');
const settingsVersionSpan = document.getElementById('settingsVersionSpan');
const updateStatusText = document.getElementById('updateStatusText');
const dueDateContainer = document.getElementById('dueDateContainer');
const sortDueAscOpt = document.getElementById('sortDueAscOpt');

const editModal = document.getElementById('editModal');
const editTitle = document.getElementById('editTitle');
const editDueDate = document.getElementById('editDueDate');
const saveEditBtn = document.getElementById('saveEditBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const customDialog = document.getElementById('customDialog');
const dialogMessage = document.getElementById('dialogMessage');
const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
const dialogCancelBtn = document.getElementById('dialogCancelBtn');
const dialogIconPath = document.getElementById('dialogIconPath');
const toastContainer = document.getElementById('toastContainer');

const VERSION = '1.1.0';
let tasks = [];
let currentFilter = 'all';
let currentSort = 'create-desc';
let editingTaskId = null;

const APP_CONFIG = {
  theme: 'light',
  dueDateEnabled: true
};

async function init() {
  settingsVersionSpan.textContent = VERSION;
  loadConfig();
  tasks = await window.electronAPI.loadTodos();
  render();
}

function loadConfig() {
  APP_CONFIG.theme = localStorage.getItem('todo_theme') || 'light';
  const savedDue = localStorage.getItem('todo_due_enabled');
  APP_CONFIG.dueDateEnabled = savedDue !== null ? savedDue === 'true' : true;

  if (APP_CONFIG.theme === 'dark') {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  } else {
    document.body.classList.remove('dark-mode');
    darkModeToggle.checked = false;
  }

  dueDateEnableToggle.checked = APP_CONFIG.dueDateEnabled;
  applyDueDateFeatureState();
}

function applyDueDateFeatureState() {
  if (APP_CONFIG.dueDateEnabled) {
    dueDateContainer.style.display = 'inline-block';
    sortDueAscOpt.style.display = 'block';
    editDueDate.style.display = 'block';
  } else {
    dueDateContainer.style.display = 'none';
    sortDueAscOpt.style.display = 'none';
    editDueDate.style.display = 'none';
    if (currentSort === 'due-asc') {
      currentSort = 'create-desc';
      sortSelect.value = 'create-desc';
    }
  }
}

function saveConfig() {
  localStorage.setItem('todo_theme', APP_CONFIG.theme);
  localStorage.setItem('todo_due_enabled', APP_CONFIG.dueDateEnabled);
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
    item.className = `todo-item ${task.completed ? 'completed' : ''}`;
    item.setAttribute('data-id', task.id);

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

    item.innerHTML = `
      <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
      <div class="todo-content">
        <span class="todo-title"></span>
        ${metaHtml}
      </div>
      <div class="todo-actions">
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
    `;

    item.querySelector('.todo-title').textContent = task.title;
    todoListEl.appendChild(item);
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  totalSpan.textContent = total;
  activeSpan.textContent = total - completed;
  completedSpan.textContent = completed;
}

async function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;
  const dueDate = APP_CONFIG.dueDateEnabled ? dueDateInput.value : '';

  const newTask = {
    id: Date.now().toString(),
    title,
    completed: false,
    dueDate,
    createdAt: Date.now()
  };

  tasks.push(newTask);
  taskInput.value = '';
  dueDateInput.value = '';
  await window.electronAPI.saveTodos(tasks);
  render();
  showToast('任务已成功添加');
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  await window.electronAPI.saveTodos(tasks);
  render();
  showToast('任务已成功删除');
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
  }
}

function openEditModal(task) {
  editingTaskId = task.id;
  editTitle.value = task.title;
  editDueDate.value = task.dueDate || '';
  editModal.showModal();
}

async function saveEdit() {
  const title = editTitle.value.trim();
  if (!title) return;

  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.title = title;
    if (APP_CONFIG.dueDateEnabled) {
      task.dueDate = editDueDate.value;
    }
    await window.electronAPI.saveTodos(tasks);
    render();
    editModal.close();
    showToast('任务更新成功');
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
    tasks = tasks.filter(t => !t.completed);
    await window.electronAPI.saveTodos(tasks);
    render();
    showToast('已完成任务清理完毕');
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

function onSortChange(e) {
  currentSort = e.target.value;
  render();
}

async function exportData() {
  const res = await window.electronAPI.exportTodos(tasks);
  if (res.success) showToast('数据导出成功');
}

async function importData() {
  const res = await window.electronAPI.importTodos();
  if (res.success && res.data) {
    tasks = res.data;
    await window.electronAPI.saveTodos(tasks);
    render();
    showToast('外部数据导入成功');
  } else if (res.error) {
    showToast(res.error, 'error');
  }
}

// 添加旋转动画样式（仅执行一次）
function styleSpin() {
  if (!document.getElementById('spinStyle')) {
    const style = document.createElement('style');
    style.id = 'spinStyle';
    style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
  if (dueDateInput) dueDateInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
  clearCompletedBtn.addEventListener('click', clearCompleted);
  sortSelect.addEventListener('change', onSortChange);
  exportBtn?.addEventListener('click', exportData);
  filterBtns.forEach(btn => btn.addEventListener('click', () => setFilter(btn.getAttribute('data-filter'))));

  todoListEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = item.getAttribute('data-id');
    if (e.target.closest('.edit-btn')) {
      const task = tasks.find(t => t.id === id);
      if (task) openEditModal(task);
    } else if (e.target.closest('.delete-btn')) await deleteTask(id);
  });
  todoListEl.addEventListener('change', async (e) => {
    if (e.target.classList.contains('todo-checkbox')) {
      const item = e.target.closest('.todo-item');
      const id = item.getAttribute('data-id');
      await toggleComplete(id, e.target.checked);
    }
  });
  saveEditBtn.addEventListener('click', saveEdit);
  closeModalBtn.addEventListener('click', () => editModal.close());

  settingsBtn.addEventListener('click', () => {
    tasksView.classList.remove('active');
    settingsView.classList.add('active');
  });
  closeSettingsViewBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    tasksView.classList.add('active');
  });

  darkModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('dark-mode');
      APP_CONFIG.theme = 'dark';
    } else {
      document.body.classList.remove('dark-mode');
      APP_CONFIG.theme = 'light';
    }
    saveConfig();
  });

  dueDateEnableToggle.addEventListener('change', (e) => {
    APP_CONFIG.dueDateEnabled = e.target.checked;
    saveConfig();
    applyDueDateFeatureState();
    render();
  });

  importDataBtn.addEventListener('click', importData);
  exportDataBtn.addEventListener('click', exportData);
  
  deleteAllDataBtn.addEventListener('click', async () => {
    const confirm = await showConfirmDialog('确认删除所有的任务数据吗？此操作无法撤销！', 'danger');
    if (confirm) {
      tasks = [];
      await window.electronAPI.saveTodos(tasks);
      render();
      showToast('所有本地存储已被重置清空', 'error');
    }
  });

  resetSettingsBtn.addEventListener('click', async () => {
    const confirm = await showConfirmDialog('确定恢复出厂默认设置吗？');
    if (confirm) {
      localStorage.removeItem('todo_theme');
      localStorage.removeItem('todo_due_enabled');
      loadConfig();
      render();
      showToast('设置偏好已恢复默认');
    }
  });

  openGithubBtn.addEventListener('click', async () => {
    try {
      openGithubBtn.disabled = true;
      showToast('正在打开 GitHub...');
      await window.electronAPI.openUrl('https://github.com/junloye/Todo-List');
    } catch (error) {
      console.error('打开 GitHub 失败:', error);
      showToast('无法打开 GitHub，请检查网络连接', 'error');
    } finally {
      openGithubBtn.disabled = false;
    }
  });

  // 修复后的检查更新逻辑
  checkUpdateBtn.addEventListener('click', async () => {
    updateStatusText.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
      </svg>
      检查中...
    `;
    updateStatusText.style.color = 'var(--text-secondary)';

    styleSpin(); // 确保动画样式存在

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
      } else {
        updateStatusText.innerHTML = '当前已是最新版本';
        updateStatusText.style.color = '#81c784';
        showToast('暂无更新');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      let errorMsg = '网络请求失败';
      
      if (error.message) {
        if (error.message.includes('请求限制')) {
          errorMsg = error.message;
        } else if (error.message.includes('速率限制')) {
          errorMsg = 'GitHub API 请求过于频繁，请稍后重试';
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
    }
  });
});