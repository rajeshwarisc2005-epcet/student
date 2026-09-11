import { parseResumeFile } from './parser.js';
import { analyzeResume } from './analyzer.js';
import { generateAiResumeReview, askAiCoach, getApiKey, saveApiKey } from './ai.js';

// Application State
const state = {
  currentResumeText: '',
  currentFileName: '',
  currentJobDescription: '',
  analysisResults: null,
  activeTab: 'upload',
  simulatedScore: null,
  activeBoosts: {
    verbs: false,
    metrics: false,
    sections: false,
    skills: new Set()
  },
  activeCvTheme: 'modern',
  activeCvColor: 'indigo',
  coachHistory: []
};

// Audio FX disabled
const AtsAudio = {
  click() {},
  hover() {},
  laserStep() {},
  success() {}
};

document.addEventListener('DOMContentLoaded', () => {
  initPdfWorker();
  initIcons();
  initTheme();
  bindEvents();
  initAiCoachDrawer();
  initCrossHighlighting();
  initCvStudio();
});

function initPdfWorker() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

function initIcons() { 
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('ats_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
    initIcons();
  }
}


function bindEvents() {
  // Theme Toggle
  const themeBtn = document.getElementById('themeToggleBtn');
  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ats_theme', next);
    updateThemeIcon(next);
  });

  // Input Tab Switching (Upload vs Paste)
  const tabUpload = document.getElementById('tabUploadFile');
  const tabPaste = document.getElementById('tabPasteText');
  const panelUpload = document.getElementById('panelUploadFile');
  const panelPaste = document.getElementById('panelPasteText');

  tabUpload.addEventListener('click', () => {
    tabUpload.classList.add('active');
    tabPaste.classList.remove('active');
    panelUpload.style.display = 'block';
    panelPaste.style.display = 'none';
    state.activeTab = 'upload';
  });

  tabPaste.addEventListener('click', () => {
    tabPaste.classList.add('active');
    tabUpload.classList.remove('active');
    panelUpload.style.display = 'none';
    panelPaste.style.display = 'block';
    state.activeTab = 'paste';
  });

  // File Upload Drag & Drop
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Remove active file
  document.getElementById('btnRemoveFile').addEventListener('click', () => {
    state.currentResumeText = '';
    state.currentFileName = '';
    fileInput.value = '';
    document.getElementById('fileLoadedBanner').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
  });

  // Raw text area input
  const resumeTextarea = document.getElementById('resumeRawText');
  resumeTextarea.addEventListener('input', (e) => {
    state.currentResumeText = e.target.value;
    updateResumeWordCount(e.target.value);
  });

  document.getElementById('btnClearResumeText').addEventListener('click', () => {
    resumeTextarea.value = '';
    state.currentResumeText = '';
    updateResumeWordCount('');
  });

  // Job description area input
  const jdTextarea = document.getElementById('jobDescriptionText');
  jdTextarea.addEventListener('input', (e) => {
    state.currentJobDescription = e.target.value;
    updateJdWordCount(e.target.value);
  });

  document.getElementById('btnClearJD').addEventListener('click', () => {
    jdTextarea.value = '';
    state.currentJobDescription = '';
    updateJdWordCount('');
  });

  // Analyze Button
  document.getElementById('btnAnalyze').addEventListener('click', () => {
    executeAnalysis();
  });

  // Dashboard Tab Switching
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.getAttribute('data-tab'));
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // Print & Reset Buttons
  document.getElementById('btnExportPrint').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btnResetAll').addEventListener('click', () => {
    state.currentResumeText = '';
    state.currentFileName = '';
    state.currentJobDescription = '';
    fileInput.value = '';
    resumeTextarea.value = '';
    jdTextarea.value = '';
    updateResumeWordCount('');
    updateJdWordCount('');
    document.getElementById('fileLoadedBanner').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('resultsDashboard').style.display = 'none';
  });

  // Copy parsed raw text
  document.getElementById('btnCopyRawText').addEventListener('click', () => {
    navigator.clipboard.writeText(state.currentResumeText).then(() => {
      const btn = document.getElementById('btnCopyRawText');
      btn.innerHTML = '<i data-lucide="check" style="width: 14px;"></i> Copied!';
      initIcons();
      setTimeout(() => {
        btn.innerHTML = '<i data-lucide="copy" style="width: 14px;"></i> Copy Text';
        initIcons();
      }, 2000);
    });
  });

  // API Key Modal Controls
  const apiKeyModal = document.getElementById('apiKeyModal');
  const btnOpenApiKeyModal = document.getElementById('btnOpenApiKeyModal');
  const btnCloseApiKeyModal = document.getElementById('btnCloseApiKeyModal');
  const btnSaveApiKeyModal = document.getElementById('btnSaveApiKeyModal');
  const inputApiKeyModal = document.getElementById('inputApiKeyModal');
  const apiKeyStatus = document.getElementById('apiKeyStatus');

  const initialKey = getApiKey();
  if (initialKey) {
    inputApiKeyModal.value = initialKey;
    apiKeyStatus.textContent = 'Connected';
    apiKeyStatus.style.color = 'var(--success)';
  } else {
    apiKeyStatus.textContent = 'Setup Key';
    apiKeyStatus.style.color = 'var(--warning)';
  }

  btnOpenApiKeyModal.addEventListener('click', () => {
    inputApiKeyModal.value = getApiKey();
    apiKeyModal.style.display = 'flex';
  });

  btnCloseApiKeyModal.addEventListener('click', () => {
    apiKeyModal.style.display = 'none';
  });

  apiKeyModal.addEventListener('click', (e) => {
    if (e.target === apiKeyModal) {
      apiKeyModal.style.display = 'none';
    }
  });

  btnSaveApiKeyModal.addEventListener('click', () => {
    const key = inputApiKeyModal.value.trim();
    saveApiKey(key);
    apiKeyModal.style.display = 'none';
    if (key) {
      apiKeyStatus.textContent = 'Connected';
      apiKeyStatus.style.color = 'var(--success)';
    } else {
      apiKeyStatus.textContent = 'Setup Key';
      apiKeyStatus.style.color = 'var(--warning)';
    }
  });

  // Generate AI Review Button
  const btnGenerateAi = document.getElementById('btnGenerateAiReview');
  btnGenerateAi.addEventListener('click', async () => {
    const resumeText = state.currentResumeText || document.getElementById('resumeRawText').value;
    const jdText = state.currentJobDescription || document.getElementById('jobDescriptionText').value;

    if (!resumeText || resumeText.trim().length < 40) {
      alert("Please upload or paste your resume text first.");
      return;
    }

    const key = getApiKey();
    if (!key) {
      apiKeyModal.style.display = 'flex';
      return;
    }

    btnGenerateAi.disabled = true;
    btnGenerateAi.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Consulting Groq LLM...';
    initIcons();

    try {
      const reviewMarkdown = await generateAiResumeReview(resumeText, jdText);
      renderAiReview(reviewMarkdown);
    } catch (err) {
      alert("AI Review Error: " + err.message);
    } finally {
      btnGenerateAi.disabled = false;
      btnGenerateAi.innerHTML = '<i data-lucide="sparkles" style="width: 16px;"></i> Re-generate Review';
      initIcons();
    }
  });

  // Copy AI Review
  document.getElementById('btnCopyAiReview').addEventListener('click', () => {
    const content = document.getElementById('aiReviewContent').innerText;
    navigator.clipboard.writeText(content).then(() => {
      const btn = document.getElementById('btnCopyAiReview');
      btn.innerHTML = '<i data-lucide="check" style="width: 14px;"></i> Copied!';
      initIcons();
      setTimeout(() => {
        btn.innerHTML = '<i data-lucide="copy" style="width: 14px;"></i> Copy Review';
        initIcons();
      }, 2000);
    });
  });
}

