document.addEventListener('DOMContentLoaded', () => {

  // Handle App Loader fadeout
  const appLoader = document.getElementById('app-loader');
  if (appLoader) {
    setTimeout(() => {
      appLoader.classList.add('fade-out');
    }, 1200);
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
  }

  // Helper to extract text from a file (supports PDF, TXT, MD)
  async function extractTextFromFile(file) {
    const fileType = file.type || '';
    if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      // Load the PDF via PDF.js
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      return text;
    } else {
      // Treat as plain text
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }
  }

  // Setup drag-and-drop / file input dropzone
  function setupDropzone(zoneId, inputId, infoId, onTextExtracted, onCleared) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const info = document.getElementById(infoId);

    if (!zone || !input || !info) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length) {
        input.files = files;
        handleFileSelect(files[0]);
      }
    });

    input.addEventListener('change', (e) => {
      if (input.files.length) {
        handleFileSelect(input.files[0]);
      }
    });

    async function handleFileSelect(file) {
      info.innerHTML = `
        <span>Uploaded: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>
        <button id="${inputId}-remove-btn">&times;</button>
      `;
      info.classList.remove('hidden');
      
      const removeBtn = document.getElementById(`${inputId}-remove-btn`);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        info.classList.add('hidden');
        if (onCleared) onCleared();
      });

      try {
        const text = await extractTextFromFile(file);
        if (onTextExtracted) onTextExtracted(text);
      } catch (err) {
        showToast('Error parsing file: ' + err.message, true);
      }
    }
  }

  // Helper to generate modern skeleton loader layout HTML
  function getSkeletonHtml(lines = 5) {
    let linesHtml = '';
    for (let i = 0; i < lines; i++) {
      const styleClass = i % 3 === 0 ? 'medium' : (i % 3 === 1 ? 'short' : '');
      linesHtml += `<div class="skeleton-line skeleton-pulse ${styleClass}"></div>`;
    }
    return `
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-pulse short" style="height: 20px; margin-bottom: 1rem; width: 40%;"></div>
        ${linesHtml}
      </div>
    `;
  }

  // Voice speech input helper using Web Speech API
  function setupVoiceInput(btnId, targetInputEl) {
    const btn = document.getElementById(btnId);
    if (!btn || !targetInputEl) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.style.display = 'none'; // Speech recognition not supported in this browser
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isRecording = false;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isRecording) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (err) {
          showToast('Speech recognition already active', true);
        }
      }
    });

    recognition.onstart = () => {
      isRecording = true;
      btn.classList.add('recording');
      showToast('Listening... Speak now!');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (targetInputEl.tagName === 'TEXTAREA' || targetInputEl.tagName === 'INPUT') {
        const val = targetInputEl.value.trim();
        targetInputEl.value = val ? val + ' ' + transcript : transcript;
        // Trigger input event to simulate typing
        targetInputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      showToast('Voice input processed!');
    };

    recognition.onerror = (event) => {
      showToast('Voice recognition error: ' + event.error, true);
    };

    recognition.onend = () => {
      isRecording = false;
      btn.classList.remove('recording');
    };
  }

  function getSettings() {
    return {
      provider: localStorage.getItem('sb_provider') || 'groq',
      model: localStorage.getItem('sb_model') || 'llama-3.3-70b-versatile',
      style: localStorage.getItem('sb_style') || 'ELI5',
      level: localStorage.getItem('sb_level') || 'college',
      length: localStorage.getItem('sb_length') || 'comprehensive',
      temp: parseFloat(localStorage.getItem('sb_temp')) || 0.7,
    };
  }

  function getActiveKey() {
    return '';
  }

  function isAiConfigured() {
    const s = getSettings();
    // Only require provider now, as API keys are in the backend
    return !!s.provider;
  }

  async function callApi(endpoint, prompt) {
    const s = getSettings();
    const apiKey = getActiveKey();
    if (!s.provider) {
      showToast('Please configure AI provider first.', true);
      openSettingsModal();
      throw new Error('AI not configured');
    }
    const resp = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider: s.provider, 
        apiKey, 
        prompt,
        model: s.model,
        style: s.style,
        level: s.level,
        length: s.length,
        temperature: s.temp
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'API request failed');
    return data.result;
  }

  // ============================================================
  // SETTINGS MODAL
  // ============================================================

  const settingsOverlay = document.getElementById('settings-overlay');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const providerCards = document.querySelectorAll('.provider-card');
  const aiBadge = document.getElementById('ai-badge');
  const aiBadgeText = document.getElementById('ai-badge-text');

  const tempSlider = document.getElementById('settings-temp');
  const tempDisplay = document.getElementById('temp-val-display');

  function updateTempValDisplay(val) {
    let desc = 'Balanced';
    if (val <= 0.3) desc = 'Precise / Strict';
    else if (val <= 0.7) desc = 'Balanced';
    else if (val <= 1.1) desc = 'Creative';
    else desc = 'Highly Creative';
    tempDisplay.textContent = `${parseFloat(val).toFixed(1)} (${desc})`;
  }

  tempSlider.addEventListener('input', (e) => {
    updateTempValDisplay(e.target.value);
  });

  function openSettingsModal() {
    settingsOverlay.classList.remove('hidden');
    // Load saved values
    const s = getSettings();
    providerCards.forEach(c => {
      c.classList.toggle('selected', c.dataset.provider === s.provider);
      c.querySelector('input').checked = c.dataset.provider === s.provider;
    });
    // Set active select values
    document.getElementById('settings-model').value = s.model;
    document.getElementById('settings-style').value = s.style;
    document.getElementById('settings-level').value = s.level;
    document.getElementById('settings-length').value = s.length;
    
    const tempVal = s.temp !== undefined ? s.temp : 0.7;
    tempSlider.value = tempVal;
    updateTempValDisplay(tempVal);
  }

  function closeSettingsModal() { settingsOverlay.classList.add('hidden'); }

  function updateBadge() {
    const s = getSettings();
    if (isAiConfigured()) {
      aiBadge.classList.add('connected');
      let modelName = 'Llama 3.3';
      if (s.model === 'mixtral-8x7b-32768') modelName = 'Mixtral 8x7B';
      if (s.model === 'gemma2-9b-it') modelName = 'Gemma 2';
      aiBadgeText.textContent = `Groq (${modelName})`;
    } else {
      aiBadge.classList.remove('connected');
      aiBadgeText.textContent = 'No AI Connected';
    }
  }

  openSettingsBtn.addEventListener('click', openSettingsModal);
  mobileSettingsBtn.addEventListener('click', openSettingsModal);
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
  aiBadge.addEventListener('click', openSettingsModal);
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettingsModal(); });

  providerCards.forEach(card => {
    card.addEventListener('click', () => {
      providerCards.forEach(c => { c.classList.remove('selected'); c.querySelector('input').checked = false; });
      card.classList.add('selected');
      card.querySelector('input').checked = true;
    });
  });

  saveSettingsBtn.addEventListener('click', () => {
    const selectedProvider = document.querySelector('.provider-card.selected')?.dataset.provider || '';

    if (!selectedProvider) { showToast('Please select an AI provider.', true); return; }

    const model = document.getElementById('settings-model').value;
    const style = document.getElementById('settings-style').value;
    const level = document.getElementById('settings-level').value;
    const length = document.getElementById('settings-length').value;
    const temp = tempSlider.value;

    localStorage.setItem('sb_provider', selectedProvider);
    localStorage.setItem('sb_model', model);
    localStorage.setItem('sb_style', style);
    localStorage.setItem('sb_level', level);
    localStorage.setItem('sb_length', length);
    localStorage.setItem('sb_temp', temp);

    updateBadge();
    closeSettingsModal();
    showToast(`Connected to Groq!`);
  });

  updateBadge();

  // ============================================================
  // THEME TOGGLE
  // ============================================================

  const themeToggle = document.getElementById('theme-toggle');
  if (localStorage.getItem('sb_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.checked = true;
  }
  themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('sb_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('sb_theme', 'light');
    }
  });

  // ============================================================
  // MOBILE SIDEBAR
  // ============================================================

  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  }
  hamburger.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', toggleSidebar);

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');
  const pageTitle = document.getElementById('page-title');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(item.dataset.target).classList.add('active');
      pageTitle.textContent = item.textContent.trim();
      
      // Prefill flashcards when clicking the tab if dashboard or roadmap context is active
      if (item.dataset.target === 'flashcards') {
        const flashcardTopicInput = document.getElementById('flashcard-topic-input');
        if (window.lastSyllabusText && !flashcardTopicInput.value) {
          flashcardTopicInput.value = "Syllabus Context";
          window.activeFlashcardContext = window.lastSyllabusText;
        } else if (window.lastDashboardQuery && !flashcardTopicInput.value) {
          flashcardTopicInput.value = window.lastDashboardQuery.substring(0, 60);
          window.activeFlashcardContext = window.lastDashboardQuery + (window.lastDashboardTextContent ? "\n\nUploaded content:\n" + window.lastDashboardTextContent : "");
        }
      }

      // Close sidebar on mobile
      if (sidebar.classList.contains('open')) toggleSidebar();
    });
  });

  // ============================================================
  // TASK MANAGER
  // ============================================================

  const taskInput = document.getElementById('new-task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');
  let tasks = JSON.parse(localStorage.getItem('sb_tasks')) || [];

  function saveTasks() { localStorage.setItem('sb_tasks', JSON.stringify(tasks)); }
  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item${task.completed ? ' completed' : ''}`;
      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-text">${task.text}</span>
        <button class="delete-task-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>`;
      li.querySelector('.task-checkbox').addEventListener('change', (e) => {
        task.completed = e.target.checked;
        li.classList.toggle('completed', task.completed);
        saveTasks();
        if (task.completed) showToast('Task completed!');
      });
      li.querySelector('.delete-task-btn').addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks(); renderTasks();
      });
      taskList.appendChild(li);
    });
  }
  renderTasks();

  addTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text) {
      tasks.push({ id: Date.now(), text, completed: false });
      saveTasks(); renderTasks(); taskInput.value = '';
      showToast('Task added');
    }
  });
  taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTaskBtn.click(); });

  // ============================================================
  // POMODORO TIMER (with ring progress)
  // ============================================================

  const timerDisplay = document.getElementById('timer-display');
  const timerStart = document.getElementById('timer-start');
  const timerReset = document.getElementById('timer-reset');
  const ringProgress = document.getElementById('timer-ring-progress');
  const timerMinutesInput = document.getElementById('timer-minutes');
  
  const CIRCUMFERENCE = 2 * Math.PI * 54; // r=54
  let totalTime = parseInt(timerMinutesInput.value) * 60;
  let timeLeft = totalTime;
  let timerInterval;
  let isRunning = false;

  ringProgress.style.strokeDasharray = CIRCUMFERENCE;

  function updateTimer() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
    const offset = CIRCUMFERENCE * (1 - timeLeft / totalTime);
    ringProgress.style.strokeDashoffset = offset;
  }
  updateTimer();

  timerMinutesInput.addEventListener('input', () => {
    if (!isRunning) {
      let mins = parseInt(timerMinutesInput.value);
      if (isNaN(mins) || mins < 1) mins = 1;
      if (mins > 180) mins = 180;
      totalTime = mins * 60;
      timeLeft = totalTime;
      updateTimer();
    }
  });

  timerStart.addEventListener('click', () => {
    if (isRunning) {
      clearInterval(timerInterval); timerStart.textContent = 'Start'; isRunning = false;
      timerMinutesInput.disabled = false; // Re-enable input on pause
    } else {
      // Lock input during run
      timerMinutesInput.disabled = true;
      timerInterval = setInterval(() => {
        if (timeLeft > 0) { timeLeft--; updateTimer(); }
        else {
          clearInterval(timerInterval); isRunning = false; timerStart.textContent = 'Start';
          timerMinutesInput.disabled = false;
          showToast('Time is up! Take a break.');
          // Track study time based on completed duration
          const hrs = parseFloat(localStorage.getItem('sb_studyHours') || '0');
          localStorage.setItem('sb_studyHours', (hrs + totalTime / 3600).toFixed(1));
          updateStats();
        }
      }, 1000);
      timerStart.textContent = 'Pause'; isRunning = true;
    }
  });

  timerReset.addEventListener('click', () => {
    clearInterval(timerInterval); 
    timerMinutesInput.disabled = false;
    let mins = parseInt(timerMinutesInput.value);
    if (isNaN(mins) || mins < 1) mins = 1;
    totalTime = mins * 60;
    timeLeft = totalTime; 
    updateTimer();
    timerStart.textContent = 'Start'; isRunning = false;
  });

  // ============================================================
  // STATS
  // ============================================================

  function updateStats() {
    const hrs = localStorage.getItem('sb_studyHours') || '0';
    const quizzes = localStorage.getItem('sb_quizCount') || '0';
    document.getElementById('stat-hours').innerHTML = `${hrs} <span class="stat-unit">hrs</span>`;
    document.getElementById('stat-quizzes').textContent = quizzes;
  }
  updateStats();

  // ============================================================
  // DASHBOARD QUICK AI STUDY HUB
  // ============================================================

  const dashboardInput = document.getElementById('dashboard-input');
  const dashboardSubmitBtn = document.getElementById('dashboard-submit-btn');
  const dashboardFile = document.getElementById('dashboard-file');
  const dashboardFileInfo = document.getElementById('dashboard-file-info');

  let dashboardUploadedText = '';

  setupDropzone('dashboard-dropzone', 'dashboard-file', 'dashboard-file-info', (text) => {
    dashboardUploadedText = text;
    showToast('Dashboard study material loaded!');
  }, () => {
    dashboardUploadedText = '';
  });

  setupVoiceInput('dashboard-voice-btn', dashboardInput);

  dashboardSubmitBtn.addEventListener('click', () => {
    const text = dashboardInput.value.trim();
    if (!text && !dashboardUploadedText) {
      showToast('Please enter a query or upload a file.', true);
      return;
    }

    // Pass dashboard state directly to Chat Explainer
    uploadedChatText = dashboardUploadedText;
    
    // Save dashboard context for flashcards generator
    window.lastDashboardQuery = text;
    window.lastDashboardTextContent = dashboardUploadedText;

    if (dashboardUploadedText && dashboardFile.files.length) {
      const file = dashboardFile.files[0];
      chatFileIndicator.innerHTML = `
        <span>Context File: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>
        <button id="remove-chat-file-btn">&times;</button>
      `;
      chatFileIndicator.classList.remove('hidden');

      // Re-bind the remove button on the chat overlay indicator
      document.getElementById('remove-chat-file-btn').addEventListener('click', () => {
        chatFile.value = '';
        uploadedChatText = '';
        chatFileIndicator.classList.add('hidden');
        showToast('Context file removed');
      });
    }

    chatInput.value = text;

    // Reset dashboard elements
    dashboardInput.value = '';
    dashboardUploadedText = '';
    dashboardFile.value = '';
    dashboardFileInfo.classList.add('hidden');

    // Switch view to AI Explainer
    document.querySelector('.nav-item[data-target="ai-explainer"]').click();

    // Trigger chat send automatically
    chatSend.click();
  });

  // ============================================================
  // SYLLABUS ROADMAP (AI-powered)
  // ============================================================

  const syllabusInput = document.getElementById('syllabus-input');
  const generateRoadmapBtn = document.getElementById('generate-roadmap-btn');
  const roadmapOutput = document.getElementById('roadmap-output');
  const materialActions = document.getElementById('material-actions');
  const generateMaterialsBtn = document.getElementById('generate-materials-btn');
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  const pdfContainer = document.getElementById('pdf-container');
  const pdfContent = document.getElementById('pdf-content');

  // Initialize syllabus file dropzone
  setupDropzone('syllabus-dropzone', 'syllabus-file', 'syllabus-file-info', (text) => {
    syllabusInput.value = text;
    showToast('Syllabus file loaded successfully!');
  }, () => {
    syllabusInput.value = '';
  });

  setupVoiceInput('roadmap-voice-btn', syllabusInput);

  generateRoadmapBtn.addEventListener('click', async () => {
    const text = syllabusInput.value.trim();
    if (!text) return;

    // Save syllabus context for flashcards generator
    window.lastSyllabusText = text;

    generateRoadmapBtn.innerHTML = '<span class="spinner"></span> Generating...';
    generateRoadmapBtn.disabled = true;
    
    // Show modern skeleton loader
    roadmapOutput.innerHTML = getSkeletonHtml(6);
    roadmapOutput.classList.remove('hidden');

    try {
      const result = await callApi('roadmap', text);
      let milestones;
      try { milestones = JSON.parse(result); } catch { milestones = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]'); }

      roadmapOutput.innerHTML = milestones.map(m =>
        `<div class="roadmap-item"><h5>${m.title}</h5><p>${m.description}</p></div>`
      ).join('');
      materialActions.classList.remove('hidden');
      document.getElementById('download-roadmap-pdf-btn').classList.remove('hidden');
      showToast('Roadmap generated!');
    } catch (err) {
      roadmapOutput.innerHTML = `<p class="placeholder-text">Error generating roadmap: ${err.message}</p>`;
      showToast(`Error: ${err.message}`, true);
    }
    generateRoadmapBtn.innerHTML = 'Generate Roadmap';
    generateRoadmapBtn.disabled = false;
  });

  const downloadRoadmapPdfBtn = document.getElementById('download-roadmap-pdf-btn');
  downloadRoadmapPdfBtn.addEventListener('click', () => {
    showToast('Preparing PDF...');
    const element = document.createElement('div');
    element.style.padding = '30px';
    element.style.fontFamily = "'Outfit', sans-serif";
    element.style.color = '#1e293b';
    element.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #6d28d9; margin-bottom: 5px; font-weight: 700;">Nova Learn — Study Roadmap</h2>
        <p style="color: #64748b; margin: 0;">Your customized study milestone schedule</p>
      </div>
      <div style="border-left: 3px solid #6d28d9; padding-left: 20px; margin-left: 10px;">
        ${roadmapOutput.innerHTML.replace(/class="roadmap-item"/g, 'style="margin-bottom: 25px; position: relative;"').replace(/<h5>/g, '<h4 style="color: #6d28d9; margin: 0 0 5px; font-size: 1.15rem; font-weight: 600;">').replace(/<\/h5>/g, '</h4>').replace(/<p>/g, '<p style="margin: 0; color: #475569; font-size: 0.95rem; line-height: 1.5;">')}
      </div>
    `;
    html2pdf().set({
      margin: 0.5, filename: 'Study_Roadmap.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
      showToast('Roadmap PDF Downloaded!');
    });
  });

  generateMaterialsBtn.addEventListener('click', async () => {
    const text = syllabusInput.value.trim();
    if (!text) return;

    generateMaterialsBtn.innerHTML = '<span class="spinner"></span> Generating...';
    generateMaterialsBtn.disabled = true;

    // Use skeleton loader for materials
    pdfContainer.classList.remove('hidden');
    pdfContent.innerHTML = getSkeletonHtml(12);

    try {
      const result = await callApi('materials', text);
      pdfContent.innerHTML = result;
      downloadPdfBtn.classList.remove('hidden');
      showToast('Study materials generated!');
    } catch (err) {
      pdfContent.innerHTML = `<p class="placeholder-text">Error generating materials: ${err.message}</p>`;
      showToast(`Error: ${err.message}`, true);
    }
    generateMaterialsBtn.innerHTML = 'Generate Study Materials';
    generateMaterialsBtn.disabled = false;
  });

  downloadPdfBtn.addEventListener('click', () => {
    showToast('Preparing PDF...');
    const element = document.createElement('div');
    element.className = 'pdf-export-wrapper';
    element.innerHTML = pdfContent.innerHTML;
    html2pdf().set({
      margin: 0.5, filename: 'Study_Materials.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
      showToast('PDF Downloaded!');
    });
  });

  // ============================================================
  // NOTES SUMMARIZER (AI-powered)
  // ============================================================

  const notesInput = document.getElementById('notes-input');
  const summarizeBtn = document.getElementById('summarize-btn');
  const notesOutput = document.getElementById('notes-output');

  // Initialize notes file dropzone
  setupDropzone('notes-dropzone', 'notes-file', 'notes-file-info', (text) => {
    notesInput.value = text;
    showToast('Notes file loaded successfully!');
  }, () => {
    notesInput.value = '';
  });

  setupVoiceInput('notes-voice-btn', notesInput);

  summarizeBtn.addEventListener('click', async () => {
    const text = notesInput.value.trim();
    if (!text) return;

    summarizeBtn.innerHTML = '<span class="spinner"></span> Summarizing...';
    summarizeBtn.disabled = true;
    
    // Modern skeleton loader
    notesOutput.innerHTML = getSkeletonHtml(5);

    try {
      const result = await callApi('summarize', text);
      notesOutput.innerHTML = result;
      document.getElementById('download-summary-pdf-btn').classList.remove('hidden');
      showToast('Summary completed!');
    } catch (err) {
      notesOutput.innerHTML = `<span class="placeholder-text">Error: ${err.message}</span>`;
      showToast(`Error: ${err.message}`, true);
    }
    summarizeBtn.innerHTML = 'Summarize';
    summarizeBtn.disabled = false;
  });

  const downloadSummaryPdfBtn = document.getElementById('download-summary-pdf-btn');
  downloadSummaryPdfBtn.addEventListener('click', () => {
    showToast('Preparing PDF...');
    const element = document.createElement('div');
    element.style.padding = '30px';
    element.style.fontFamily = "'Outfit', sans-serif";
    element.style.color = '#1e293b';
    element.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #6d28d9; margin-bottom: 5px; font-weight: 700;">Nova Learn — AI Summary</h2>
        <p style="color: #64748b; margin: 0;">Extracted notes key topics and structured summary</p>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
        ${notesOutput.innerHTML}
      </div>
    `;
    html2pdf().set({
      margin: 0.5, filename: 'Notes_Summary.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
      showToast('Summary PDF Downloaded!');
    });
  });

  // ============================================================
  // FLASHCARDS
  // ============================================================

  const flashcard = document.getElementById('flashcard');
  const flipCardBtn = document.getElementById('flip-card-btn');
  const nextCardBtn = document.getElementById('next-card-btn');
  const prevCardBtn = document.getElementById('prev-card-btn');
  const fcQuestion = document.getElementById('fc-question');
  const fcAnswer = document.getElementById('fc-answer');
  const flashcardCounter = document.getElementById('flashcard-counter');
  const flashcardTopicInput = document.getElementById('flashcard-topic-input');
  const generateFlashcardsBtn = document.getElementById('generate-flashcards-btn');

  let deck = [
    { q: "What is the powerhouse of the cell?", a: "Mitochondria" },
    { q: "What does HTML stand for?", a: "HyperText Markup Language" },
    { q: "What is the capital of France?", a: "Paris" },
    { q: "In physics, what is the formula for Force?", a: "F = m × a (Force = Mass × Acceleration)" }
  ];
  let currentCardIdx = 0;

  setupVoiceInput('flashcard-voice-btn', flashcardTopicInput);

  function loadCard(idx) {
    flashcard.classList.remove('is-flipped');
    setTimeout(() => { fcQuestion.textContent = deck[idx].q; fcAnswer.textContent = deck[idx].a; }, 200);
    flashcardCounter.textContent = `Card ${idx + 1} of ${deck.length}`;
    if (deck.length > 0) {
      document.getElementById('download-flashcards-pdf-btn').classList.remove('hidden');
    }
  }

  flashcard.addEventListener('click', () => flashcard.classList.toggle('is-flipped'));
  flipCardBtn.addEventListener('click', () => flashcard.classList.toggle('is-flipped'));
  nextCardBtn.addEventListener('click', () => { currentCardIdx = (currentCardIdx + 1) % deck.length; loadCard(currentCardIdx); });
  prevCardBtn.addEventListener('click', () => { currentCardIdx = (currentCardIdx - 1 + deck.length) % deck.length; loadCard(currentCardIdx); });

  const downloadFlashcardsPdfBtn = document.getElementById('download-flashcards-pdf-btn');
  downloadFlashcardsPdfBtn.addEventListener('click', () => {
    showToast('Preparing PDF...');
    const element = document.createElement('div');
    element.style.padding = '30px';
    element.style.fontFamily = "'Outfit', sans-serif";
    element.style.color = '#1e293b';
    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #6d28d9; margin-bottom: 5px; font-weight: 700;">Nova Learn — Study Flashcards</h2>
        <p style="color: #64748b; margin: 0;">Interactive Q&A Study Material</p>
      </div>
    `;
    deck.forEach((card, index) => {
      html += `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
          <strong style="color: #6d28d9; font-size: 1.1rem; display: block; margin-bottom: 5px;">Flashcard ${index + 1}</strong>
          <div style="margin-bottom: 10px;"><strong>Question:</strong> ${card.q}</div>
          <div style="color: #334155;"><strong>Answer:</strong> ${card.a}</div>
        </div>
      `;
    });
    element.innerHTML = html;
    html2pdf().set({
      margin: 0.5, filename: 'Study_Flashcards.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
      showToast('Flashcards PDF Downloaded!');
    });
  });

  // Handle flashcard generation
  generateFlashcardsBtn.addEventListener('click', async () => {
    let topic = flashcardTopicInput.value.trim();
    
    // Resolve context: check user typed text or fallback to globally captured roadmap/dashboard contexts
    let context = topic;
    if (!context) {
      if (window.activeFlashcardContext) {
        context = window.activeFlashcardContext;
      } else if (window.lastSyllabusText) {
        context = window.lastSyllabusText;
      } else if (window.lastDashboardQuery) {
        context = window.lastDashboardQuery + (window.lastDashboardTextContent ? "\n\nFile contents: " + window.lastDashboardTextContent : "");
      }
    }

    if (!context) {
      showToast('Please enter a topic or generate a roadmap/dashboard query first.', true);
      return;
    }

    generateFlashcardsBtn.innerHTML = '<span class="spinner"></span> Generating...';
    generateFlashcardsBtn.disabled = true;

    // Pulse loader inside the card
    fcQuestion.innerHTML = `<div class="skeleton-line skeleton-pulse short" style="height:16px; margin:auto; width:60%;"></div>`;
    fcAnswer.innerHTML = `<div class="skeleton-line skeleton-pulse short" style="height:16px; margin:auto; width:60%;"></div>`;

    const promptText = `Generate a set of 5-8 educational flashcards based on this topic/context: "${context}". Return strictly valid JSON array representation ONLY. No markdown wrapper, no conversational headers. The format should be: [{"q": "Question here", "a": "Answer here"}]`;

    try {
      const result = await callApi('chat', promptText);
      let parsed;
      try { parsed = JSON.parse(result); } catch { parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]'); }

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid flashcard data received');

      deck = parsed;
      currentCardIdx = 0;
      loadCard(currentCardIdx);
      showToast('Flashcard deck generated!');
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
      // Fallback
      deck = [
        { q: "What is the powerhouse of the cell?", a: "Mitochondria" }
      ];
      currentCardIdx = 0;
      loadCard(currentCardIdx);
    }
    generateFlashcardsBtn.innerHTML = 'Generate Deck';
    generateFlashcardsBtn.disabled = false;
  });

  // ============================================================
  // AI EXPLAINER CHAT (AI-powered)
  // ============================================================

  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatHistory = document.getElementById('chat-history');
  const chatFile = document.getElementById('chat-file');
  const chatFileIndicator = document.getElementById('chat-file-indicator');
  
  let uploadedChatText = '';

  setupVoiceInput('chat-voice-btn', chatInput);

  // Handle document uploads for chat
  chatFile.addEventListener('change', async (e) => {
    if (chatFile.files.length) {
      const file = chatFile.files[0];
      chatFileIndicator.innerHTML = `
        <span>Context File: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>
        <button id="remove-chat-file-btn">&times;</button>
      `;
      chatFileIndicator.classList.remove('hidden');

      document.getElementById('remove-chat-file-btn').addEventListener('click', () => {
        chatFile.value = '';
        uploadedChatText = '';
        chatFileIndicator.classList.add('hidden');
        showToast('Context file removed');
      });

      try {
        uploadedChatText = await extractTextFromFile(file);
        showToast('Document uploaded as chat context!');
      } catch (err) {
        showToast('Error reading file: ' + err.message, true);
        chatFile.value = '';
        uploadedChatText = '';
        chatFileIndicator.classList.add('hidden');
      }
    }
  });

  const downloadChatPdfBtn = document.getElementById('download-chat-pdf-btn');

  function addPdfDownloadBtnToMessage(msgDiv, text) {
    if (msgDiv.querySelector('.download-msg-pdf-btn')) return;

    const btnWrapper = document.createElement('div');
    btnWrapper.style.marginTop = '10px';
    btnWrapper.style.display = 'flex';
    btnWrapper.style.justifyContent = 'flex-end';
    
    btnWrapper.innerHTML = `
      <button class="download-msg-pdf-btn" style="background: rgba(109, 40, 217, 0.1); border: none; color: var(--primary-color); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Download Response PDF
      </button>
    `;

    msgDiv.appendChild(btnWrapper);

    const btn = btnWrapper.querySelector('.download-msg-pdf-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('Preparing PDF...');
      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.fontFamily = "'Outfit', sans-serif";
      element.style.color = '#1e293b';
      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #6d28d9; margin-bottom: 5px; font-weight: 700;">Nova Learn — AI Response</h2>
          <p style="color: #64748b; margin: 0;">AI Study Buddy Explanation / Summary</p>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; line-height: 1.6; font-size: 1rem;">
          ${text}
        </div>
      `;
      html2pdf().set({
        margin: 0.5, filename: 'AI_Explanation_Summary.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).from(element).save().then(() => {
        showToast('PDF Downloaded!');
      });
    });
  }

  function addMessage(text, sender, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}${isLoading ? ' loading' : ''}`;
    msgDiv.innerHTML = `<p>${text}</p>`;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Show/hide download PDF button
    const messages = chatHistory.querySelectorAll('.message');
    if (messages.length > 1) {
      downloadChatPdfBtn.classList.remove('hidden');
    } else {
      downloadChatPdfBtn.classList.add('hidden');
    }

    if (sender === 'ai' && !isLoading) {
      addPdfDownloadBtnToMessage(msgDiv, text);
    }

    return msgDiv;
  }

  downloadChatPdfBtn.addEventListener('click', () => {
    showToast('Preparing PDF...');
    const element = document.createElement('div');
    element.style.padding = '30px';
    element.style.fontFamily = "'Outfit', sans-serif";
    element.style.color = '#1e293b';
    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #6d28d9; margin-bottom: 5px; font-weight: 700;">Nova Learn — AI Chat Explainer</h2>
        <p style="color: #64748b; margin: 0;">Interactive Q&A Session Transcript</p>
      </div>
    `;
    const messages = chatHistory.querySelectorAll('.message');
    messages.forEach((msg) => {
      if (msg.classList.contains('loading')) return;
      const isAi = msg.classList.contains('ai');
      const senderName = isAi ? 'AI Study Buddy' : 'Student';
      const bgColor = isAi ? '#f8fafc' : '#f1f5f9';
      const color = isAi ? '#6d28d9' : '#0f172a';
      const align = isAi ? 'left' : 'right';
      html += `
        <div style="margin-bottom: 15px; padding: 12px 15px; border-radius: 8px; background-color: ${bgColor}; border: 1px solid #e2e8f0; text-align: ${align};">
          <strong style="color: ${color}; display: block; margin-bottom: 5px;">${senderName}</strong>
          <div style="font-size: 0.95rem; line-height: 1.5;">${msg.querySelector('p')?.innerHTML || msg.innerHTML}</div>
        </div>
      `;
    });
    element.innerHTML = html;
    html2pdf().set({
      margin: 0.5, filename: 'Chat_Explainer_Transcript.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
      showToast('Chat PDF Downloaded!');
    });
  });

  chatSend.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text && !uploadedChatText) return;
    
    // Add user message
    const displayMessage = text || `Analyze the uploaded document: ${chatFile.files[0]?.name}`;
    addMessage(displayMessage, 'user');
    chatInput.value = '';
    chatSend.disabled = true;

    // Use skeleton loading design inside chat bubble
    const loadingMsg = addMessage(
      `<div class="skeleton-line skeleton-pulse short" style="height:12px; margin-bottom:6px;"></div>
       <div class="skeleton-line skeleton-pulse medium" style="height:12px; margin-bottom:6px;"></div>
       <div class="skeleton-line skeleton-pulse" style="height:12px;"></div>`, 
      'ai', 
      true
    );

    // Prefix user query with document context if uploaded
    let finalPrompt = text;
    if (uploadedChatText) {
      finalPrompt = `[CONTEXT FROM UPLOADED DOCUMENT: ${uploadedChatText}]\n\nUser Question/Instruction: ${text || 'Summarize and explain the key concepts of this document.'}`;
    }

    try {
      const result = await callApi('chat', finalPrompt);
      loadingMsg.innerHTML = `<p>${result}</p>`;
      loadingMsg.classList.remove('loading');
      addPdfDownloadBtnToMessage(loadingMsg, result);
    } catch (err) {
      loadingMsg.innerHTML = `<p>Sorry, I couldn't process that. ${err.message}</p>`;
      loadingMsg.classList.remove('loading');
    }
    chatSend.disabled = false;
  });

  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') chatSend.click(); });

  // ============================================================
  // QUIZ ENGINE (AI-powered, multi-question)
  // ============================================================

  const quizSetup = document.getElementById('quiz-setup');
  const quizTopicInput = document.getElementById('quiz-topic-input');
  const generateQuizBtn = document.getElementById('generate-quiz-btn');
  const quizArea = document.getElementById('quiz-area');
  const quizResults = document.getElementById('quiz-results');
  const questionText = document.getElementById('question-text');
  const quizProgress = document.getElementById('quiz-progress');
  const quizOptions = document.getElementById('quiz-options');
  const nextQuestionBtn = document.getElementById('next-question-btn');
  const retakeQuizBtn = document.getElementById('retake-quiz-btn');
  const scoreCircle = document.getElementById('score-circle');
  const resultsTextEl = document.getElementById('results-text');
  const quizFile = document.getElementById('quiz-file');
  const quizFileInfo = document.getElementById('quiz-file-info');
  const quizSkeleton = document.getElementById('quiz-skeleton');

  let quizUploadedText = '';

  // Setup quiz dropzone
  setupDropzone('quiz-dropzone', 'quiz-file', 'quiz-file-info', (text) => {
    quizUploadedText = text;
    showToast('Quiz study material loaded!');
  }, () => {
    quizUploadedText = '';
  });

  setupVoiceInput('quiz-voice-btn', quizTopicInput);

  let quizData = [];
  let currentQ = 0;
  let score = 0;
  let answered = false;

  function renderQuestion() {
    const q = quizData[currentQ];
    questionText.textContent = q.question;
    quizProgress.textContent = `Question ${currentQ + 1} of ${quizData.length}`;
    quizOptions.innerHTML = '';
    answered = false;
    nextQuestionBtn.classList.add('hidden');

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn outline option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        q.userAnswer = i; // Save user selection
        if (i === q.correct) { btn.classList.add('correct'); score++; showToast('Correct!'); }
        else {
          btn.classList.add('wrong');
          quizOptions.children[q.correct].classList.add('correct');
          showToast('Incorrect.');
        }
        nextQuestionBtn.classList.remove('hidden');
      });
      quizOptions.appendChild(btn);
    });
  }

  generateQuizBtn.addEventListener('click', async () => {
    const topic = quizTopicInput.value.trim();
    if (!topic && !quizUploadedText) {
      showToast('Please enter a topic or upload a document.', true);
      return;
    }

    generateQuizBtn.innerHTML = '<span class="spinner"></span> Generating...';
    generateQuizBtn.disabled = true;

    // Show skeleton loader and hide active setups/areas
    quizSkeleton.innerHTML = getSkeletonHtml(4);
    quizSkeleton.classList.remove('hidden');
    quizSetup.classList.add('hidden');
    quizArea.classList.add('hidden');
    quizResults.classList.add('hidden');

    let finalPrompt = topic;
    if (quizUploadedText) {
      finalPrompt = `[CONTEXT DOCUMENT: ${quizUploadedText}]\n\nGenerate a quiz based on this document. User request: ${topic || 'Generate a quiz on the key concepts.'}`;
    }

    try {
      const result = await callApi('quiz', finalPrompt);
      let parsed;
      try { parsed = JSON.parse(result); } catch { parsed = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]'); }

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid quiz data');

      quizData = parsed;
      currentQ = 0; score = 0;

      // Hide skeleton, reveal main quiz area (leaving elements intact)
      quizSkeleton.classList.add('hidden');
      quizArea.classList.remove('hidden');

      renderQuestion();
      showToast('Quiz generated!');
    } catch (err) {
      quizSkeleton.classList.add('hidden');
      quizSetup.classList.remove('hidden');
      quizArea.classList.add('hidden');
      showToast(`Error: ${err.message}`, true);
    }
    generateQuizBtn.innerHTML = 'Generate Quiz';
    generateQuizBtn.disabled = false;
  });

  nextQuestionBtn.addEventListener('click', () => {
    currentQ++;
    if (currentQ < quizData.length) {
      renderQuestion();
    } else {
      // Show results
      quizArea.classList.add('hidden');
      quizResults.classList.remove('hidden');
      const pct = Math.round((score / quizData.length) * 100);
      scoreCircle.textContent = `${pct}%`;
      resultsTextEl.textContent = `You scored ${score} out of ${quizData.length}`;
      // Track quiz count
      const cnt = parseInt(localStorage.getItem('sb_quizCount') || '0');
      localStorage.setItem('sb_quizCount', cnt + 1);
      updateStats();
    }
  });

  retakeQuizBtn.addEventListener('click', () => {
    quizResults.classList.add('hidden');
    quizSetup.classList.remove('hidden');
    quizTopicInput.value = '';
  });

  const downloadQuizPdfBtn = document.getElementById('download-quiz-pdf-btn');
  downloadQuizPdfBtn.addEventListener('click', () => {
    showToast('Preparing PDF...');
    const element = document.createElement('div');
    element.style.padding = '30px';
    element.style.fontFamily = "'Outfit', sans-serif";
    element.style.color = '#1e293b';
    
    const pct = Math.round((score / quizData.length) * 100);
    let html = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #6d28d9; margin-bottom: 5px; font-weight: 700;">Nova Learn — Quiz Report</h2>
        <p style="color: #64748b; margin: 0 0 15px;">Your test performance details</p>
        <div style="display: inline-block; padding: 15px 25px; background-color: #6d28d9; color: white; border-radius: 50px; font-size: 1.5rem; font-weight: 700; margin-bottom: 20px;">
          Score: ${score} / ${quizData.length} (${pct}%)
        </div>
      </div>
      <div style="margin-top: 20px;">
    `;

    quizData.forEach((q, idx) => {
      const isCorrect = q.userAnswer === q.correct;
      const cardBg = isCorrect ? '#f0fdf4' : '#fef2f2';
      const cardBorder = isCorrect ? '#bbf7d0' : '#fecaca';
      const headerColor = isCorrect ? '#166534' : '#991b1b';

      html += `
        <div style="margin-bottom: 20px; padding: 20px; border: 1px solid ${cardBorder}; border-radius: 10px; background-color: ${cardBg};">
          <h4 style="color: ${headerColor}; margin: 0 0 10px; font-size: 1.05rem; font-weight: 600;">Question ${idx + 1}: ${q.question}</h4>
          <ul style="list-style-type: none; padding-left: 0; margin: 0 0 10px 0;">
      `;

      q.options.forEach((opt, oIdx) => {
        let suffix = '';
        let optStyle = 'padding: 8px 12px; margin-bottom: 5px; border-radius: 6px; font-size: 0.95rem;';
        
        if (oIdx === q.correct) {
          optStyle += ' background-color: #dcfce7; border: 1px solid #86efac; color: #14532d; font-weight: 600;';
          suffix = ' (Correct Answer)';
        } else if (oIdx === q.userAnswer) {
          optStyle += ' background-color: #fee2e2; border: 1px solid #fca5a5; color: #7f1d1d;';
          suffix = ' (Your Answer)';
        } else {
          optStyle += ' color: #475569;';
        }

        html += `<li style="${optStyle}">${opt}${suffix}</li>`;
      });

      html += `
          </ul>
        </div>
      `;
    });

    html += `</div>`;
    element.innerHTML = html;

    html2pdf().set({
      margin: 0.5, filename: 'Quiz_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
      showToast('Quiz Report PDF Downloaded!');
    });
  });

  // Show settings modal on first visit if no AI configured
  if (!isAiConfigured()) {
    setTimeout(() => openSettingsModal(), 800);
  }

});
