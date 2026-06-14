// DOM 元素
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
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const dueDateEnableToggle = document.getElementById('dueDateEnableToggle');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const currentVersionSpan = document.getElementById('currentVersion');

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

let dialogResolver = null;
let tasks = [];
let currentFilter = 'all';
let editingId = null;
let dueDateEnabled = true;
let currentTheme = 'light';

// GitHub 配置
const GITHUB_REPO_OWNER = 'junloye';
const GITHUB_REPO_NAME = 'todolist';
const APP_VERSION = '1.1.0';

// --- 设置加载与保存 ---
function loadSettings() {
  const savedTheme = localStorage.getItem('theme');
  const savedDueDateEnabled = localStorage.getItem('dueDateEnabled');
  if (savedTheme === 'dark') {
    currentTheme = 'dark';
    document.documentElement.classList.add('dark-mode');
    if (darkModeToggle) darkModeToggle.checked = true;
  } else {
    currentTheme = 'light';
    document.documentElement.classList.remove('dark-mode');
    if (darkModeToggle) darkModeToggle.checked = false;
  }
  dueDateEnabled = savedDueDateEnabled !== null ? savedDueDateEnabled === 'true' : true;
  if (dueDateEnableToggle) dueDateEnableToggle.checked = dueDateEnabled;
  applyDueDateUI();
  adjustSortOptions();
}

function applyDueDateUI() {
  if (dueDateInput) dueDateInput.style.display = dueDateEnabled ? 'block' : 'none';
  if (editDueDate) editDueDate.style.display = dueDateEnabled ? 'block' : 'none';
  render();
}

function adjustSortOptions() {
  const options = sortSelect.querySelectorAll('option');
  options.forEach(opt => {
    const val = opt.value;
    if (val === 'dueDateAsc' || val === 'dueDateDesc') {
      opt.disabled = !dueDateEnabled;
      if (!dueDateEnabled && (sortSelect.value === val)) sortSelect.value = 'dateDesc';
    }
  });
}

function applyTheme() {
  if (currentTheme === 'dark') document.documentElement.classList.add('dark-mode');
  else document.documentElement.classList.remove('dark-mode');
  localStorage.setItem('theme', currentTheme);
}

function saveDueDateSetting() {
  localStorage.setItem('dueDateEnabled', dueDateEnabled);
  applyDueDateUI();
  adjustSortOptions();
  render();
}

// --- 弹窗（支持 error / success 样式）---
function showDialog(message, type = 'info') {
  return new Promise((resolve) => {
    dialogMessage.innerText = message;
    customDialog.classList.remove('dialog-error', 'dialog-success');
    if (type === 'error') customDialog.classList.add('dialog-error');
    if (type === 'success') customDialog.classList.add('dialog-success');
    
    if (type === 'confirm') {
      dialogCancelBtn.style.display = 'inline-flex';
      dialogConfirmBtn.innerText = '确定';
      dialogIconPath.setAttribute('d', 'M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z');
    } else {
      dialogCancelBtn.style.display = 'none';
      dialogConfirmBtn.innerText = '确定';
      if (type === 'error') {
        dialogIconPath.setAttribute('d', 'M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z');
      } else if (type === 'success') {
        dialogIconPath.setAttribute('d', 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
      } else {
        dialogIconPath.setAttribute('d', 'M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z');
      }
    }
    customDialog.showModal();
    dialogResolver = resolve;
  });
}

function showConfirm(message) {
  return showDialog(message, 'confirm').then(result => result === true);
}
function showAlert(message, type = 'info') {
  return showDialog(message, type);
}

dialogConfirmBtn.onclick = () => {
  customDialog.close();
  if (dialogResolver) dialogResolver(true);
  dialogResolver = null;
};
dialogCancelBtn.onclick = () => {
  customDialog.close();
  if (dialogResolver) dialogResolver(false);
  dialogResolver = null;
};

// --- 核心功能 ---
function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random();
}

async function saveTasks() {
  await window.electronAPI.saveTodos(tasks);
}

async function loadTasks() {
  const loaded = await window.electronAPI.loadTodos();
  tasks = Array.isArray(loaded) ? loaded : [];
  render();
}

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
}