function renderAiReview(markdown) {
  document.getElementById('aiReviewPlaceholder').style.display = 'none';
  const resultCard = document.getElementById('aiReviewResultCard');
  resultCard.style.display = 'block';

  // Format simple markdown into clean HTML
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br />');

  // Wrap loose <li> tags into <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');

  document.getElementById('aiReviewContent').innerHTML = `<p>${html}</p>`;
  initIcons();
}


async function handleFileUpload(file) {
  const overlay = document.getElementById('dropScanningOverlay');
  const statusText = document.getElementById('scanningStatusText');
  const step1 = document.getElementById('scanStep1');
  const step2 = document.getElementById('scanStep2');
  const step3 = document.getElementById('scanStep3');
  const step4 = document.getElementById('scanStep4');

  try {
    if (overlay) {
      overlay.style.display = 'flex';
      AtsAudio.laserStep(1);
      [step1, step2, step3, step4].forEach(s => s && s.classList.remove('active'));
      if (step1) step1.classList.add('active');
      if (statusText) statusText.textContent = "Extracting Document Text & Layout...";
    }

    // Step 1 delay
    await new Promise(r => setTimeout(r, 220));
    if (step2) {
      step2.classList.add('active');
      AtsAudio.laserStep(2);
      if (statusText) statusText.textContent = "Auditing 60+ Hard & Soft Skill Taxonomies...";
    }

    const textPromise = parseResumeFile(file);
    await new Promise(r => setTimeout(r, 200));

    if (step3) {
      step3.classList.add('active');
      AtsAudio.laserStep(3);
      if (statusText) statusText.textContent = "Evaluating Power Action Verbs & Metrics...";
    }

    const text = await textPromise;
    state.currentResumeText = text;
    state.currentFileName = file.name;

    if (step4) {
      step4.classList.add('active');
      AtsAudio.laserStep(4);
      if (statusText) statusText.textContent = "Calculating 5-Axis ATS Radar & Scoring...";
    }
    await new Promise(r => setTimeout(r, 200));

    if (overlay) overlay.style.display = 'none';

    // Update banner
    document.getElementById('loadedFileName').textContent = file.name;
    document.getElementById('loadedFileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    document.getElementById('fileLoadedBanner').style.display = 'flex';
    document.getElementById('dropZone').style.display = 'none';

    // Also populate textarea
    document.getElementById('resumeRawText').value = text;
    updateResumeWordCount(text);

    AtsAudio.success();
    showAtsToast(`Successfully parsed ${file.name}`, 'file-check');

    // Automatically trigger analysis
    executeAnalysis();
  } catch (err) {
    if (overlay) overlay.style.display = 'none';
    alert("Error parsing file: " + err.message);
    showAtsToast("Error reading file: " + err.message, "alert-triangle");
  }
}

function updateResumeWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('resumeWordCountDisplay').textContent = `${words} words`;
}

function updateJdWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('jdWordCountDisplay').textContent = `${words} words`;
}

