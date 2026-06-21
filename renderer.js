const todoListEl = document.getElementById('todoList');
const taskInput = document.getElementById('taskInput');
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

const dueThresholdInput = document.getElementById('dueThresholdInput');
const includeTodayToggle = document.getElementById('includeTodayToggle');

const themeBtns = document.querySelectorAll('.theme-btn');
const dueDateEnableToggle = document.getElementById('dueDateEnableToggle');
const compactModeToggle = document.getElementById('compactModeToggle');
const debugModeToggle = document.getElementById('debugModeToggle');
const importDataBtn = document.getElementById('importDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const openGithubBtn = document.getElementById('openGithubBtn');
const settingsVersionSpan = document.getElementById('settingsVersionSpan');
const updateStatusText = document.getElementById('updateStatusText');
const dueDateContainer = document.getElementById('dueDatePicker');
const copyInfoBtn = document.getElementById('copyInfoBtn');
const feedbackBtn = document.getElementById('feedbackBtn');

const taskTagsInput = document.getElementById('taskTagsInput');
const taskSubtasksInput = document.getElementById('taskSubtasksInput');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const tagFilterList = document.getElementById('tagFilterList');

const sortTrigger = document.getElementById('sortTrigger');
const sortOptions = document.getElementById('sortOptions');
const sortSelectedText = document.getElementById('sortSelectedText');
const customSelect = document.getElementById('customSortSelect');
const sortDueOpt = document.getElementById('sortDueOpt');

const editModal = document.getElementById('editModal');
const editTitle = document.getElementById('editTitle');
const editTags = document.getElementById('editTags');
const saveEditBtn = document.getElementById('saveEditBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const customDialog = document.getElementById('customDialog');
const dialogMessage = document.getElementById('dialogMessage');
const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
const dialogCancelBtn = document.getElementById('dialogCancelBtn');
const dialogIconPath = document.getElementById('dialogIconPath');
const toastContainer = document.getElementById('toastContainer');

// 全局弹窗状态管理，防止事件监听器泄漏
let _activeDialogCleanup = null;
let _activeDialogResolve = null;

const VERSION = '2.0.0';

function compareVersions(a, b) {
  const norm = (v) => String(v).trim().replace(/^v/, '').split('-')[0];
  const pa = norm(a).split('.').map(x => parseInt(x, 10) || 0);
  const pb = norm(b).split('.').map(x => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
let tasks = [];
let currentFilter = 'all';
let currentSort = 'create-desc';
let currentSearch = '';
let activeTagFilter = '';
let editingTaskId = null;
let expandedTaskIds = new Set();
let _initialRenderDone = false;
let _goalsInitialRender = false;

const APP_CONFIG = {
  theme: 'light',
  dueDateEnabled: true,
  debugMode: false,
  compactMode: false,
  dueThreshold: 3,
  dueCountToday: true
};

function getLocalIP() {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => resolve(null));

    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        pc.close();
        resolve(null);
        return;
      }
      const candidate = e.candidate.candidate;
      const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) {
        const ip = ipMatch[1];
        if (!ip.startsWith('127.') && !ip.startsWith('0.')) {
          pc.close();
          resolve(ip);
          return;
        }
      }
    };
    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 3000);
  });
}

function maskIP(ip) {
  if (!ip) return '未获取到IP';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  const segments = ip.split(':');
  if (segments.length > 2) {
    return segments.slice(0, 2).join(':') + ':***:***:***:***:***';
  }
  return ip;
}

function createDatePicker({
  displayInput,
  toggleBtn,
  popup,
  hiddenInput,
  onSelect
}) {
  let selectedDate = null;
  let viewDate = new Date();
  viewDate.setHours(0, 0, 0, 0);

  function formatDate(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateInput(value) {
    if (!value) return null;
    const normalized = value.trim().replace(/\//g, '-');
    let parts;
    if (/^\d{8}$/.test(normalized)) {
      parts = [normalized.slice(0, 4), normalized.slice(4, 6), normalized.slice(6, 8)];
    } else {
      parts = normalized.split('-');
    }
    if (parts.length !== 3) return null;
    const [yearStr, monthStr, dayStr] = parts;
    if (!/^\d{4}$/.test(yearStr) || !/^\d{1,2}$/.test(monthStr) || !/^\d{1,2}$/.test(dayStr)) {
      return null;
    }
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return d;
  }

  function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const titleEl = popup.querySelector('.calendar-title');
    titleEl.textContent = `${year}年${month+1}月`;

    const daysContainer = popup.querySelector('.calendar-days');
    daysContainer.innerHTML = '';

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const cell = document.createElement('div');
      cell.className = 'calendar-day other-month';
      cell.textContent = day;
      daysContainer.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      cell.textContent = d;
      const dateObj = new Date(year, month, d);
      if (selectedDate && dateObj.getTime() === selectedDate.getTime()) {
        cell.classList.add('selected');
      }
      if (dateObj.getTime() === today.getTime()) {
        cell.classList.add('today');
      }
      cell.dataset.date = formatDate(dateObj);
      cell.addEventListener('click', () => {
        selectedDate = new Date(year, month, d);
        const dateStr = formatDate(selectedDate);
        displayInput.value = dateStr;
        if (hiddenInput) hiddenInput.value = dateStr;
        if (onSelect) onSelect(dateStr);
        closePopup();
        renderCalendar();
      });
      daysContainer.appendChild(cell);
    }

    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day other-month';
      cell.textContent = d;
      daysContainer.appendChild(cell);
    }
  }

  function openPopup() {
    if (selectedDate) {
      viewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    } else {
      viewDate = new Date();
      viewDate.setDate(1);
    }
    renderCalendar();
    popup.style.display = 'block';
  }

  displayInput.addEventListener('blur', () => {
    const value = displayInput.value.trim();
    if (!value) {
      selectedDate = null;
      if (hiddenInput) hiddenInput.value = '';
      if (onSelect) onSelect('');
      renderCalendar();
      return;
    }

    const parsed = parseDateInput(value);
    if (parsed) {
      selectedDate = parsed;
      const dateStr = formatDate(parsed);
      displayInput.value = dateStr;
      if (hiddenInput) hiddenInput.value = dateStr;
      if (onSelect) onSelect(dateStr);
      viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      renderCalendar();
      return;
    }

    if (typeof showToast === 'function') {
      showToast('请输入合法日期，格式为 YYYY-MM-DD', 'error');
    }
    selectedDate = null;
    if (hiddenInput) hiddenInput.value = '';
    renderCalendar();
  });

  function closePopup() {
    popup.style.display = 'none';
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.style.display === 'block') {
      closePopup();
    } else {
      openPopup();
    }
  });

  popup.querySelectorAll('.calendar-nav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = parseInt(btn.dataset.dir);
      viewDate.setMonth(viewDate.getMonth() + dir);
      renderCalendar();
    });
  });

  const clearBtn = popup.querySelector('.calendar-footer .secondary-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedDate = null;
      displayInput.value = '';
      if (hiddenInput) hiddenInput.value = '';
      if (onSelect) onSelect('');
      closePopup();
      renderCalendar();
    });
  }

  const todayBtn = popup.querySelector('.calendar-footer .primary-btn');
  if (todayBtn) {
    todayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      selectedDate = now;
      const dateStr = formatDate(now);
      displayInput.value = dateStr;
      if (hiddenInput) hiddenInput.value = dateStr;
      if (onSelect) onSelect(dateStr);
      closePopup();
      renderCalendar();
    });
  }

  document.addEventListener('click', (e) => {
    const wrapper = displayInput.closest('.date-picker-wrapper');
    if (!wrapper.contains(e.target)) {
      closePopup();
    }
  });

  function setDate(dateStr) {
    if (dateStr) {
      const parsed = parseDateInput(dateStr);
      if (parsed) {
        selectedDate = parsed;
        const normalized = formatDate(parsed);
        displayInput.value = normalized;
        if (hiddenInput) hiddenInput.value = normalized;
        viewDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        return;
      }
    }
    selectedDate = null;
    displayInput.value = '';
    if (hiddenInput) hiddenInput.value = '';
  }

  renderCalendar();
  return { setDate, getDate: () => selectedDate, closePopup };
}