function isOverdue(dueDate, completed) {
  if (completed || !dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function formatCreatedAt(timestamp) {
  const date = new Date(timestamp);
  return `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
}

function sortTasks(taskList) {
  const sortBy = sortSelect.value;
  const sorted = [...taskList];
  switch(sortBy) {
    case 'dateDesc': sorted.sort((a,b) => b.createdAt - a.createdAt); break;
    case 'dateAsc': sorted.sort((a,b) => a.createdAt - b.createdAt); break;
    case 'dueDateAsc':
      if (!dueDateEnabled) break;
      sorted.sort((a,b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      break;
    case 'dueDateDesc':
      if (!dueDateEnabled) break;
      sorted.sort((a,b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate) - new Date(a.dueDate);
      });
      break;
    default: break;
  }
  return sorted;
}

function getFilteredTasks() {
  let filtered = tasks;
  if (currentFilter === 'active') filtered = tasks.filter(t => !t.completed);
  else if (currentFilter === 'completed') filtered = tasks.filter(t => t.completed);
  return sortTasks(filtered);
}

function updateStats() {
  totalSpan.innerText = tasks.length;
  activeSpan.innerText = tasks.filter(t => !t.completed).length;
  completedSpan.innerText = tasks.filter(t => t.completed).length;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function render() {
  const filtered = getFilteredTasks();
  if (filtered.length === 0) {
    todoListEl.innerHTML = `<li class="empty-placeholder">暂无任务，输入第一条任务开始</li>`;
    updateStats();
    return;
  }
  const itemsHtml = filtered.map(task => {
    const dueDateStr = task.dueDate ? formatDate(task.dueDate) : null;
    const overdue = isOverdue(task.dueDate, task.completed);
    const showDueDate = dueDateEnabled && dueDateStr;
    return `
      <li class="todo-item" data-id="${task.id}">
        <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-content">
          <div class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</div>
          <div class="task-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              ${formatCreatedAt(task.createdAt)}
            </span>
            ${showDueDate ? `
              <span class="meta-item ${overdue ? 'overdue' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                截止: ${dueDateStr} ${overdue ? '(已过期)' : ''}
              </span>
            ` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn edit-btn" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3l4 4-7 7H10v-4l7-7z" />
              <path d="M4 20h16" />
            </svg>
          </button>
          <button class="icon-btn delete-btn" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7h16" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13" />
              <path d="M9 4h6v2H9z" />
            </svg>
          </button>
        </div>
      </li>
    `;
  }).join('');
  todoListEl.innerHTML = itemsHtml;
  updateStats();
}

async function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    await showAlert('请输入任务内容', 'error');
    return;
  }
  let dueDate = null;
  if (dueDateEnabled && dueDateInput.value) dueDate = dueDateInput.value;
  const newTask = {
    id: generateId(),
    text: text,
    completed: false,
    createdAt: Date.now(),
    dueDate: dueDate
  };
  tasks.push(newTask);
  taskInput.value = '';
  if (dueDateInput) dueDateInput.value = '';
  await saveTasks();
  render();
}

async function deleteTask(id) {
  const confirmed = await showConfirm('确定删除此任务吗？');
  if (confirmed) {
    tasks = tasks.filter(t => t.id !== id);
    await saveTasks();
    render();
  }
}

async function toggleComplete(id, completed) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = completed;
    await saveTasks();
    render();
    if (completed) triggerConfetti();
  }
}

function openEditModal(task) {
  editingId = task.id;
  editTitle.value = task.text;
  editDueDate.value = task.dueDate || '';
  if (editDueDate) editDueDate.style.display = dueDateEnabled ? 'block' : 'none';
  editModal.showModal();
}

async function saveEdit() {
  const newText = editTitle.value.trim();
  if (!newText) {
    await showAlert('任务内容不能为空', 'error');
    return;
  }
  const task = tasks.find(t => t.id === editingId);
  if (task) {
    task.text = newText;
    if (dueDateEnabled) task.dueDate = editDueDate.value || null;
    else task.dueDate = null;
    await saveTasks();
    render();
    await showAlert('修改已保存', 'success');
  }
  editModal.close();
  editingId = null;
}

async function clearCompleted() {
  const hasCompleted = tasks.some(t => t.completed);
  if (!hasCompleted) {
    await showAlert('没有已完成的任务', 'error');
    return;
  }
  const confirmed = await showConfirm('永久删除所有已完成的任务？');
  if (confirmed) {
    tasks = tasks.filter(t => !t.completed);
    await saveTasks();
    render();
    await showAlert('已清除所有已完成任务', 'success');
  }
}

async function exportData() {
  const result = await window.electronAPI.exportTodos(tasks);
  if (result && result.success) {
    await showAlert(`导出成功！\n保存位置：${result.path}`, 'success');
  } else {
    await showAlert('导出已取消或失败', 'error');
  }
}

function triggerConfetti() {
  canvasConfetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    startVelocity: 15,
    colors: ['#2e7d32', '#1b5e20', '#4caf50', '#ffeb3b', '#ff9800']
  });
}

// --- 设置事件 ---
settingsBtn.addEventListener('click', () => settingsModal.showModal());
closeSettingsBtn.addEventListener('click', () => settingsModal.close());
darkModeToggle.addEventListener('change', (e) => {
  currentTheme = e.target.checked ? 'dark' : 'light';
  applyTheme();
});
dueDateEnableToggle.addEventListener('change', (e) => {
  dueDateEnabled = e.target.checked;
  saveDueDateSetting();
});
checkUpdateBtn.addEventListener('click', async () => {
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('网络错误');
    const data = await response.json();
    const latestVersion = data.tag_name.replace(/^v/, '');
    if (latestVersion !== APP_VERSION) {
      const go = await showConfirm(`发现新版本 ${latestVersion}\n当前版本 ${APP_VERSION}\n是否前往下载页面？`);
      if (go && data.html_url) window.open(data.html_url, '_blank');
    } else {
      await showAlert('当前已经是最新版本', 'success');
    }
  } catch (err) {
    await showAlert('检查更新失败，请检查网络或仓库配置', 'error');
  }
});

function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  render();
}
function onSortChange() { render(); }

function bindEvents() {
  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
  if (dueDateInput) dueDateInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
  clearCompletedBtn.addEventListener('click', clearCompleted);
  sortSelect.addEventListener('change', onSortChange);
  exportBtn.addEventListener('click', exportData);
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
  editTitle.addEventListener('keypress', e => { if (e.key === 'Enter') saveEdit(); });
}

async function init() {
  loadSettings();
  await loadTasks();
  bindEvents();
  currentVersionSpan.innerText = APP_VERSION;
}
init();