function executeAnalysis() {
  const resumeText = state.currentResumeText || document.getElementById('resumeRawText').value;
  const jdText = state.currentJobDescription || document.getElementById('jobDescriptionText').value;

  if (!resumeText || resumeText.trim().length < 40) {
    alert("Please upload a resume or paste at least 40 characters of resume text to analyze.");
    return;
  }

  const results = analyzeResume(resumeText, jdText);
  state.analysisResults = results;

  // Reveal Dashboard
  const dashboard = document.getElementById('resultsDashboard');
  dashboard.style.display = 'flex';

  // Smooth scroll to dashboard
  dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 1. Render Gauge & Score
  animateGauge(results.scores.total);
  document.getElementById('displayVerdict').textContent = results.scores.verdict;
  document.getElementById('displayVerdict').style.color = results.scores.verdictColor;

  let summary = `Your resume scored ${results.scores.total}/100. `;
  if (results.scores.total >= 85) {
    summary += "Outstanding! Your resume has strong quantifiable metrics, standard ATS headers, and power action verbs.";
    if (window.confetti) {
      window.confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
  } else if (results.scores.total >= 70) {
    summary += "Good foundation. Adding more quantified achievements and mirroring key job keywords will boost pass rate.";
  } else {
    summary += "Several critical ATS flags detected. Replace passive language, add measurable results, and include standard sections.";
  }
  document.getElementById('displaySummary').textContent = summary;

  // 2. Render Stat Cards
  // Job Match
  if (results.jdMatch) {
    document.getElementById('statJdMatch').textContent = `${results.jdMatch.matchRate}%`;
    document.getElementById('statJdMatchBar').style.width = `${results.jdMatch.matchRate}%`;
    document.getElementById('statJdNotes').textContent = `${results.jdMatch.matched.length} of ${results.jdMatch.jdSkillsCount} required skills detected`;
  } else {
    document.getElementById('statJdMatch').textContent = 'N/A';
    document.getElementById('statJdMatchBar').style.width = '0%';
    document.getElementById('statJdNotes').textContent = 'Paste a Job Description for exact skill alignment';
  }

  // Power Verbs
  document.getElementById('statPowerVerbs').textContent = results.verbsAnalysis.powerVerbsCount;
  const verbsPct = Math.min(100, results.verbsAnalysis.powerVerbsCount * 12);
  document.getElementById('statVerbsBar').style.width = `${verbsPct}%`;
  document.getElementById('statVerbsNotes').textContent = `${results.verbsAnalysis.powerVerbsCount} power verbs found, ${results.verbsAnalysis.weakPhrasesCount} passive phrases`;

  // Quantified Impact
  document.getElementById('statMetrics').textContent = `${results.metricsAnalysis.metricPercentage}%`;
  document.getElementById('statMetricsBar').style.width = `${results.metricsAnalysis.metricPercentage}%`;
  document.getElementById('statMetricsNotes').textContent = `${results.metricsAnalysis.quantifiedBullets} of ${results.metricsAnalysis.bulletCount} bullets contain numbers or %`;

  // Word Count
  document.getElementById('statWordCount').textContent = `${results.wordCount} words`;
  document.getElementById('statReadabilityBar').style.width = `${results.readability.lengthScore}%`;
  document.getElementById('statReadabilityNotes').textContent = `${results.readability.lengthStatus} (~${results.readability.estimatedPages} pages)`;

  // 3. Render Radar Chart
  renderRadarChart(results);

  // 4. Initialize Score Simulator
  initScoreSimulator(results);

  // 5. Render Match & Skills
  renderSkillsPanel(results);

  // 6. Render ATS Checklist
  renderChecklist(results);

  // 7. Render Bullet Optimizer
  renderBulletSuggestions(results.bulletSuggestions);

  // 8. Render Interview Questions
  renderInterviewQuestions(results.interviewQuestions);

  // 9. Render Raw Text Panel & Highlighting
  renderRawTextDisplay(resumeText);

  // 10. Render Formatted CV Preview
  renderCvPreview(resumeText, results);

  initIcons();
}

function animateGauge(finalScore) {
  const meter = document.getElementById('gaugeMeter');
  const scoreDisplay = document.getElementById('displayScore');
  const maxCircumference = 565; // 2 * PI * 90 approx

  const targetOffset = maxCircumference - (maxCircumference * finalScore) / 100;
  meter.style.strokeDashoffset = targetOffset;

  let current = 0;
  const duration = 1000;
  const stepTime = 20;
  const increment = finalScore / (duration / stepTime);

  const timer = setInterval(() => {
    current += increment;
    if (current >= finalScore) {
      scoreDisplay.textContent = Math.round(finalScore);
      clearInterval(timer);
    } else {
      scoreDisplay.textContent = Math.round(current);
    }
  }, stepTime);
}

/**
 * 5-Axis ATS Radar Chart Renderer
 */
function renderRadarChart(results) {
  const svg = document.getElementById('atsRadarSvg');
  const tooltip = document.getElementById('radarTooltip');
  if (!svg) return;

  const cx = 160;
  const cy = 135;
  const radius = 80;

  // Calculate 5 Dimension Normalized Scores (0-100)
  const hardSkillsScore = Math.min(100, Math.round((results.detectedSkills.totalFound / 12) * 100));
  const powerVerbsScore = Math.min(100, Math.round((results.verbsAnalysis.powerVerbsCount / 8) * 100));
  const metricsScore = results.metricsAnalysis.metricPercentage;
  
  const sectionsPassed = [
    results.sections.experience,
    results.sections.skills,
    results.sections.education,
    results.sections.summary
  ].filter(Boolean).length;
  const headersScore = Math.round((sectionsPassed / 4) * 100);
  const readabilityScore = results.readability.lengthScore;

  const axes = [
    { label: 'Hard Skills', score: hardSkillsScore, note: `${results.detectedSkills.totalFound} skills detected` },
    { label: 'Action Verbs', score: powerVerbsScore, note: `${results.verbsAnalysis.powerVerbsCount} power verbs` },
    { label: 'Impact Metrics', score: metricsScore, note: `${metricsScore}% quantified` },
    { label: 'ATS Headers', score: headersScore, note: `${sectionsPassed}/4 sections present` },
    { label: 'Readability', score: readabilityScore, note: `${results.wordCount} words (${results.readability.estimatedPages} p.)` }
  ];

  const totalAxes = axes.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  let svgContent = `
    <defs>
      <linearGradient id="radarAreaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.2" />
      </linearGradient>
      <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#6366f1" flood-opacity="0.5"/>
      </filter>
    </defs>
  `;

  // Concentric polygon grid levels: 25%, 50%, 75%, 100%
  [0.25, 0.5, 0.75, 1.0].forEach(level => {
    const gridPoints = axes.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + radius * level * Math.cos(angle);
      const y = cy + radius * level * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    svgContent += `<polygon points="${gridPoints}" class="radar-grid-polygon radar-grid-poly" fill="none" stroke="rgba(255, 255, 255, 0.14)" stroke-width="1" />`;
  });

  // Spokes & Labels
  axes.forEach((axis, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    svgContent += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-spoke radar-axis-line" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1" stroke-dasharray="3,3" />`;

    // Position text label outside vertex
    const labelRadius = radius + 24;
    const lx = cx + labelRadius * Math.cos(angle);
    const ly = cy + labelRadius * Math.sin(angle);

    let textAnchor = 'middle';
    if (Math.cos(angle) > 0.3) textAnchor = 'start';
    if (Math.cos(angle) < -0.3) textAnchor = 'end';

    svgContent += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="radar-axis-label" text-anchor="${textAnchor}" dominant-baseline="central" fill="var(--text-secondary, #94a3b8)">${axis.label}</text>`;
  });

  // Data Polygon
  const dataPointsArr = axes.map((axis, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const factor = Math.max(0.12, Math.min(1.0, axis.score / 100));
    const x = cx + radius * factor * Math.cos(angle);
    const y = cy + radius * factor * Math.sin(angle);
    return { x, y, axis };
  });

  const pointsString = dataPointsArr.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  svgContent += `<polygon points="${pointsString}" class="radar-polygon radar-data-poly" fill="url(#radarAreaGradient)" stroke="#6366f1" stroke-width="2.5" filter="url(#radarGlow)" />`;

  // Interactive Dots
  dataPointsArr.forEach((p) => {
    svgContent += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" class="radar-dot radar-node-circle" fill="#ffffff" stroke="#06b6d4" stroke-width="2.5" data-label="${p.axis.label}" data-score="${p.axis.score}" data-note="${p.axis.note}" style="cursor: pointer;" />`;
  });

  svg.innerHTML = svgContent;

  // Bind tooltip interactions
  const dots = svg.querySelectorAll('.radar-dot');
  dots.forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      AtsAudio.hover();
      const label = dot.getAttribute('data-label');
      const score = dot.getAttribute('data-score');
      const note = dot.getAttribute('data-note');

      tooltip.innerHTML = `<strong>${label}: ${score}/100</strong><br><small style="color: var(--text-muted);">${note}</small>`;
      tooltip.style.display = 'block';

      const containerRect = svg.parentElement.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const left = dotRect.left - containerRect.left + dotRect.width / 2;
      const top = dotRect.top - containerRect.top;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top - 8}px`;
    });

    dot.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}

/**
 * Interactive "What-If" Live Score Simulator
 */
function initScoreSimulator(results) {
  const baseScore = results.scores.total;
  state.simulatedScore = baseScore;
  state.activeBoosts = {
    verbs: false,
    metrics: false,
    sections: false,
    skills: new Set()
  };

  const projectedScoreElem = document.getElementById('simProjectedScore');
  projectedScoreElem.textContent = baseScore;

  const btnVerbs = document.getElementById('simToggleVerbs');
  const btnMetrics = document.getElementById('simToggleMetrics');
  const btnSections = document.getElementById('simToggleSections');
  const missingWrap = document.getElementById('simMissingSkillsWrap');
  const missingPills = document.getElementById('simMissingSkillsPills');
  const btnApply = document.getElementById('btnApplySimulation');
  const btnReset = document.getElementById('btnResetSimulation');

  // Reset toggle UI states
  [btnVerbs, btnMetrics, btnSections].forEach(btn => btn.classList.remove('active'));

  // Missing skills pills
  if (results.jdMatch && results.jdMatch.missing.length > 0) {
    missingWrap.style.display = 'block';
    missingPills.innerHTML = results.jdMatch.missing.slice(0, 8).map(skill => `
      <button class="sim-skill-pill" data-skill="${escapeHtml(skill)}">
        + ${escapeHtml(skill)}
      </button>
    `).join('');

    missingPills.querySelectorAll('.sim-skill-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        AtsAudio.click();
        const skill = pill.getAttribute('data-skill');
        if (state.activeBoosts.skills.has(skill)) {
          state.activeBoosts.skills.delete(skill);
          pill.classList.remove('active');
        } else {
          state.activeBoosts.skills.add(skill);
          pill.classList.add('active');
        }
        recalculateSimulation(baseScore);
      });
    });
  } else {
    missingWrap.style.display = 'none';
    missingPills.innerHTML = '';
  }

  // Toggle handlers
  btnVerbs.onclick = () => {
    AtsAudio.click();
    state.activeBoosts.verbs = !state.activeBoosts.verbs;
    btnVerbs.classList.toggle('active', state.activeBoosts.verbs);
    recalculateSimulation(baseScore);
  };

  btnMetrics.onclick = () => {
    AtsAudio.click();
    state.activeBoosts.metrics = !state.activeBoosts.metrics;
    btnMetrics.classList.toggle('active', state.activeBoosts.metrics);
    recalculateSimulation(baseScore);
  };

  btnSections.onclick = () => {
    AtsAudio.click();
    state.activeBoosts.sections = !state.activeBoosts.sections;
    btnSections.classList.toggle('active', state.activeBoosts.sections);
    recalculateSimulation(baseScore);
  };

  btnApply.onclick = () => {
    AtsAudio.success();
    animateGauge(state.simulatedScore);
    if (window.confetti && state.simulatedScore >= 80) {
      window.confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
    }
    showAtsToast(`Simulated score of ${state.simulatedScore}/100 applied to gauge!`, "zap");
  };

  btnReset.onclick = () => {
    AtsAudio.click();
    state.activeBoosts.verbs = false;
    state.activeBoosts.metrics = false;
    state.activeBoosts.sections = false;
    state.activeBoosts.skills.clear();
    [btnVerbs, btnMetrics, btnSections].forEach(b => b.classList.remove('active'));
    missingPills.querySelectorAll('.sim-skill-pill').forEach(p => p.classList.remove('active'));
    recalculateSimulation(baseScore);
    animateGauge(baseScore);
    showAtsToast("Simulation reset to original score", "rotate-ccw");
  };
}

function recalculateSimulation(baseScore) {
  let boost = 0;
  if (state.activeBoosts.verbs) boost += 8;
  if (state.activeBoosts.metrics) boost += 12;
  if (state.activeBoosts.sections) boost += 5;
  boost += state.activeBoosts.skills.size * 3;

  state.simulatedScore = Math.min(100, Math.max(0, baseScore + boost));
  const scoreElem = document.getElementById('simProjectedScore');
  if (scoreElem) {
    scoreElem.textContent = state.simulatedScore;
  }
}

/**
 * Cross-Highlighting in Extracted Text
 */
function initCrossHighlighting() {
  const searchInput = document.getElementById('inputHighlightFilter');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    highlightExtractedText(query);
  });
}

function renderRawTextDisplay(text) {
  const container = document.getElementById('highlightedTextDisplay');
  if (container) {
    container.textContent = text;
  }
}

function highlightExtractedText(query) {
  const container = document.getElementById('highlightedTextDisplay');
  const countBadge = document.getElementById('highlightMatchCount');
  if (!container) return;

  const rawText = state.currentResumeText || '';
  if (!query || query.length < 2) {
    container.textContent = rawText;
    if (countBadge) countBadge.style.display = 'none';
    return;
  }

  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const matches = rawText.match(regex);
    const count = matches ? matches.length : 0;

    if (countBadge) {
      countBadge.textContent = `${count} match${count === 1 ? '' : 'es'}`;
      countBadge.style.display = 'inline-block';
      countBadge.style.background = count > 0 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      countBadge.style.color = count > 0 ? 'var(--accent-secondary)' : 'var(--danger)';
    }

    const highlighted = rawText.replace(regex, '<mark class="kw-mark active-glow">$1</mark>');
    container.innerHTML = highlighted;

    // Scroll to first mark
    const firstMark = container.querySelector('mark');
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (e) {
    container.textContent = rawText;
  }
}

function jumpToKeywordInRawText(keyword) {
  // 1. Switch to raw text tab
  const tabBtn = document.querySelector('.nav-tab[data-tab="tabRaw"]');
  if (tabBtn) tabBtn.click();

  // 2. Put in search bar
  const searchInput = document.getElementById('inputHighlightFilter');
  if (searchInput) {
    searchInput.value = keyword;
  }

  // 3. Highlight
  highlightExtractedText(keyword);
  showAtsToast(`Highlighted "${keyword}" in parsed resume text`, "search");
}

function renderSkillsPanel(results) {
  const matchedContainer = document.getElementById('matchedSkillsContainer');
  const missingContainer = document.getElementById('missingSkillsContainer');
  const matchedCount = document.getElementById('matchedSkillsCount');
  const missingCount = document.getElementById('missingSkillsCount');

  if (results.jdMatch) {
    matchedCount.textContent = results.jdMatch.matched.length;
    missingCount.textContent = results.jdMatch.missing.length;

    if (results.jdMatch.matched.length > 0) {
      matchedContainer.innerHTML = results.jdMatch.matched
        .map(skill => `
          <span class="keyword-chip matched interactive-skill-pill" data-keyword="${escapeHtml(skill)}" title="Click to locate in extracted text">
            <i data-lucide="check" style="width: 13px;"></i> ${escapeHtml(skill)}
          </span>
        `)
        .join('');
    } else {
      matchedContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No direct keyword matches found.</span>';
    }

    if (results.jdMatch.missing.length > 0) {
      missingContainer.innerHTML = results.jdMatch.missing
        .map(skill => `
          <span class="keyword-chip missing interactive-skill-pill" data-keyword="${escapeHtml(skill)}" title="Required by JD but missing">
            <i data-lucide="plus" style="width: 13px;"></i> ${escapeHtml(skill)}
          </span>
        `)
        .join('');
    } else {
      missingContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--success);">100% of required skills present!</span>';
    }
  } else {
    matchedCount.textContent = results.detectedSkills.totalFound;
    missingCount.textContent = 0;
    matchedContainer.innerHTML = results.detectedSkills.all.slice(0, 16)
      .map(skill => `
        <span class="keyword-chip neutral interactive-skill-pill" data-keyword="${escapeHtml(skill)}" title="Click to locate in extracted text">
          ${escapeHtml(skill)}
        </span>
      `)
      .join('');
    missingContainer.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Paste a Job Description to discover missing skills.</span>';
  }

  // Bind click-to-highlight on all skill pills
  document.querySelectorAll('.interactive-skill-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      AtsAudio.click();
      const kw = pill.getAttribute('data-keyword');
      jumpToKeywordInRawText(kw);
    });
  });

  // All detected categories
  const catContainer = document.getElementById('allDetectedSkillsContainer');
  catContainer.innerHTML = '';

  const prettyCategoryNames = {
    frontend: "Frontend Development",
    backend: "Backend & Systems",
    cloud_devops: "Cloud & DevOps Infrastructure",
    databases: "Databases & Storage",
    data_ai: "Data, Analytics & Machine Learning",
    soft_skills: "Professional & Soft Skills"
  };

  for (const [cat, skills] of Object.entries(results.detectedSkills.categories)) {
    if (skills.length > 0) {
      const row = document.createElement('div');
      row.style.background = 'var(--bg-surface)';
      row.style.padding = '0.85rem 1rem';
      row.style.borderRadius = 'var(--radius-sm)';
      row.style.border = '1px solid var(--border-subtle)';

      row.innerHTML = `
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">
          ${prettyCategoryNames[cat] || cat} (${skills.length})
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
          ${skills.map(s => `
            <span class="format-pill interactive-skill-pill" data-keyword="${escapeHtml(s)}" style="font-size: 0.75rem; cursor: pointer;" title="Click to highlight in text">
              ${escapeHtml(s)}
            </span>
          `).join('')}
        </div>
      `;
      catContainer.appendChild(row);
    }
  }

  catContainer.querySelectorAll('.interactive-skill-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      AtsAudio.click();
      const kw = pill.getAttribute('data-keyword');
      jumpToKeywordInRawText(kw);
    });
  });
}

function renderChecklist(results) {
  const container = document.getElementById('checklistContainer');
  container.innerHTML = '';

  const items = [
    {
      label: 'Email Address',
      pass: results.contact.hasEmail,
      desc: results.contact.hasEmail ? `Detected: ${results.contact.email}` : 'Missing email address! Crucial for recruiter contact.'
    },
    {
      label: 'Phone Number',
      pass: results.contact.hasPhone,
      desc: results.contact.hasPhone ? `Detected: ${results.contact.phone}` : 'Missing phone number format.'
    },
    {
      label: 'LinkedIn Profile',
      pass: results.contact.hasLinkedIn,
      desc: results.contact.hasLinkedIn ? 'Detected professional profile link' : 'Adding a verified LinkedIn URL increases interview conversion.'
    },
    {
      label: 'Work Experience Section',
      pass: results.sections.experience,
      desc: results.sections.experience ? 'Standard Experience header identified' : 'Missing standard "Experience" or "Work History" section header.'
    },
    {
      label: 'Skills Section',
      pass: results.sections.skills,
      desc: results.sections.skills ? 'Dedicated Skills section detected' : 'Create an explicit "Technical Skills" section for ATS parsers.'
    },
    {
      label: 'Education Section',
      pass: results.sections.education,
      desc: results.sections.education ? 'Academic qualifications header detected' : 'Missing standard Education section header.'
    },
    {
      label: 'Summary / Profile',
      pass: results.sections.summary,
      desc: results.sections.summary ? 'Professional Summary section detected' : 'A 2-3 sentence executive summary hooks hiring managers quickly.'
    },
    {
      label: 'Quantified Metrics',
      pass: results.metricsAnalysis.metricPercentage >= 35,
      desc: `${results.metricsAnalysis.metricPercentage}% of bullet points have quantifiable numbers/metrics (Goal: >35%).`
    },
    {
      label: 'Power Action Verbs',
      pass: results.verbsAnalysis.powerVerbsCount >= 6,
      desc: `${results.verbsAnalysis.powerVerbsCount} strong action verbs found. Ensure every bullet starts with an active verb.`
    },
    {
      label: 'Passive Voice Check',
      pass: results.verbsAnalysis.weakPhrasesCount === 0,
      desc: results.verbsAnalysis.weakPhrasesCount === 0 ? 'No weak passive phrases detected.' : `Found ${results.verbsAnalysis.weakPhrasesCount} passive phrases like "worked on" or "helped with".`
    },
    {
      label: 'Page Length & Word Count',
      pass: results.wordCount >= 300 && results.wordCount <= 950,
      desc: `${results.wordCount} words (${results.readability.estimatedPages} pages). Optimal range is 350-850 words.`
    }
  ];

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'check-item';

    const iconType = item.pass ? 'pass' : 'fail';
    const iconName = item.pass ? 'check' : 'x';

    card.innerHTML = `
      <div class="check-icon ${iconType}">
        <i data-lucide="${iconName}" style="width: 15px; height: 15px;"></i>
      </div>
      <div>
        <div class="check-label">${item.label}</div>
        <div class="check-desc">${item.desc}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Bullet Point "Power-Up" Playground with Segmented Mode Controls & "Apply to Resume"
 */
function renderBulletSuggestions(suggestions) {
  const container = document.getElementById('bulletsContainer');
  container.innerHTML = '';

  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 1rem;">No weak bullets detected. Great job!</div>';
    return;
  }

  suggestions.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'bullet-card';

    // Generate alternate power verb version
    const powerVerbImproved = item.improved.split(',')[0] + ', boosting operational performance by 25%.';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
        <span style="font-size: 0.78rem; font-weight: 700; color: var(--danger); text-transform: uppercase;">
          Issue: ${escapeHtml(item.issue)}
        </span>
        <div class="bullet-mode-selector">
          <button class="bullet-mode-btn" data-mode="original" data-index="${index}">Original</button>
          <button class="bullet-mode-btn" data-mode="power" data-index="${index}">⚡ Power Verb</button>
          <button class="bullet-mode-btn active" data-mode="xyz" data-index="${index}">🚀 Google XYZ Metric</button>
        </div>
      </div>

      <div class="bullet-weak" id="bulletWeak_${index}">
        <i data-lucide="x-circle" style="color: var(--danger); width: 16px; flex-shrink: 0; margin-top: 2px;"></i>
        <div>
          <strong>Original:</strong> "${escapeHtml(item.original)}"
        </div>
      </div>

      <div class="bullet-strong" id="bulletStrong_${index}">
        <i data-lucide="sparkles" style="color: var(--success); width: 16px; flex-shrink: 0; margin-top: 2px;"></i>
        <div style="flex: 1;" id="bulletPreviewText_${index}">
          <strong>Optimized (XYZ Formula):</strong> "${escapeHtml(item.improved)}"
        </div>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn-copy" id="btnCopyBullet_${index}">
            <i data-lucide="copy" style="width: 13px;"></i> Copy
          </button>
          <button class="btn-copy" id="btnApplyBullet_${index}" style="background: rgba(99, 102, 241, 0.2); color: var(--accent-secondary); border-color: rgba(99, 102, 241, 0.3);">
            <i data-lucide="zap" style="width: 13px;"></i> Apply to Resume
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);

    let activeText = item.improved;

    // Segmented Mode Switching
    const modeBtns = card.querySelectorAll('.bullet-mode-btn');
    const previewElem = card.querySelector(`#bulletPreviewText_${index}`);

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        AtsAudio.click();
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.getAttribute('data-mode');
        if (mode === 'original') {
          activeText = item.original;
          previewElem.innerHTML = `<strong>Original:</strong> "${escapeHtml(item.original)}"`;
        } else if (mode === 'power') {
          activeText = powerVerbImproved;
          previewElem.innerHTML = `<strong>Power Verb Upgrade:</strong> "${escapeHtml(powerVerbImproved)}"`;
        } else {
          activeText = item.improved;
          previewElem.innerHTML = `<strong>Optimized (XYZ Formula):</strong> "${escapeHtml(item.improved)}"`;
        }
      });
    });

    // Copy Handler
    card.querySelector(`#btnCopyBullet_${index}`).addEventListener('click', () => {
      navigator.clipboard.writeText(activeText).then(() => {
        AtsAudio.click();
        showAtsToast("Copied bullet to clipboard", "copy");
      });
    });

    // Apply to Resume Handler
    card.querySelector(`#btnApplyBullet_${index}`).addEventListener('click', () => {
      if (!state.currentResumeText.includes(item.original)) {
        // Fallback: append or replace first occurrence
        state.currentResumeText = state.currentResumeText.replace(item.original.slice(0, 20), activeText);
      } else {
        state.currentResumeText = state.currentResumeText.replace(item.original, activeText);
      }

      document.getElementById('resumeRawText').value = state.currentResumeText;
      updateResumeWordCount(state.currentResumeText);
      AtsAudio.success();
      showAtsToast("Bullet upgraded in resume! Recalculating ATS score...", "sparkles");
      executeAnalysis();
    });
  });
}