function log(message, level = 'info') {
  if (window.electronAPI && window.electronAPI.log) {
    window.electronAPI.log(message, level);
  } else {
    console.log(`[${level}]`, message);
  }
}

function initCustomSelect({
  containerId,
  selectedTextId,
  optionsSelector,
  getDefaultValue,
  onChange
}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const trigger = container.querySelector('.select-trigger');
  const optionsList = container.querySelector(optionsSelector || '.select-options');
  const selectedText = document.getElementById(selectedTextId);
  if (!trigger || !optionsList || !selectedText) return null;

  let currentValue = null;
  let currentLabel = '';

  function findOption(value) {
    const items = optionsList.querySelectorAll('.option-item');
    for (const item of items) {
      if (item.dataset.value === value) return item;
    }
    return null;
  }

  function setValue(value, invokeOnChange = true) {
    const items = optionsList.querySelectorAll('.option-item');
    let found = false;
    items.forEach(item => {
      if (item.dataset.value === value) {
        item.classList.add('active');
        currentValue = value;
        currentLabel = item.textContent.trim();
        selectedText.textContent = currentLabel;
        found = true;
      } else {
        item.classList.remove('active');
      }
    });
    if (!found && items.length > 0) {
      const first = items[0];
      first.classList.add('active');
      currentValue = first.dataset.value;
      currentLabel = first.textContent.trim();
      selectedText.textContent = currentLabel;
    }
    if (invokeOnChange && onChange) onChange(currentValue, currentLabel);
  }

  function getValue() {
    return currentValue;
  }

  function getLabel() {
    return currentLabel;
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.toggle('open');
  });

  optionsList.addEventListener('click', (e) => {
    const item = e.target.closest('.option-item');
    if (!item) return;
    const value = item.dataset.value;
    setValue(value, true);
    container.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
    }
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      container.classList.toggle('open');
    }
    if (e.key === 'Escape') {
      container.classList.remove('open');
    }
  });

  const defaultValue = getDefaultValue ? getDefaultValue() : null;
  if (defaultValue !== null && defaultValue !== undefined) {
    setValue(defaultValue, false);
  } else {
    const activeItem = optionsList.querySelector('.option-item.active');
    if (activeItem) {
      setValue(activeItem.dataset.value, false);
    } else {
      const firstItem = optionsList.querySelector('.option-item');
      if (firstItem) {
        setValue(firstItem.dataset.value, false);
      }
    }
  }

  return { setValue, getValue, getLabel, container };
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  if (type === 'error') {
    icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  }

  toast.insertAdjacentHTML('beforeend', icon);
  const messageEl = document.createElement('span');
  messageEl.textContent = String(message);
  toast.appendChild(messageEl);

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'opacity 0.15s, transform 0.15s';
    setTimeout(() => toast.remove(), 150);
  }, 2500);
}

