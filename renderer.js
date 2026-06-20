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
const sortDueAscOpt = document.getElementById('sortDueAscOpt');

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

const VERSION = '1.5.0';

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

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
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
    if (currentSort === 'create-desc') return b.createdAt - a.createdAt;
    if (currentSort === 'create-asc') return a.createdAt - b.createdAt;
    if (currentSort === 'due-asc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (currentSort === 'priority-desc') {
      const order = { p0: 0, p1: 1, p2: 2, p3: 3 };
      return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
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
  totalSpan.textContent = total;
  activeSpan.textContent = total - completed;
  completedSpan.textContent = completed;

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

function initCustomSortSelect() {
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
  if (sortDueAscOpt) sortDueAscOpt.style.display = isEnabled ? 'block' : 'none';
  const editPickerWrapper = document.getElementById('editDueDatePicker');
  if (editPickerWrapper) {
    editPickerWrapper.style.display = isEnabled ? 'flex' : 'none';
  }

  if (!isEnabled && currentSort === 'due-asc') {
    handleSortChange('create-desc');
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
      if (expandedTaskIds.has(id)) {
        expandedTaskIds.delete(id);
      } else {
        expandedTaskIds.add(id);
      }
      render();
      return;
    }
    const mainArea = e.target.closest('.todo-main');
    if (mainArea && !e.target.closest('.todo-actions') && !e.target.closest('input') && !e.target.closest('.tag')) {
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

  saveEditBtn.addEventListener('click', saveEdit);
  closeModalBtn.addEventListener('click', () => editModal.close());

  settingsBtn.addEventListener('click', () => {
    if (settingsView.classList.contains('active')) {
      settingsView.classList.remove('active');
      tasksView.classList.add('active');
      log('通过点击设置按钮关闭设置面板');
    } else {
      tasksView.classList.remove('active');
      settingsView.classList.add('active');
      log('打开设置面板');
    }
  });

  closeSettingsViewBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    tasksView.classList.add('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (editModal.open) {
        editModal.close();
        e.preventDefault();
        return;
      }
      if (customDialog.open) {
        customDialog.close();
        e.preventDefault();
        return;
      }
      if (settingsView.classList.contains('active')) {
        settingsView.classList.remove('active');
        tasksView.classList.add('active');
        log('通过 ESC 键关闭设置面板');
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