function renderInterviewQuestions(questions) {
  const container = document.getElementById('interviewQuestionsContainer');
  container.innerHTML = '';

  questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'question-card';

    card.innerHTML = `
      <div class="question-category">${escapeHtml(q.skill)}</div>
      <div class="question-text">${escapeHtml(q.question)}</div>
      <div class="question-tip">
        <strong>Tip:</strong> ${escapeHtml(q.tip)}
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * AI Resume Coach Drawer Logic
 */
function initAiCoachDrawer() {
  const drawer = document.getElementById('aiCoachDrawer');
  const openBtn = document.getElementById('btnOpenAiCoach');
  const closeBtn = document.getElementById('btnCloseAiCoach');
  const backdrop = document.getElementById('aiCoachBackdrop');
  const form = document.getElementById('coachChatForm');
  const input = document.getElementById('coachChatInput');
  const messagesContainer = document.getElementById('coachMessages');

  if (!drawer) return;

  const toggleDrawer = (open) => {
    drawer.classList.toggle('open', open);
    drawer.classList.toggle('active', open);
    drawer.setAttribute('aria-hidden', !open);
    if (open) {
      setTimeout(() => {
        if (input) input.focus();
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 250);
    }
  };

  const openButtons = [
    document.getElementById('btnOpenAiCoach'),
    document.getElementById('btnFloatingAiCoach')
  ].filter(Boolean);

  openButtons.forEach(btn => {
    btn.addEventListener('click', () => toggleDrawer(true));
  });

  if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
  if (backdrop) backdrop.addEventListener('click', () => toggleDrawer(false));

  // Quick Chips
  document.querySelectorAll('.coach-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      if (query) {
        sendCoachMessage(query);
      }
    });
  });

  // Chat Form Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    input.value = '';
    sendCoachMessage(query);
  });

  async function sendCoachMessage(query) {
    // Append User Bubble
    appendCoachBubble(query, 'user');
    AtsAudio.click();

    // Append Thinking Indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'coach-bubble bot typing';
    typingBubble.id = 'coachTypingIndicator';
    typingBubble.innerHTML = `
      <span class="pulse-dot"></span>
      <span style="font-size: 0.82rem; color: var(--text-muted); margin-left: 0.5rem;">Analyzing resume & formulating recommendations...</span>
    `;
    messagesContainer.appendChild(typingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const answer = await askAiCoach(
        query,
        state.currentResumeText,
        state.currentJobDescription,
        state.coachHistory
      );

      typingBubble.remove();
      appendCoachBubble(answer, 'bot');
      state.coachHistory.push({ role: 'user', content: query });
      state.coachHistory.push({ role: 'assistant', content: answer });
      AtsAudio.click();
    } catch (err) {
      typingBubble.remove();
      appendCoachBubble(`⚠️ Could not reach AI Coach: ${err.message}. Ensure your Groq API key is configured.`, 'bot');
    }
  }

  function appendCoachBubble(content, role) {
    const bubble = document.createElement('div');
    bubble.className = `coach-bubble ${role}`;

    if (role === 'bot') {
      let html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
      if (html.includes('<li>')) {
        html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
      }
      bubble.innerHTML = `<p>${html}</p>`;
    } else {
      bubble.textContent = content;
    }

    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * ATS Toast Notification Helper
 */
export function showAtsToast(message, icon = 'info') {
  const container = document.getElementById('atsToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'ats-toast';
  toast.innerHTML = `
    <i data-lucide="${icon}" style="width: 16px; height: 16px; flex-shrink: 0; color: var(--accent-primary);"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeJsString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Interactive CV Studio & Live Formatted Preview
 */
function initCvStudio() {
  const themeBtns = document.querySelectorAll('.cv-theme-btn');
  const colorDots = document.querySelectorAll('.cv-color-dot');
  const printBtn = document.getElementById('btnPrintCv');

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeCvTheme = btn.getAttribute('data-theme');
      updateCvPaperClasses();
    });
  });

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.activeCvColor = dot.getAttribute('data-color');
      updateCvPaperClasses();
    });
  });

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function updateCvPaperClasses() {
  const paper = document.getElementById('cvPreviewRenderArea');
  if (!paper) return;

  paper.className = `cv-paper cv-theme-${state.activeCvTheme || 'modern'} cv-accent-${state.activeCvColor || 'indigo'}`;
}