function showConfirmDialog(message, type = 'warning') {
  // 清理之前残留的弹窗状态
  if (_activeDialogCleanup) _activeDialogCleanup();

  return new Promise((resolve) => {
    _activeDialogResolve = resolve;
    dialogMessage.textContent = message;
    dialogMessage.style.display = '';
    dialogIconPath.parentElement.style.display = '';
    // 移除可能残留的自定义 body
    const oldBody = customDialog.querySelector('.dialog-body-custom');
    if (oldBody) oldBody.remove();

    if (type === 'danger') {
      dialogIconPath.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z');
      dialogConfirmBtn.className = 'primary-btn';
      dialogConfirmBtn.style.background = '#d32f2f';
    } else {
      dialogIconPath.setAttribute('d', 'M12 8v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z');
      dialogConfirmBtn.className = 'primary-btn';
      dialogConfirmBtn.style.background = 'var(--btn-primary-bg)';
    }

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const cleanup = () => {
      _activeDialogCleanup = null;
      _activeDialogResolve = null;
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      customDialog.close();
    };
    _activeDialogCleanup = cleanup;

    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    customDialog.showModal();
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function render() {
  todoListEl.innerHTML = '';
  // 首次渲染时播放入场动画
  if (!_initialRenderDone) {
    todoListEl.classList.add('initial-render');
  }
  let filtered = [...tasks];

  if (currentFilter === 'active') {
    filtered = filtered.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  }

  if (currentSearch) {
    const query = currentSearch.trim().toLowerCase();
    filtered = filtered.filter(t => {
      const titleMatch = t.title.toLowerCase().includes(query);
      const tagsMatch = (t.tags || []).some(tag => tag.toLowerCase().includes(query));
      return titleMatch || tagsMatch;
    });
  }

  if (activeTagFilter) {
    filtered = filtered.filter(t => (t.tags || []).some(tag => tag.toLowerCase() === activeTagFilter.toLowerCase()));
  }

  filtered.sort((a, b) => {
    const [field, dir] = currentSort.split('-');
    const mul = dir === 'desc' ? -1 : 1;
    if (field === 'create') return (a.createdAt - b.createdAt) * mul;
    if (field === 'due') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return (new Date(a.dueDate) - new Date(b.dueDate)) * mul;
    }
    if (field === 'priority') {
      const order = { p0: 0, p1: 1, p2: 2, p3: 3 };
      const va = order[a.priority] ?? 99;
      const vb = order[b.priority] ?? 99;
      return (va - vb) * mul;
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

    let priorityHtml = '';
    if (task.priority) {
      const label = task.priority.toUpperCase();
      priorityHtml = `<span class="priority-label priority-${task.priority}">${escapeHtml(label)}</span>`;
    }

    let tagsHtml = '';
    if (task.tags && task.tags.length) {
      tagsHtml = `<div class="todo-tags">${task.tags.map(tag =>
        `<span class="tag">${escapeHtml(tag)}</span>`
      ).join('')}</div>`;
    }

    let metaHtml = '';
    if (APP_CONFIG.dueDateEnabled && task.dueDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(task.dueDate);
      due.setHours(0,0,0,0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 3600 * 1000));
      const remaining = APP_CONFIG.dueCountToday ? diffDays + 1 : diffDays;
      const todayStr = new Date().toISOString().split('T')[0];
      const isOverdue = !task.completed && task.dueDate < todayStr;
      const dueDateEscaped = escapeHtml(task.dueDate);

      let remainingLabel = '';
      if (!isOverdue && !task.completed && remaining >= 0 && remaining <= (APP_CONFIG.dueThreshold ?? 3)) {
        if (remaining === 0) {
          remainingLabel = '（今天）';
        } else {
          remainingLabel = `（剩余${remaining}天）`;
        }
      }

      metaHtml = `
        <div class="todo-meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span class="${isOverdue ? 'overdue' : ''}">${dueDateEscaped}${isOverdue ? ' (已过期)' : ''}${remainingLabel}</span>
        </div>
      `;
    }

    let subtaskHtml = '';
    if (task.subtasks && task.subtasks.length) {
      subtaskHtml = `<ul class="subtask-list">${task.subtasks.map(st =>
        `<li class="subtask-item" data-subtask-id="${escapeHtml(st.id)}">
          <input type="checkbox" class="subtask-checkbox" ${st.completed ? 'checked' : ''}>
          <span class="subtask-title">${escapeHtml(st.title)}</span>
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

    const titleEscaped = escapeHtml(task.title);

    item.innerHTML = `
      <div class="todo-main">
        <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="todo-content">
          <span class="todo-title">${priorityHtml}${titleEscaped}</span>
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
  const active = total - completed;

  // 首次渲染后移除入场动画类，防止展开/折叠等操作重复播放
  if (!_initialRenderDone) {
    _initialRenderDone = true;
    // 通过 setTimeout 在下一次微任务后移除，确保动画已触发
    setTimeout(() => {
      todoListEl.classList.remove('initial-render');
    }, 350);
  }

  // 计数变化时弹出动画（仅值变化时触发，不移除类防闪烁）
  const updateCount = (el, val) => {
    if (parseInt(el.textContent, 10) !== val) {
      el.textContent = val;
      el.classList.remove('update');
      void el.offsetWidth;
      el.classList.add('update');
    }
  };
  updateCount(totalSpan, total);
  updateCount(activeSpan, active);
  updateCount(completedSpan, completed);

  renderTagFilterList();
}

function getAllTags() {
  const tagSet = new Set();
  tasks.forEach(task => {
    (task.tags || []).forEach(tag => {
      const normalized = tag.trim();
      if (normalized) tagSet.add(normalized);
    });
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { sensitivity: 'base' }));
}

function renderTagFilterList() {
  if (!tagFilterList) return;
  const tags = getAllTags();
  tagFilterList.innerHTML = '';

  if (tags.length === 0) {
    tagFilterList.innerHTML = '<span class="tag-filter-empty">暂无标签</span>';
    return;
  }

  tags.forEach(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tag-filter-chip${activeTagFilter.toLowerCase() === tag.toLowerCase() ? ' active' : ''}`;
    button.textContent = tag;
    button.addEventListener('click', () => {
      if (activeTagFilter.toLowerCase() === tag.toLowerCase()) {
        activeTagFilter = '';
      } else {
        activeTagFilter = tag;
      }
      render();
    });
    tagFilterList.appendChild(button);
  });
}

function updateSortDisplay(value) {
  const [field, dir] = value.split('-');
  const option = sortOptions.querySelector(`.option-item[data-value="${field}"]`);
  if (!option) return;
  const label = option.querySelector('span').textContent;
  const isAsc = dir === 'asc';
  const fieldSvgHtml = option.querySelector('.option-icon').outerHTML;
  const dirSvg =
    `<svg class="selected-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"` +
    ` stroke-linecap="round" stroke-linejoin="round">` +
    `<polyline points="6 9 12 3 18 9"${isAsc ? '' : ' stroke-opacity="0.3"'}/>` +
    `<polyline points="6 15 12 21 18 15"${isAsc ? ' stroke-opacity="0.3"' : ''}/>` +
    `</svg>`;
  // 触发器: [字段图标] 文本 [方向箭头]
  sortSelectedText.innerHTML = `${fieldSvgHtml}${label}${dirSvg}`;
  // 更新选项: 移除所有选项的右侧方向图标，给活动选项添加
  sortOptions.querySelectorAll('.option-item').forEach(item => {
    item.classList.remove('active');
    const existingDir = item.querySelector('.option-dir');
    if (existingDir) existingDir.remove();
  });
  option.classList.add('active');
  const optionDirHtml = dirSvg.replace('selected-icon', 'option-dir');
  option.insertAdjacentHTML('beforeend', optionDirHtml);
  currentSort = value;
}

function handleSortChange(value) {
  updateSortDisplay(value);
  render();
  log(`排序方式切换为: ${value}`);
}

function initCustomSortSelect() {
  sortTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
  });

  sortOptions.addEventListener('click', (e) => {
    const option = e.target.closest('.option-item');
    if (!option) return;
    const field = option.dataset.value;
    if (!APP_CONFIG.dueDateEnabled && field === 'due') {
      showToast('截止日期功能已禁用', 'error');
      customSelect.classList.remove('open');
      return;
    }
    const currentField = currentSort.split('-')[0];
    const currentDir = currentSort.split('-')[1];
    // 点击同一字段切换正反序，否则使用默认方向
    let dir;
    if (field === currentField) {
      dir = currentDir === 'desc' ? 'asc' : 'desc';
    } else {
      dir = field === 'due' ? 'asc' : 'desc';
    }
    handleSortChange(`${field}-${dir}`);
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
  const dueDate = APP_CONFIG.dueDateEnabled ? document.getElementById('dueDateInput').value : '';

  const priority = window.taskPrioritySelect ? window.taskPrioritySelect.getValue() || null : null;

  const tagsRaw = taskTagsInput.value.trim();
  let tags = tagsRaw ? tagsRaw.split(/[，,]\s*/).filter(s => s !== '') : [];

  let truncated = false;
  tags = tags.map(tag => {
    if (tag.length > 8) {
      truncated = true;
      return tag.slice(0, 6);
    }
    return tag;
  });
  if (truncated) {
    showToast('部分标签已自动截断至 8 个字符', 'error');
  }

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
    subtasks,
    priority
  };

  tasks.push(newTask);
  taskInput.value = '';
  mainDatePicker.setDate('');
  taskTagsInput.value = '';
  taskSubtasksInput.value = '';
  if (window.taskPrioritySelect) window.taskPrioritySelect.setValue('');

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
  editDatePicker.setDate(task.dueDate || '');
  editTags.value = (task.tags || []).join(', ');
  if (window.editPrioritySelect) {
    window.editPrioritySelect.setValue(task.priority || '');
  }
  editModal.showModal();
}

async function saveEdit() {
  const title = editTitle.value.trim();
  if (!title) return;
  const tags = editTags.value.split(/[，,]\s*/).filter(s => s !== '');
  const dueDate = document.getElementById('editDueDate').value;

  const priority = window.editPrioritySelect ? window.editPrioritySelect.getValue() || null : null;

  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.title = title;
    task.tags = tags;
    if (APP_CONFIG.dueDateEnabled) {
      task.dueDate = dueDate;
    }
    task.priority = priority;
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
      subtasks: t.subtasks || [],
      priority: t.priority || null,
      reminder: t.reminder || null,
      reminderNotified: t.reminderNotified || false
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

function loadConfig() {
  let theme = localStorage.getItem('todo_theme') || 'light';
  const validThemes = ['light', 'dark', 'blue', 'green', 'purple', 'orange', 'pink', 'christmas'];
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

  const savedThreshold = parseInt(localStorage.getItem('todo_due_threshold'), 10);
  APP_CONFIG.dueThreshold = !isNaN(savedThreshold) ? savedThreshold : APP_CONFIG.dueThreshold;
  if (dueThresholdInput) dueThresholdInput.value = APP_CONFIG.dueThreshold;

  const savedCountToday = localStorage.getItem('todo_due_count_today');
  APP_CONFIG.dueCountToday = savedCountToday !== null ? savedCountToday === 'true' : APP_CONFIG.dueCountToday;
  if (includeTodayToggle) includeTodayToggle.checked = APP_CONFIG.dueCountToday;

  const savedCompact = localStorage.getItem('todo_compact_mode');
  APP_CONFIG.compactMode = savedCompact !== null ? savedCompact === 'true' : false;
  compactModeToggle.checked = APP_CONFIG.compactMode;
  document.body.setAttribute('data-compact', APP_CONFIG.compactMode ? 'true' : 'false');

  const savedLevel = localStorage.getItem('todo_log_level') || 'info';
  if (window.logLevelSelect) {
    window.logLevelSelect.setValue(savedLevel, false);
  }
}

function saveConfig() {
  localStorage.setItem('todo_theme', APP_CONFIG.theme);
  localStorage.setItem('todo_due_enabled', APP_CONFIG.dueDateEnabled);
  localStorage.setItem('todo_debug_mode', APP_CONFIG.debugMode);
  localStorage.setItem('todo_compact_mode', String(APP_CONFIG.compactMode));
  localStorage.setItem('todo_due_threshold', String(APP_CONFIG.dueThreshold));
  localStorage.setItem('todo_due_count_today', String(APP_CONFIG.dueCountToday));
}

function applyDueDateFeatureState() {
  const isEnabled = APP_CONFIG.dueDateEnabled;
  dueDateContainer.style.display = isEnabled ? 'inline-block' : 'none';
  if (sortDueOpt) sortDueOpt.style.display = isEnabled ? 'block' : 'none';
  const editPickerWrapper = document.getElementById('editDueDatePicker');
  if (editPickerWrapper) {
    editPickerWrapper.style.display = isEnabled ? 'flex' : 'none';
  }

  if (!isEnabled && currentSort.startsWith('due-')) {
    handleSortChange('create-desc');
  }
}

// ============================================================
// 习惯追踪
// ============================================================
let habits = [];
let currentHabitFilter = 'all';

function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateRange(frequency) {
  const today = new Date();
  const dates = [];
  if (frequency === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(formatDateStr(d));
    }
  } else if (frequency === 'weekly') {
    for (let i = 55; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(formatDateStr(d));
    }
  } else {
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(formatDateStr(d));
    }
  }
  return dates;
}

function getHabitStreak(habit) {
  const records = new Set(habit.records || []);
  const today = new Date();
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDateStr(d);
    if (records.has(key)) streak++;
    else break;
  }
  return streak;
}

