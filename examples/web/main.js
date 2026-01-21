import { EpubCheck } from '@likecoin/epubcheck-ts';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const resultsSection = document.getElementById('resultsSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSummary = document.getElementById('resultsSummary');
const resultsStats = document.getElementById('resultsStats');
const messagesList = document.getElementById('messagesList');
const filterButtons = document.querySelectorAll('.filter-btn');

let currentMessages = [];
let currentFilter = 'all';

// File handling
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file?.name.endsWith('.epub')) {
    validateFile(file);
  } else {
    alert('Please drop a valid EPUB file');
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    validateFile(file);
  }
});

// Filter buttons
filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderMessages();
  });
});

// Validation
async function validateFile(file) {
  showLoading(true);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const result = await EpubCheck.validate(data);

    displayResults(result, file.name);
  } catch (error) {
    console.error('Validation error:', error);
    alert(`Error validating file: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  loadingSection.hidden = !show;
  if (show) {
    resultsSection.hidden = true;
  }
}

function displayResults(result, fileName) {
  resultsSection.hidden = false;
  currentMessages = result.messages;

  // Summary
  resultsSummary.className = `results-summary ${result.valid ? 'valid' : 'invalid'}`;
  resultsSummary.innerHTML = result.valid
    ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Valid EPUB`
    : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Invalid EPUB`;

  // Stats
  resultsStats.innerHTML = `
    <div class="stat-card fatal">
      <div class="count">${result.fatalCount}</div>
      <div class="label">Fatal</div>
    </div>
    <div class="stat-card error">
      <div class="count">${result.errorCount}</div>
      <div class="label">Errors</div>
    </div>
    <div class="stat-card warning">
      <div class="count">${result.warningCount}</div>
      <div class="label">Warnings</div>
    </div>
    <div class="stat-card info">
      <div class="count">${result.infoCount}</div>
      <div class="label">Info</div>
    </div>
    <div class="stat-card usage">
      <div class="count">${result.usageCount || 0}</div>
      <div class="label">Usage</div>
    </div>
  `;

  // Reset filter
  filterButtons.forEach((b) => b.classList.remove('active'));
  filterButtons[0].classList.add('active');
  currentFilter = 'all';

  renderMessages();
}

function renderMessages() {
  const filtered =
    currentFilter === 'all'
      ? currentMessages
      : currentMessages.filter((m) => m.severity === currentFilter);

  if (filtered.length === 0) {
    messagesList.innerHTML = `<div class="no-messages">No messages to display</div>`;
    return;
  }

  messagesList.innerHTML = filtered
    .map(
      (msg) => `
    <div class="message">
      <span class="message-badge ${msg.severity}">${msg.severity}</span>
      <div class="message-content">
        <div class="message-id">${msg.id}</div>
        <div class="message-text">${escapeHtml(msg.message)}</div>
        ${msg.location ? `<div class="message-location">${formatLocation(msg.location)}</div>` : ''}
      </div>
    </div>
  `,
    )
    .join('');
}

function formatLocation(loc) {
  let result = loc.path;
  if (loc.line !== undefined) {
    result += `:${loc.line}`;
    if (loc.column !== undefined) {
      result += `:${loc.column}`;
    }
  }
  return result;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