function renderCvPreview(rawText, results) {
  const paper = document.getElementById('cvPreviewRenderArea');
  if (!paper) return;

  if (!rawText || rawText.trim().length < 20) {
    paper.innerHTML = `
      <div class="cv-empty-placeholder">
        <i data-lucide="file-text" style="width: 38px; height: 38px; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
        <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem;">Live Formatted CV Studio</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 420px; margin: 0 auto;">Analyze or paste a resume to preview and export your recruiter-ready formatted CV.</p>
      </div>
    `;
    initIcons();
    return;
  }

  // Parse lines
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Candidate Name
  let name = lines[0] ? lines[0].replace(/^(resume|curriculum vitae|cv)\b/gi, '').trim() : "Candidate Name";
  if (name.length > 50 || name.includes('@') || name.includes('http') || name.toLowerCase().includes('summary')) {
    name = "Candidate Resume";
  }

  // Contacts
  const contacts = [];
  if (results && results.contact) {
    if (results.contact.email) contacts.push(`<span>✉️ ${escapeHtml(results.contact.email)}</span>`);
    if (results.contact.phone) contacts.push(`<span>📞 ${escapeHtml(results.contact.phone)}</span>`);
    if (results.contact.linkedIn) contacts.push(`<span>🔗 ${escapeHtml(results.contact.linkedIn)}</span>`);
    if (results.contact.github) contacts.push(`<span>💻 ${escapeHtml(results.contact.github)}</span>`);
  }

  // Summary
  let summary = "";
  const summaryMatch = rawText.match(/(?:summary|professional summary|profile|about me)[\s\S]*?(?=(?:experience|employment|work history|skills|education|projects|$))/i);
  if (summaryMatch) {
    summary = summaryMatch[0].replace(/^(?:summary|professional summary|profile|about me)[:\s\-]*/i, '').trim();
  }

  // Bullets
  const bullets = [];
  lines.forEach(l => {
    if ((l.startsWith('•') || l.startsWith('-') || l.startsWith('*')) && l.length > 20) {
      bullets.push(l.replace(/^[•\-\*]\s*/, '').trim());
    }
  });

  // Skills
  const skills = (results && results.detectedSkills && results.detectedSkills.all && results.detectedSkills.all.length > 0)
    ? results.detectedSkills.all.slice(0, 24)
    : [];

  // Education
  let educationText = "";
  const eduMatch = rawText.match(/(?:education|academic|degrees)[\s\S]*?(?=(?:skills|experience|projects|certifications|$))/i);
  if (eduMatch) {
    educationText = eduMatch[0].replace(/^(?:education|academic|degrees)[:\s\-]*/i, '').trim();
  }

  let html = `
    <header class="cv-header">
      <h2 class="cv-name">${escapeHtml(name)}</h2>
      <div class="cv-role">ATS Evaluated Candidate Profile</div>
      <div class="cv-contacts">
        ${contacts.length > 0 ? contacts.join(' • ') : '<span>Confidential Candidate</span>'}
      </div>
    </header>
  `;

  if (summary && summary.length > 20) {
    html += `
      <section class="cv-section">
        <h3 class="cv-section-title">Professional Summary</h3>
        <p class="cv-summary-text">${escapeHtml(summary.slice(0, 600))}</p>
      </section>
    `;
  }

  if (bullets.length > 0) {
    html += `
      <section class="cv-section">
        <h3 class="cv-section-title">Key Accomplishments & Experience</h3>
        <ul class="cv-bullets">
          ${bullets.slice(0, 8).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </section>
    `;
  }

  if (skills.length > 0) {
    html += `
      <section class="cv-section">
        <h3 class="cv-section-title">Core Competencies & Technologies</h3>
        <div class="cv-skills-cloud">
          ${skills.map(s => `<span class="cv-paper-skill">${escapeHtml(s)}</span>`).join('')}
        </div>
      </section>
    `;
  }

  if (educationText && educationText.length > 10) {
    html += `
      <section class="cv-section">
        <h3 class="cv-section-title">Education & Credentials</h3>
        <p class="cv-summary-text">${escapeHtml(educationText.slice(0, 350))}</p>
      </section>
    `;
  }

  paper.innerHTML = html;
  updateCvPaperClasses();
  initIcons();
}