function getHabitCompletionRate(habit) {
  const records = new Set(habit.records || []);
  const range = getDateRange(habit.frequency);
  const total = range.length;
  const checked = range.filter(d => records.has(d)).length;
  return total > 0 ? Math.round((checked / total) * 100) : 0;
}

function renderHabits() {
  const container = document.getElementById('habitsList');
  if (!container) return;
  if (!habits.length) {
    container.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      <p>还没有习惯，点击上方按钮新建一个吧</p>
    </div>`;
    return;
  }
  container.innerHTML = habits.map(habit => {
    const records = new Set(habit.records || []);
    const streak = getHabitStreak(habit);
    const rate = getHabitCompletionRate(habit);
    const todayStr = formatDateStr(new Date());
    const isCheckedToday = records.has(todayStr);
    const dateRange = getDateRange(habit.frequency);
    const freqLabel = { daily: '每天', weekly: '每周', monthly: '每月' }[habit.frequency] || habit.frequency;

    const daysHtml = dateRange.map(d => {
      const isToday = d === todayStr;
      const checked = records.has(d);
      let cls = 'habit-checkin-day';
      if (checked) cls += ' checked';
      if (isToday) cls += ' today';
      return `<div class="${cls}" data-habit-id="${habit.id}" data-date="${d}" title="${d}${checked ? ' ✓' : ''}">${new Date(d).getDate()}</div>`;
    }).join('');

    return `<div class="habit-card" data-habit-id="${habit.id}">
      <div class="habit-header">
        <span class="habit-title">${escapeHtml(habit.title)}</span>
        <span class="habit-badge">${freqLabel}</span>
        <div class="habit-actions">
          <button class="icon-btn checkin-habit-btn" title="${isCheckedToday ? '已打卡' : '打卡'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isCheckedToday ? '#4caf50' : 'none'}" stroke="${isCheckedToday ? '#4caf50' : 'currentColor'}" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="icon-btn edit-habit-btn" title="编辑">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn delete-habit-btn" title="删除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="habit-streak">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        连续 ${streak} 天 · 完成率 ${rate}%
      </div>
      <div class="habit-checkin-grid">${daysHtml}</div>
    </div>`;
  }).join('');
}

async function saveHabitsAndRender() {
  await window.electronAPI.saveHabits(habits);
  renderHabits();
}

function promptHabit(habitToEdit = null) {
  // 清理之前残留的弹窗状态
  if (_activeDialogCleanup) _activeDialogCleanup();

  const isEdit = !!habitToEdit;
  const title = isEdit ? '编辑习惯' : '新建习惯';
  const defaultFreq = isEdit ? habitToEdit.frequency : 'daily';
  const html = `
    <div class="dialog-body-custom-inner">
      <div class="input-wrapper">
        <input type="text" id="habitPromptTitle" class="dialog-input" placeholder="习惯名称，如：每天喝水" value="${isEdit ? escapeHtml(habitToEdit.title) : ''}">
      </div>
      <div class="dialog-row">
        <div class="dialog-field">
          <label class="dialog-field-label">频率</label>
          <div class="custom-select" id="habitFreqSelect">
            <button class="select-trigger" type="button">
              <span id="habitFreqSelectedText">${defaultFreq === 'daily' ? '每天' : defaultFreq === 'weekly' ? '每周' : '每月'}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="2 4 6 8 10 4"/>
              </svg>
            </button>
            <ul class="select-options" role="listbox">
              <li data-value="daily" class="option-item ${defaultFreq === 'daily' ? 'active' : ''}">每天</li>
              <li data-value="weekly" class="option-item ${defaultFreq === 'weekly' ? 'active' : ''}">每周</li>
              <li data-value="monthly" class="option-item ${defaultFreq === 'monthly' ? 'active' : ''}">每月</li>
            </ul>
          </div>
        </div>
        <div class="dialog-field">
          <label class="dialog-field-label">目标次数</label>
          <input type="number" id="habitPromptTarget" class="dialog-input" min="1" value="${isEdit ? habitToEdit.targetCount : 1}">
        </div>
      </div>
    </div>
  `;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const dialog = document.getElementById('customDialog');
  dialogMessage.textContent = title;
  dialogMessage.style.display = 'none';
  dialogIconPath.parentElement.style.display = 'none';
  dialogConfirmBtn.style.background = 'var(--btn-primary-bg)';
  dialogConfirmBtn.className = 'primary-btn';

  const existingBody = dialog.querySelector('.dialog-body-custom');
  if (existingBody) existingBody.remove();
  const body = document.createElement('div');
  body.className = 'dialog-body-custom';
  body.appendChild(tempDiv.firstElementChild);
  dialog.querySelector('.dialog-content').insertBefore(body, dialog.querySelector('.dialog-footer'));

  // 初始化自定义下拉菜单
  const freqSelect = initCustomSelect({
    containerId: 'habitFreqSelect',
    selectedTextId: 'habitFreqSelectedText',
    optionsSelector: '.select-options',
    getDefaultValue: () => defaultFreq,
    onChange: () => {}
  });

  return new Promise(resolve => {
    _activeDialogResolve = resolve;
    const onConfirm = () => {
      const t = document.getElementById('habitPromptTitle')?.value.trim();
      const f = freqSelect ? freqSelect.getValue() : 'daily';
      const tc = parseInt(document.getElementById('habitPromptTarget')?.value, 10) || 1;
      cleanup();
      resolve(t ? { title: t, frequency: f, targetCount: tc } : null);
    };
    const onCancel = () => { cleanup(); resolve(null); };
    const cleanup = () => {
      _activeDialogCleanup = null;
      _activeDialogResolve = null;
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      dialog.close();
      dialogMessage.style.display = '';
      dialogIconPath.parentElement.style.display = '';
      if (body) body.remove();
    };
    _activeDialogCleanup = cleanup;
    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    dialog.showModal();
  });
}

async function handleAddHabit() {
  const result = await promptHabit();
  if (!result) return;
  habits.push({
    id: Date.now().toString(),
    title: result.title,
    frequency: result.frequency,
    targetCount: result.targetCount,
    records: [],
    createdAt: Date.now()
  });
  await saveHabitsAndRender();
  showToast('习惯已创建');
}

async function handleEditHabit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  const result = await promptHabit(habit);
  if (!result) return;
  habit.title = result.title;
  habit.frequency = result.frequency;
  habit.targetCount = result.targetCount;
  await saveHabitsAndRender();
  showToast('习惯已更新');
}

async function handleDeleteHabit(id) {
  const confirm = await showConfirmDialog('确定删除这个习惯吗？打卡记录也将丢失。', 'danger');
  if (!confirm) return;
  habits = habits.filter(h => h.id !== id);
  await saveHabitsAndRender();
  showToast('习惯已删除');
}

async function handleCheckinHabit(id) {
  const habit = habits.find(h => h.id === id);
  if (!habit) return;
  const todayStr = formatDateStr(new Date());
  if (!habit.records) habit.records = [];
  const idx = habit.records.indexOf(todayStr);
  if (idx > -1) {
    habit.records.splice(idx, 1);
    showToast('取消打卡');
  } else {
    habit.records.push(todayStr);
    showToast('打卡成功！');
  }
  await saveHabitsAndRender();
}

function handleHabitDateClick(habitId, dateStr) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  if (!habit.records) habit.records = [];
  const idx = habit.records.indexOf(dateStr);
  if (idx > -1) {
    habit.records.splice(idx, 1);
  } else {
    habit.records.push(dateStr);
  }
  saveHabitsAndRender();
}

// ============================================================
// 目标与关键成果 (OKR)
// ============================================================
let goals = [];

function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!container) return;
  if (!goals.length) {
    container.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      <p>还没有目标，点击上方按钮新建一个吧</p>
    </div>`;
    return;
  }
  container.innerHTML = goals.map(goal => {
    // 首次渲染后标记，使进度条动画只播放一次
    _goalsInitialRender = true;
    const totalKr = goal.keyResults.length;
    const completedKr = goal.keyResults.filter(kr => kr.progress >= 100).length;
    const overallProgress = totalKr > 0 ? Math.round(goal.keyResults.reduce((s, kr) => s + kr.progress, 0) / totalKr) : 0;

    const krHtml = goal.keyResults.map(kr =>
      `<div class="kr-item" data-kr-id="${kr.id}">
        <span class="kr-title">${escapeHtml(kr.title)}</span>
        <div class="kr-slider-row">
          <input type="range" class="kr-progress-slider" min="0" max="100" step="5" value="${kr.progress}" data-goal-id="${goal.id}" data-kr-id="${kr.id}">
          <span class="kr-pct kr-progress-value" style="color:${kr.progress >= 100 ? 'var(--success-color, #2e7d32)' : 'var(--text-primary)'}">${kr.progress}%</span>
        </div>
      </div>`
    ).join('');

    return `<div class="goal-card" data-goal-id="${goal.id}">
      <div class="goal-header">
        <span class="goal-title">${escapeHtml(goal.title)}</span>
        <span class="goal-progress-text">${overallProgress}% · ${completedKr}/${totalKr} KR</span>
      </div>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill${!_goalsInitialRender ? ' animate' : ''}" style="width:${overallProgress}%"></div>
      </div>
      <div class="goal-kr-list">${krHtml}</div>
      <div class="goal-actions">
        <button class="secondary-btn add-kr-btn" data-goal-id="${goal.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          添加关键成果
        </button>
        <button class="icon-btn edit-goal-btn" title="编辑目标">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn delete-goal-btn" title="删除目标">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

async function saveGoalsAndRender() {
  await window.electronAPI.saveGoals(goals);
  renderGoals();
}

function promptGoal(goalToEdit = null) {
  // 清理之前残留的弹窗状态
  if (_activeDialogCleanup) _activeDialogCleanup();

  const isEdit = !!goalToEdit;
  const title = isEdit ? '编辑目标' : '新建目标';
  const html = `
    <div class="dialog-body-custom-inner">
      <div class="input-wrapper">
        <input type="text" id="goalPromptTitle" class="dialog-input" placeholder="目标名称，如：提升编程能力" value="${isEdit ? escapeHtml(goalToEdit.title) : ''}">
      </div>
      <div id="goalKrContainer">
        <p class="dialog-hint">关键成果（每行一个，格式：成果名称）</p>
        <textarea id="goalKrInput" class="dialog-input textarea" rows="3" placeholder="每天刷一道算法题&#10;完成一个开源项目&#10;阅读3本技术书籍">${isEdit ? goalToEdit.keyResults.map(kr => kr.title).join('\n') : ''}</textarea>
      </div>
    </div>
  `;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const dialog = document.getElementById('customDialog');
  dialogMessage.textContent = title;
  dialogMessage.style.display = 'none';
  dialogIconPath.parentElement.style.display = 'none';
  dialogConfirmBtn.style.background = 'var(--btn-primary-bg)';
  dialogConfirmBtn.className = 'primary-btn';

  const existingBody = dialog.querySelector('.dialog-body-custom');
  if (existingBody) existingBody.remove();
  const body = document.createElement('div');
  body.className = 'dialog-body-custom';
  body.appendChild(tempDiv.firstElementChild);
  dialog.querySelector('.dialog-content').insertBefore(body, dialog.querySelector('.dialog-footer'));

  return new Promise(resolve => {
    _activeDialogResolve = resolve;
    const onConfirm = () => {
      const t = document.getElementById('goalPromptTitle')?.value.trim();
      const krRaw = document.getElementById('goalKrInput')?.value.trim();
      const krList = krRaw ? krRaw.split('\n').map(s => s.trim()).filter(s => s) : [];
      cleanup();
      resolve(t ? { title: t, keyResults: krList } : null);
    };
    const onCancel = () => { cleanup(); resolve(null); };
    const cleanup = () => {
      _activeDialogCleanup = null;
      _activeDialogResolve = null;
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      dialog.close();
      dialogMessage.style.display = '';
      dialogIconPath.parentElement.style.display = '';
      if (body) body.remove();
    };
    _activeDialogCleanup = cleanup;
    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    dialog.showModal();
  });
}

async function handleAddGoal() {
  const result = await promptGoal();
  if (!result) return;
  goals.push({
    id: Date.now().toString(),
    title: result.title,
    keyResults: result.keyResults.map((krTitle, i) => ({
      id: `${Date.now()}-${i}`,
      title: krTitle,
      progress: 0
    })),
    createdAt: Date.now()
  });
  await saveGoalsAndRender();
  showToast('目标已创建');
}

async function handleEditGoal(id) {
  const goal = goals.find(g => g.id === id);
  if (!goal) return;
  const result = await promptGoal(goal);
  if (!result) return;
  goal.title = result.title;
  // 保留已有 KR，更新新增/删除
  const newTitles = result.keyResults;
  const existing = goal.keyResults;
  const updated = newTitles.map((t, i) => {
    if (i < existing.length) {
      existing[i].title = t;
      return existing[i];
    }
    return { id: `${Date.now()}-${i}`, title: t, progress: 0 };
  });
  goal.keyResults = updated;
  await saveGoalsAndRender();
  showToast('目标已更新');
}

async function handleDeleteGoal(id) {
  const confirm = await showConfirmDialog('确定删除这个目标及其所有关键成果吗？', 'danger');
  if (!confirm) return;
  goals = goals.filter(g => g.id !== id);
  await saveGoalsAndRender();
  showToast('目标已删除');
}

async function handleKrProgressChange(goalId, krId, value) {
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const kr = goal.keyResults.find(k => k.id === krId);
  if (!kr) return;
  kr.progress = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
  await saveGoalsAndRender();
}

async function handleAddKr(goalId) {
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  // 清理之前残留的弹窗状态
  if (_activeDialogCleanup) _activeDialogCleanup();

  const html = `
    <div class="dialog-body-custom-inner">
      <div class="input-wrapper">
        <input type="text" id="krPromptTitle" class="dialog-input" placeholder="关键成果名称">
      </div>
    </div>
  `;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const dialog = document.getElementById('customDialog');
  dialogMessage.textContent = '添加关键成果';
  dialogMessage.style.display = 'none';
  dialogIconPath.parentElement.style.display = 'none';
  dialogConfirmBtn.style.background = 'var(--btn-primary-bg)';
  dialogConfirmBtn.className = 'primary-btn';
  const existingBody = dialog.querySelector('.dialog-body-custom');
  if (existingBody) existingBody.remove();
  const body = document.createElement('div');
  body.className = 'dialog-body-custom';
  body.appendChild(tempDiv.firstElementChild);
  dialog.querySelector('.dialog-content').insertBefore(body, dialog.querySelector('.dialog-footer'));

  return new Promise(resolve => {
    _activeDialogResolve = resolve;
    const onConfirm = () => {
      const t = document.getElementById('krPromptTitle')?.value.trim();
      cleanup();
      resolve(t || null);
    };
    const onCancel = () => { cleanup(); resolve(null); };
    const cleanup = () => {
      _activeDialogCleanup = null;
      _activeDialogResolve = null;
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      dialog.close();
      dialogMessage.style.display = '';
      dialogIconPath.parentElement.style.display = '';
      if (body) body.remove();
    };
    _activeDialogCleanup = cleanup;
    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    dialog.showModal();
  }).then(async (title) => {
    if (!title) return;
    goal.keyResults.push({ id: Date.now().toString(), title, progress: 0 });
    await saveGoalsAndRender();
    showToast('关键成果已添加');
  });
}

// ============================================================
// 模板功能
// ============================================================
let templates = [];

function renderTemplates() {
  const container = document.getElementById('templatesList');
  if (!container) return;
  if (!templates.length) {
    container.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <p>还没有模板，先将任务列表保存为模板吧</p>
    </div>`;
    return;
  }
  container.innerHTML = templates.map(tpl =>
    `<div class="template-card" data-template-id="${tpl.id}">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <div class="template-info">
        <div class="template-name">${escapeHtml(tpl.name)}</div>
        <div class="template-meta">${tpl.taskCount} 个任务 · ${new Date(tpl.createdAt).toLocaleDateString('zh-CN')}</div>
      </div>
      <div class="template-actions">
        <button class="primary-btn apply-template-btn" data-template-id="${tpl.id}" style="padding:6px 14px;font-size:0.85rem;">应用</button>
        <button class="icon-btn delete-template-btn" data-template-id="${tpl.id}" title="删除模板">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>`
  ).join('');
}

async function saveTemplatesAndRender() {
  await window.electronAPI.saveTemplates(templates);
  renderTemplates();
}

async function handleSaveAsTemplate() {
  if (!tasks.length) {
    showToast('没有任务可以保存为模板', 'error');
    return;
  }
  // 清理之前残留的弹窗状态
  if (_activeDialogCleanup) _activeDialogCleanup();

  const html = `
    <div class="dialog-body-custom-inner">
      <div class="input-wrapper">
        <input type="text" id="templateNameInput" class="dialog-input" placeholder="模板名称，如：旅行打包清单">
      </div>
      <p class="dialog-hint">将保存当前全部 ${tasks.length} 个任务作为模板</p>
    </div>
  `;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const dialog = document.getElementById('customDialog');
  dialogMessage.textContent = '保存为模板';
  dialogMessage.style.display = 'none';
  dialogIconPath.parentElement.style.display = 'none';
  dialogConfirmBtn.style.background = 'var(--btn-primary-bg)';
  dialogConfirmBtn.className = 'primary-btn';
  const existingBody = dialog.querySelector('.dialog-body-custom');
  if (existingBody) existingBody.remove();
  const body = document.createElement('div');
  body.className = 'dialog-body-custom';
  body.appendChild(tempDiv.firstElementChild);
  dialog.querySelector('.dialog-content').insertBefore(body, dialog.querySelector('.dialog-footer'));

  const getName = () => new Promise(resolve => {
    _activeDialogResolve = resolve;
    const onConfirm = () => { const name = document.getElementById('templateNameInput')?.value.trim() || null; cleanup(); resolve(name); };
    const onCancel = () => { cleanup(); resolve(null); };
    const cleanup = () => {
      _activeDialogCleanup = null;
      _activeDialogResolve = null;
      dialogConfirmBtn.removeEventListener('click', onConfirm);
      dialogCancelBtn.removeEventListener('click', onCancel);
      dialog.close();
      dialogMessage.style.display = '';
      dialogIconPath.parentElement.style.display = '';
      if (body) body.remove();
    };
    _activeDialogCleanup = cleanup;
    dialogConfirmBtn.addEventListener('click', onConfirm);
    dialogCancelBtn.addEventListener('click', onCancel);
    dialog.showModal();
  });

  const name = await getName();
  if (!name) return;
  const templateTasks = tasks.map(t => ({
    title: t.title,
    tags: [...(t.tags || [])],
    priority: t.priority || null
  }));
  templates.push({
    id: Date.now().toString(),
    name,
    tasks: templateTasks,
    taskCount: templateTasks.length,
    createdAt: Date.now()
  });
  await saveTemplatesAndRender();
  showToast(`模板「${name}」已保存`);
}

async function handleApplyTemplate(id) {
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;
  const confirm = await showConfirmDialog(`应用模板「${tpl.name}」将添加 ${tpl.taskCount} 个任务，是否继续？`);
  if (!confirm) return;
  for (const t of tpl.tasks) {
    tasks.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      title: t.title,
      completed: false,
      dueDate: '',
      createdAt: Date.now(),
      tags: [...(t.tags || [])],
      subtasks: [],
      priority: t.priority || null
    });
  }
  await window.electronAPI.saveTodos(tasks);
  render();
  showToast(`已应用模板「${tpl.name}」，添加 ${tpl.taskCount} 个任务`);
}

async function handleDeleteTemplate(id) {
  const confirm = await showConfirmDialog('确定删除这个模板吗？', 'danger');
  if (!confirm) return;
  templates = templates.filter(t => t.id !== id);
  await saveTemplatesAndRender();
  showToast('模板已删除');
}

// ============================================================
// 视图切换 (带动画)
// ============================================================
let _currentViewId = 'tasksView';
let _viewAnimating = false;

function switchView(viewId) {
  if (_viewAnimating || viewId === _currentViewId) return;
  _viewAnimating = true;

  const currentEl = document.getElementById(_currentViewId);
  const targetEl = document.getElementById(viewId);
  if (!targetEl) { _viewAnimating = false; return; }

  // 计算方向
  const viewOrder = ['tasksView', 'habitsView', 'goalsView', 'templatesView'];
  const curIdx = viewOrder.indexOf(_currentViewId);
  const tgtIdx = viewOrder.indexOf(viewId);
  const isForward = tgtIdx > curIdx;

  // 设置当前面板退出动画
  if (currentEl) {
    currentEl.classList.remove('active', 'enter-right', 'enter-left');
    currentEl.classList.add(isForward ? 'exit-left' : 'exit-right');
  }

  // 设置目标面板进入动画
  targetEl.classList.remove('exit-left', 'exit-right', 'enter-right', 'enter-left');
  targetEl.classList.add(isForward ? 'enter-right' : 'enter-left');

  // 强制回流后触发进入
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      targetEl.classList.remove('enter-right', 'enter-left');
      targetEl.classList.add('active');

      if (currentEl) {
        // 等过渡结束后移除退出类
        setTimeout(() => {
          currentEl.classList.remove('exit-left', 'exit-right');
          _viewAnimating = false;
        }, 230);
      } else {
        _viewAnimating = false;
      }
    });
  });

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewId);
  });

  _currentViewId = viewId;

  if (viewId === 'habitsView') renderHabits();
  if (viewId === 'goalsView') renderGoals();
  if (viewId === 'templatesView') renderTemplates();
}

// ============================================================
// 初始化
// ============================================================
async function init() {
  settingsVersionSpan.textContent = VERSION;

  try {
    const config = await window.electronAPI.configGet();
    const debugFromMain = config.debugEnabled;
    localStorage.setItem('todo_debug_mode', String(debugFromMain));
    APP_CONFIG.debugMode = debugFromMain;
    debugModeToggle.checked = debugFromMain;

    const level = config.logLevel || 'info';
    localStorage.setItem('todo_log_level', level);
    if (window.logLevelSelect) {
      window.logLevelSelect.setValue(level, false);
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
    subtasks: t.subtasks || [],
    priority: t.priority || null
  }));
  habits = await window.electronAPI.loadHabits();
  templates = await window.electronAPI.loadTemplates();
  goals = await window.electronAPI.loadGoals();
  updateSortDisplay(currentSort);
  render();
  log('应用初始化完成');
}

document.addEventListener('DOMContentLoaded', () => {
  const dueDateDisplay = document.getElementById('dueDateDisplay');
  const dueDateToggle = document.getElementById('dueDateToggleBtn');
  const dueDatePopup = document.getElementById('calendarPopup');
  const dueDateHidden = document.createElement('input');
  dueDateHidden.type = 'hidden';
  dueDateHidden.id = 'dueDateInput';
  dueDateDisplay.parentNode.appendChild(dueDateHidden);
  window.mainDatePicker = createDatePicker({
    displayInput: dueDateDisplay,
    toggleBtn: dueDateToggle,
    popup: dueDatePopup,
    hiddenInput: dueDateHidden,
    onSelect: (dateStr) => {}
  });

  const editDueDateDisplay = document.getElementById('editDueDateDisplay');
  const editDueDateToggle = document.querySelector('#editDueDatePicker .edit-date-toggle');
  const editDueDatePopup = document.getElementById('editCalendarPopup');
  const editDueDateHidden = document.createElement('input');
  editDueDateHidden.type = 'hidden';
  editDueDateHidden.id = 'editDueDate';
  editDueDateDisplay.parentNode.appendChild(editDueDateHidden);
  window.editDatePicker = createDatePicker({
    displayInput: editDueDateDisplay,
    toggleBtn: editDueDateToggle,
    popup: editDueDatePopup,
    hiddenInput: editDueDateHidden,
    onSelect: (dateStr) => {}
  });

  window.taskPrioritySelect = initCustomSelect({
    containerId: 'taskPrioritySelect',
    selectedTextId: 'taskPrioritySelectedText',
    optionsSelector: '.select-options',
    getDefaultValue: () => '',
    onChange: (value, label) => {}
  });

  window.editPrioritySelect = initCustomSelect({
    containerId: 'editPrioritySelect',
    selectedTextId: 'editPrioritySelectedText',
    optionsSelector: '.select-options',
    getDefaultValue: () => '',
    onChange: (value, label) => {}
  });

  window.logLevelSelect = initCustomSelect({
    containerId: 'logLevelSelect',
    selectedTextId: 'logLevelSelectedText',
    optionsSelector: '.select-options',
    getDefaultValue: () => {
      const level = localStorage.getItem('todo_log_level') || 'info';
      return level;
    },
    onChange: async (value, label) => {
      if (window.electronAPI && window.electronAPI.setLogLevel) {
        const result = await window.electronAPI.setLogLevel(value);
        if (result.success) {
          localStorage.setItem('todo_log_level', value);
          showToast(`日志级别已切换为 ${label}`);
          log(`日志级别切换为 ${value}`);
        } else {
          showToast(result.error || '设置失败', 'error');
        }
      }
    }
  });

  initCustomSortSelect();
  init();

  // 侧边栏导航切换
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // 习惯追踪事件
  document.getElementById('addHabitBtn')?.addEventListener('click', handleAddHabit);

  document.getElementById('habitsList')?.addEventListener('click', async (e) => {
    const card = e.target.closest('.habit-card');
    if (!card) return;
    const id = card.dataset.habitId;
    if (e.target.closest('.checkin-habit-btn')) {
      await handleCheckinHabit(id);
    } else if (e.target.closest('.edit-habit-btn')) {
      await handleEditHabit(id);
    } else if (e.target.closest('.delete-habit-btn')) {
      await handleDeleteHabit(id);
    } else if (e.target.closest('.habit-checkin-day:not(.empty)')) {
      const day = e.target.closest('.habit-checkin-day');
      handleHabitDateClick(id, day.dataset.date);
    }
  });

  // 目标(OKR)事件
  document.getElementById('addGoalBtn')?.addEventListener('click', handleAddGoal);

  document.getElementById('goalsList')?.addEventListener('click', async (e) => {
    const card = e.target.closest('.goal-card');
    if (!card) return;
    const id = card.dataset.goalId;
    if (e.target.closest('.edit-goal-btn')) {
      await handleEditGoal(id);
    } else if (e.target.closest('.delete-goal-btn')) {
      await handleDeleteGoal(id);
    } else if (e.target.closest('.add-kr-btn')) {
      await handleAddKr(id);
    }
  });

  // 滑条拖拽中：仅本地更新 UI，不触发热重绘
  document.getElementById('goalsList')?.addEventListener('input', (e) => {
    if (e.target.classList.contains('kr-progress-slider')) {
      const val = parseInt(e.target.value, 10);
      // 更新百分比文字
      const pctSpan = e.target.parentElement.querySelector('.kr-pct');
      if (pctSpan) {
        pctSpan.textContent = val + '%';
        pctSpan.style.color = val >= 100 ? 'var(--success-color, #2e7d32)' : 'var(--text-primary)';
      }
      // 更新所属目标的进度条和头部统计
      const goalCard = e.target.closest('.goal-card');
      if (goalCard) {
        const goalId = goalCard.dataset.goalId;
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          // 找到被拖拽的 KR 并更新内存中的进度
          const kr = goal.keyResults.find(k => k.id === e.target.dataset.krId);
          if (kr) kr.progress = val;
          // 重新计算总体进度
          const totalKr = goal.keyResults.length;
          const completedKr = goal.keyResults.filter(k => k.progress >= 100).length;
          const overallProgress = totalKr > 0 ? Math.round(goal.keyResults.reduce((s, k) => s + k.progress, 0) / totalKr) : 0;
          // 更新进度条
          const fill = goalCard.querySelector('.goal-progress-fill');
          if (fill) fill.style.width = overallProgress + '%';
          // 更新头部文字
          const headerText = goalCard.querySelector('.goal-progress-text');
          if (headerText) headerText.textContent = overallProgress + '% · ' + completedKr + '/' + totalKr + ' KR';
        }
      }
    }
  });

  // 滑条释放后：保存数据
  document.getElementById('goalsList')?.addEventListener('change', async (e) => {
    if (e.target.classList.contains('kr-progress-slider')) {
      const goalId = e.target.dataset.goalId;
      const krId = e.target.dataset.krId;
      await handleKrProgressChange(goalId, krId, e.target.value);
    }
  });

  // 模板事件
  document.getElementById('saveAsTemplateBtn')?.addEventListener('click', handleSaveAsTemplate);

  document.getElementById('templatesList')?.addEventListener('click', async (e) => {
    if (e.target.closest('.apply-template-btn')) {
      const btn = e.target.closest('.apply-template-btn');
      await handleApplyTemplate(btn.dataset.templateId);
    } else if (e.target.closest('.delete-template-btn')) {
      const btn = e.target.closest('.delete-template-btn');
      await handleDeleteTemplate(btn.dataset.templateId);
    }
  });

  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });

  searchInput?.addEventListener('input', (e) => {
    currentSearch = e.target.value || '';
    render();
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      currentSearch = '';
      render();
    }
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);
  exportBtn?.addEventListener('click', exportData);

  filterBtns.forEach(btn => btn.addEventListener('click', () => setFilter(btn.getAttribute('data-filter'))));

  todoListEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = item.getAttribute('data-id');

    const clickedTag = e.target.closest('.tag');
    if (clickedTag) {
      const tagText = clickedTag.textContent.trim();
      if (tagText) {
        activeTagFilter = tagText;
        if (searchInput) {
          searchInput.value = '';
          currentSearch = '';
        }
        render();
      }
      return;
    }

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
      const container = item.querySelector('.subtask-container');
      if (!container) return;
      const isCurrentlyExpanded = container.style.display === 'block';
      if (isCurrentlyExpanded) {
        container.style.display = 'none';
        expandedTaskIds.delete(id);
      } else {
        container.style.display = 'block';
        expandedTaskIds.add(id);
      }
      return;
    }
    const mainArea = e.target.closest('.todo-main');
    if (mainArea && !e.target.closest('.todo-actions') && !e.target.closest('input') && !e.target.closest('.tag')) {
      const container = item.querySelector('.subtask-container');
      if (!container) return;
      const isCurrentlyExpanded = container.style.display === 'block';
      if (isCurrentlyExpanded) {
        container.style.display = 'none';
        expandedTaskIds.delete(id);
      } else {
        container.style.display = 'block';
        expandedTaskIds.add(id);
      }
      return;
    }
    if (e.target.closest('.add-subtask-btn')) {
      const container = item.querySelector('.subtask-container');
      const input = container.querySelector('.subtask-input');
      const title = input.value.trim();
      if (!title) return;
      const task = tasks.find(t => t.id === id);
      if (task) {
        const newStId = Date.now().toString() + Math.random().toString(36).substr(2, 4);
        task.subtasks.push({
          id: newStId,
          title,
          completed: false
        });
        expandedTaskIds.add(id);
        await window.electronAPI.saveTodos(tasks);
        // 局部插入新子任务 DOM，不触发全量重绘
        const list = container.querySelector('.subtask-list') || container.querySelector('ul');
        if (list) {
          const li = document.createElement('li');
          li.className = 'subtask-item';
          li.dataset.subtaskId = newStId;
          li.innerHTML = `<input type="checkbox" class="subtask-checkbox">
            <span class="subtask-title">${escapeHtml(title)}</span>
            <div class="subtask-actions">
              <button class="icon-btn edit-subtask-btn" title="编辑子任务">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn delete-subtask-btn" title="删除子任务">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>`;
          list.appendChild(li);
        }
        input.value = '';
        showToast('子任务已添加');
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
        // 局部删除 DOM 节点，不触发全量重绘
        subtaskItem.remove();
      }
      return;
    }

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
        // 只更新父任务的完成状态计数，不触发全量重绘
        const completedCount = task.subtasks.filter(st => st.completed).length;
        const totalSubtask = task.subtasks.length;
        // 可选：更新任务计数显示
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

  saveEditBtn.addEventListener('click', saveEdit);
  closeModalBtn.addEventListener('click', () => editModal.close());

  let previousViewId = 'tasksView';

  function openSettingsView() {
    const activePanel = document.querySelector('.view-panel.active');
    if (activePanel && activePanel.id !== 'settingsView') {
      previousViewId = activePanel.id;
    }
    // 设置视图平滑过渡到设置
    if (activePanel && activePanel.id !== 'settingsView') {
      activePanel.classList.remove('active');
      activePanel.classList.add('exit-left');
      setTimeout(() => {
        activePanel.classList.remove('exit-left');
      }, 280);
    }
    // 清除所有导航按钮的 active 状态，避免误填充
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    settingsView.classList.remove('enter-right', 'enter-left', 'exit-left', 'exit-right');
    settingsView.classList.add('active');
    settingsBtn.classList.add('active');
    log('打开设置面板');
  }

  function closeSettingsView() {
    settingsView.classList.remove('active');
    settingsBtn.classList.remove('active');
    // 恢复之前视图的导航按钮 active 状态
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === previousViewId);
    });
    const target = document.getElementById(previousViewId);
    if (target) {
      target.classList.remove('active', 'enter-right', 'enter-left', 'exit-left', 'exit-right');
      target.classList.add('active');
    }
    log('关闭设置面板');
  }

  settingsBtn.addEventListener('click', () => {
    if (settingsView.classList.contains('active')) {
      closeSettingsView();
    } else {
      openSettingsView();
    }
  });

  closeSettingsViewBtn.addEventListener('click', closeSettingsView);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal.open) {
        editModal.close();
        e.preventDefault();
        return;
      }
      if (customDialog.open) {
        if (_activeDialogCleanup) _activeDialogCleanup();
        customDialog.close();
        e.preventDefault();
        return;
      }
      if (settingsView.classList.contains('active')) {
        closeSettingsView();
        e.preventDefault();
      }
    }
  });

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
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

  dueDateEnableToggle.addEventListener('change', (e) => {
    APP_CONFIG.dueDateEnabled = e.target.checked;
    saveConfig();
    applyDueDateFeatureState();
    render();
    log(`截止日期功能: ${APP_CONFIG.dueDateEnabled ? '启用' : '禁用'}`);
  });

  compactModeToggle.addEventListener('change', (e) => {
    APP_CONFIG.compactMode = e.target.checked;
    document.body.setAttribute('data-compact', APP_CONFIG.compactMode ? 'true' : 'false');
    saveConfig();
    log(`紧凑模式: ${APP_CONFIG.compactMode ? '启用' : '禁用'}`);
  });

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

  if (dueThresholdInput) {
    dueThresholdInput.addEventListener('change', (e) => {
      const v = parseInt(e.target.value, 10);
      APP_CONFIG.dueThreshold = !isNaN(v) && v >= 0 ? v : APP_CONFIG.dueThreshold;
      saveConfig();
      render();
    });
  }

  if (includeTodayToggle) {
    includeTodayToggle.addEventListener('change', (e) => {
      APP_CONFIG.dueCountToday = !!e.target.checked;
      saveConfig();
      render();
    });
  }

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
      localStorage.removeItem('todo_compact_mode');
      localStorage.removeItem('todo_log_level');
      localStorage.removeItem('todo_due_threshold');
      localStorage.removeItem('todo_due_count_today');
      loadConfig();
      if (window.logLevelSelect) {
        window.logLevelSelect.setValue('info', false);
      }
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

  if (copyInfoBtn) {
    copyInfoBtn.addEventListener('click', async () => {
      try {
        const version = settingsVersionSpan ? settingsVersionSpan.textContent.trim() : VERSION;
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';
        const language = navigator.language || '';
        const screenSize = `${screen.width}x${screen.height}`;
        const dpi = window.devicePixelRatio || 1;
        const info = `- 软件版本: ${version}\n- 操作系统: ${platform}\n- 用户代理: ${ua}\n- 语言: ${language}\n- 屏幕: ${screenSize}\n- DPR: ${dpi}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(info);
        } else {
          const ta = document.createElement('textarea');
          ta.value = info;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        showToast('软件与设备信息已复制到剪贴板');
        log('已复制软件与设备信息');
      } catch (err) {
        console.error('复制信息失败', err);
        showToast('复制失败，请手动复制', 'error');
        log(`复制信息失败: ${err.message}`, 'error');
      }
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', async () => {
      try {
        feedbackBtn.disabled = true;
        await window.electronAPI.openUrl('https://github.com/JunLoye/Todo-List/issues/new/choose');
        showToast('已打开反馈页面');
        log('打开反馈页面');
      } catch (error) {
        console.error('打开反馈页面失败:', error);
        showToast('无法打开反馈页面', 'error');
        log(`打开反馈页面失败: ${error.message}`, 'error');
      } finally {
        feedbackBtn.disabled = false;
      }
    });
  }

  let updating = false;
  checkUpdateBtn.addEventListener('click', async () => {
    if (updating) return;
    updating = true;

    const originalHTML = checkUpdateBtn.innerHTML;
    checkUpdateBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           style="animation: spin 1s linear infinite; display:inline-block; vertical-align:middle;">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg> 检查中...`;
    checkUpdateBtn.disabled = true;

    styleSpin();

    try {
      const data = await window.electronAPI.checkUpdate();
      const latestVersion = data.tag_name.replace(/^v/, '');

      if (compareVersions(latestVersion, VERSION) > 0) {
        updateStatusText.innerHTML = `检测到新版本 v${latestVersion}`;
        updateStatusText.style.color = getComputedStyle(document.documentElement).getPropertyValue('--toast-error-text') || '#c62828';
        const updateConfirm = await showConfirmDialog(`发现新版本 v${latestVersion}，是否前往下载？`);
        if (updateConfirm) {
          window.electronAPI.openUrl('https://github.com/junloye/Todo-List/releases/latest');
        }
        log(`发现新版本 v${latestVersion}`);
      } else {
        updateStatusText.innerHTML = '当前已是最新版本';
        updateStatusText.style.color = getComputedStyle(document.documentElement).getPropertyValue('--toast-success-text') || '#2e7d32';
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
      updateStatusText.style.color = getComputedStyle(document.documentElement).getPropertyValue('--toast-error-text') || '#c62828';
      showToast(errorMsg, 'error');
      log(`检查更新失败: ${errorMsg}`, 'error');
    } finally {
      checkUpdateBtn.innerHTML = originalHTML;
      checkUpdateBtn.disabled = false;
      updating = false;
    }
  });
});