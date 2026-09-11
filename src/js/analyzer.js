/**
 * Comprehensive Resume & ATS NLP Heuristics Engine
 */

export const SKILL_TAXONOMY = {
  frontend: [
    "react", "react.js", "next.js", "vue", "vue.js", "angular", "svelte", 
    "typescript", "javascript", "html5", "css3", "sass", "scss", "tailwind", 
    "tailwindcss", "bootstrap", "redux", "graphql", "webpack", "vite"
  ],
  backend: [
    "node.js", "nodejs", "express", "express.js", "nest.js", "python", "django", 
    "flask", "fastapi", "java", "spring boot", "c#", ".net", "golang", "go", 
    "ruby", "ruby on rails", "php", "rest", "restful", "grpc", "microservices"
  ],
  cloud_devops: [
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", 
    "kubernetes", "terraform", "ansible", "ci/cd", "github actions", "gitlab", 
    "jenkins", "linux", "nginx", "serverless", "lambda", "cloudformation"
  ],
  databases: [
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", 
    "sqlite", "cassandra", "dynamodb", "mariadb", "snowflake", "bigquery"
  ],
  data_ai: [
    "sql", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", 
    "machine learning", "deep learning", "nlp", "tableau", "power bi", 
    "airflow", "dbt", "spark", "kafka", "statistics", "a/b testing", "data modeling"
  ],
  soft_skills: [
    "leadership", "mentoring", "communication", "collaboration", "problem-solving", 
    "critical thinking", "adaptability", "time management", "scrum", "agile", 
    "stakeholder management", "project management"
  ]
};

export const ACTION_VERBS = [
  "architected", "spearheaded", "engineered", "designed", "developed", 
  "deployed", "orchestrated", "optimized", "accelerated", "slashed", 
  "streamlined", "automated", "mentored", "championed", "formulated", 
  "executed", "boosted", "delivered", "expanded", "integrated", 
  "generated", "revamped", "surpassed", "maximized", "transformed"
];

export const WEAK_PHRASES = [
  "responsible for", "duties included", "helped with", "assisted in", 
  "worked on", "handled", "tried to", "participated in", "tasked with", 
  "was part of", "did some", "familiar with"
];

/**
 * Main Analysis Orchestrator
 */
export function analyzeResume(resumeText, jobDescription = "") {
  const normalizedText = resumeText || "";
  const lines = normalizedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const words = normalizedText.match(/\b[A-Za-z0-9#+.-]+\b/g) || [];
  const wordCount = words.length;

  // 1. Contact Information Detection
  const contact = extractContactInfo(normalizedText);

  // 2. Section Structure Detection
  const sections = detectSections(lines);

  // 3. Action Verbs & Weak Phrasing
  const verbsAnalysis = analyzeVerbs(normalizedText, lines);

  // 4. Quantifiable Metrics & Numbers Check
  const metricsAnalysis = analyzeMetrics(lines);

  // 5. Skills Extraction
  const detectedSkills = extractSkills(normalizedText);

  // 6. Formatting & Readability Check
  const readability = analyzeReadability(wordCount, lines);

  // 7. Job Description Match (if provided)
  let jdMatch = null;
  if (jobDescription && jobDescription.trim().length > 20) {
    jdMatch = matchJobDescription(normalizedText, jobDescription, detectedSkills);
  }

  // 8. Calculate Overall ATS Score (0 - 100)
  const scores = calculateAtsScore({
    contact,
    sections,
    verbsAnalysis,
    metricsAnalysis,
    readability,
    jdMatch
  });

  // 9. Bullet Point Optimization Suggestions
  const bulletSuggestions = generateBulletImprovements(lines);

  // 10. Role-Tailored Interview Questions
  const interviewQuestions = generateInterviewQuestions(detectedSkills, jdMatch);

  return {
    wordCount,
    lineCount: lines.length,
    contact,
    sections,
    verbsAnalysis,
    metricsAnalysis,
    detectedSkills,
    readability,
    jdMatch,
    scores,
    bulletSuggestions,
    interviewQuestions
  };
}

/**
 * Extracts emails, phones, links from resume text
 */
function extractContactInfo(text) {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
  const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})/i;
  const linkedinRegex = /(linkedin\.com\/in\/[a-zA-Z0-9_-]+)/i;
  const githubRegex = /(github\.com\/[a-zA-Z0-9_-]+)/i;
  const portfolioRegex = /(https?:\/\/[^\s]+|portfolio|website)/i;

  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const linkedinMatch = text.match(linkedinRegex);
  const githubMatch = text.match(githubRegex);

  return {
    hasEmail: !!emailMatch,
    email: emailMatch ? emailMatch[0] : null,
    hasPhone: !!phoneMatch,
    phone: phoneMatch ? phoneMatch[0] : null,
    hasLinkedIn: !!linkedinMatch,
    linkedIn: linkedinMatch ? linkedinMatch[0] : null,
    hasGitHub: !!githubMatch,
    github: githubMatch ? githubMatch[0] : null
  };
}

/**
 * Detects presence of standard resume sections
 */
function detectSections(lines) {
  const sectionKeywords = {
    summary: /(professional\s+summary|summary|profile|about\s+me|objective)/i,
    experience: /(experience|work\s+history|employment|professional\s+experience)/i,
    education: /(education|academic|degrees|university|college)/i,
    skills: /(skills|technical\s+skills|core\s+competencies|technologies)/i,
    projects: /(projects|personal\s+projects|portfolio\s+projects)/i,
    certifications: /(certifications|licenses|awards|honors|credentials)/i
  };

  const detected = {
    summary: false,
    experience: false,
    education: false,
    skills: false,
    projects: false,
    certifications: false
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length < 50) {
      for (const [key, regex] of Object.entries(sectionKeywords)) {
        if (regex.test(trimmed)) {
          detected[key] = true;
        }
      }
    }
  });

  return detected;
}

/**
 * Analyzes action verbs vs weak/passive phrases
 */
function analyzeVerbs(text, lines) {
  const lower = text.toLowerCase();
  const foundVerbs = [];
  ACTION_VERBS.forEach(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      foundVerbs.push({ verb, count: matches.length });
    }
  });

  const foundWeak = [];
  WEAK_PHRASES.forEach(phrase => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      foundWeak.push({ phrase, count: matches.length });
    }
  });

  return {
    powerVerbsCount: foundVerbs.reduce((acc, v) => acc + v.count, 0),
    foundVerbs,
    weakPhrasesCount: foundWeak.reduce((acc, w) => acc + w.count, 0),
    foundWeak
  };
}

/**
 * Analyzes quantified impact (percentages, dollar values, metric numbers)
 */
function analyzeMetrics(lines) {
  const metricRegex = /(\d+%\b|\$\d+[\d,]*|\b\d+[xX]\b|\b\d+\+?\s*(?:million|k|m|users|requests|hours|seconds|percent|revenue|pts))/i;
  
  let bulletCount = 0;
  let quantifiedBullets = 0;
  const quantifiedExamples = [];

  lines.forEach(line => {
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.length > 40) {
      bulletCount++;
      if (metricRegex.test(line)) {
        quantifiedBullets++;
        if (quantifiedExamples.length < 5) {
          quantifiedExamples.push(line);
        }
      }
    }
  });

  const ratio = bulletCount > 0 ? (quantifiedBullets / bulletCount) : 0;

  return {
    bulletCount,
    quantifiedBullets,
    metricPercentage: Math.round(ratio * 100),
    quantifiedExamples
  };
}

/**
 * Extracts skills based on taxonomy
 */
function extractSkills(text) {
  const lower = " " + text.toLowerCase() + " ";
  const found = {};
  let totalFound = 0;

  for (const [category, skills] of Object.entries(SKILL_TAXONOMY)) {
    found[category] = [];
    skills.forEach(skill => {
      // Escape for regex boundary check
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
      if (regex.test(lower)) {
        found[category].push(skill);
        totalFound++;
      }
    });
  }

  return {
    categories: found,
    all: Object.values(found).flat(),
    totalFound
  };
}

/**
 * Readability and formatting metrics
 */
function analyzeReadability(wordCount, lines) {
  // Ideal resume length: 350 - 850 words (1-2 pages)
  let lengthStatus = "Optimal";
  let lengthScore = 100;

  if (wordCount < 200) {
    lengthStatus = "Too Short (Under 200 words)";
    lengthScore = 40;
  } else if (wordCount < 350) {
    lengthStatus = "Slightly Brief";
    lengthScore = 75;
  } else if (wordCount > 1100) {
    lengthStatus = "Too Long (Exceeds 1100 words)";
    lengthScore = 60;
  }

  return {
    wordCount,
    lengthStatus,
    lengthScore,
    estimatedPages: (wordCount / 450).toFixed(1)
  };
}

/**
 * Job Description match calculation
 */
function matchJobDescription(resumeText, jobDescription, detectedResumeSkills) {
  const lowerJD = " " + jobDescription.toLowerCase() + " ";
  const jdSkills = [];

  // Extract all skills from taxonomy present in JD
  for (const skills of Object.values(SKILL_TAXONOMY)) {
    skills.forEach(skill => {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
      if (regex.test(lowerJD) && !jdSkills.includes(skill)) {
        jdSkills.push(skill);
      }
    });
  }

  const resumeSkillsSet = new Set(detectedResumeSkills.all.map(s => s.toLowerCase()));
  const matched = jdSkills.filter(skill => resumeSkillsSet.has(skill));
  const missing = jdSkills.filter(skill => !resumeSkillsSet.has(skill));

  const matchRate = jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : 0;

  return {
    jdSkillsCount: jdSkills.length,
    matchRate,
    matched,
    missing
  };
}

/**
 * ATS Composite Score Calculation
 */
function calculateAtsScore({ contact, sections, verbsAnalysis, metricsAnalysis, readability, jdMatch }) {
  // 1. Contact Score (max 15)
  let contactScore = 0;
  if (contact.hasEmail) contactScore += 5;
  if (contact.hasPhone) contactScore += 4;
  if (contact.hasLinkedIn) contactScore += 3;
  if (contact.hasGitHub) contactScore += 3;

  // 2. Sections Score (max 20)
  let sectionScore = 0;
  if (sections.experience) sectionScore += 6;
  if (sections.skills) sectionScore += 5;
  if (sections.education) sectionScore += 4;
  if (sections.summary) sectionScore += 3;
  if (sections.projects || sections.certifications) sectionScore += 2;

  // 3. Action Language Score (max 20)
  let verbsScore = Math.min(20, (verbsAnalysis.powerVerbsCount * 3) - (verbsAnalysis.weakPhrasesCount * 2));
  verbsScore = Math.max(5, verbsScore);

  // 4. Quantified Metrics Score (max 25)
  let metricsScore = Math.min(25, Math.round((metricsAnalysis.metricPercentage / 100) * 25) + (metricsAnalysis.quantifiedBullets >= 3 ? 5 : 0));

  // 5. Readability / Word Count (max 20)
  let readScore = Math.round((readability.lengthScore / 100) * 20);

  let rawTotal = contactScore + sectionScore + verbsScore + metricsScore + readScore;
  rawTotal = Math.min(100, Math.max(10, rawTotal));

  // If JD is present, calibrate composite score
  let finalScore = rawTotal;
  if (jdMatch) {
    finalScore = Math.round((rawTotal * 0.65) + (jdMatch.matchRate * 0.35));
  }

  let verdict = "Needs Improvement";
  let verdictColor = "var(--danger)";
  if (finalScore >= 85) {
    verdict = "Excellent / High ATS Pass";
    verdictColor = "var(--success)";
  } else if (finalScore >= 70) {
    verdict = "Good / Competitive";
    verdictColor = "var(--info)";
  } else if (finalScore >= 55) {
    verdict = "Moderate / Needs Polishing";
    verdictColor = "var(--warning)";
  }

  return {
    total: finalScore,
    verdict,
    verdictColor,
    breakdown: {
      contact: { score: contactScore, max: 15 },
      sections: { score: sectionScore, max: 20 },
      actionLanguage: { score: verbsScore, max: 20 },
      quantifiedMetrics: { score: metricsScore, max: 25 },
      readability: { score: readScore, max: 20 }
    }
  };
}

/**
 * Bullet Point Improver Rules
 */
function generateBulletImprovements(lines) {
  const suggestions = [];

  lines.forEach(line => {
    const trimmed = line.replace(/^[•\-\*]\s*/, '').trim();
    if (trimmed.length > 25 && trimmed.length < 180) {
      // Check for weak phrases
      for (const phrase of WEAK_PHRASES) {
        if (trimmed.toLowerCase().startsWith(phrase) || trimmed.toLowerCase().includes(" " + phrase + " ")) {
          suggestions.push({
            original: trimmed,
            issue: `Contains passive phrasing ("${phrase}") and lacks quantifiable outcome.`,
            improved: convertWeakBullet(trimmed, phrase)
          });
          break;
        }
      }
    }
  });

  // If no weak bullets found in resume, provide general best-practice templates
  if (suggestions.length === 0) {
    suggestions.push({
      original: "Worked on customer dashboard and handled bug fixes.",
      issue: "Passive verb ('Worked on') without measurable business impact.",
      improved: "Architected responsive customer analytics dashboard, resolving 45+ critical bugs and improving page load speeds by 35%."
    });
    suggestions.push({
      original: "Responsible for database queries and data reporting.",
      issue: "Duties-focused rather than achievement-focused.",
      improved: "Engineered automated SQL ETL pipelines across 5M+ rows, slashing weekly manual reporting time by 12 hours."
    });
  }

  return suggestions.slice(0, 4);
}

function convertWeakBullet(bullet, weakPhrase) {
  const lower = bullet.toLowerCase();
  if (lower.includes("customer") || lower.includes("store")) {
    return "Orchestrated customer engagement initiatives, serving 120+ daily clients and driving a 22% increase in customer satisfaction ratings.";
  }
  if (lower.includes("website") || lower.includes("computer") || lower.includes("software")) {
    return "Spearheaded technical system updates and digital workflow overhauls, reducing operational downtime by 40%.";
  }
  if (lower.includes("data") || lower.includes("filing") || lower.includes("inventory")) {
    return "Optimized inventory logging and document tracking workflows, reducing data entry errors by 30% and saving 8 hours weekly.";
  }
  return "Spearheaded core workflow operations, collaborating across cross-functional teams to boost efficiency by 25%.";
}

/**
 * Generates tailored interview questions based on candidate's detected skills
 */
function generateInterviewQuestions(detectedSkills, jdMatch) {
  const skillsList = jdMatch && jdMatch.matched.length > 0 
    ? jdMatch.matched 
    : detectedSkills.all.slice(0, 6);

  const bank = {
    react: "Can you explain how React's Fiber architecture and Reconciliation algorithm differ from traditional DOM manipulation?",
    typescript: "How do you leverage TypeScript's utility types (such as Pick, Omit, or conditional types) to enforce type safety in large-scale applications?",
    "node.js": "How does Node.js handle high-throughput I/O under the hood with libuv, and how do you prevent event loop starvation?",
    aws: "Describe an architecture you implemented on AWS. How did you handle high availability, disaster recovery, and auto-scaling?",
    docker: "What are your best practices for creating secure, minimal multi-stage Docker builds for microservices in production?",
    postgresql: "How do you diagnose and optimize slow-running SQL queries in PostgreSQL? What is your strategy for indexing and partition management?",
    python: "How does Python handle memory management and garbage collection? When would you use generators or multiprocessing vs threading?",
    leadership: "Tell me about a time when you had to resolve a technical disagreement between senior engineering peers. What was your approach?"
  };

  const questions = [];

  skillsList.forEach(s => {
    const key = s.toLowerCase();
    if (bank[key]) {
      questions.push({
        skill: s.toUpperCase(),
        question: bank[key],
        tip: "Answer using the STAR method (Situation, Task, Action, Result). Mention real metrics from your projects."
      });
    }
  });

  // Defaults if specific tech bank wasn't hit
  if (questions.length < 3) {
    questions.push({
      skill: "SYSTEM DESIGN",
      question: "Walk us through how you would architect a resilient distributed system designed for 99.99% uptime.",
      tip: "Discuss trade-offs, caching (Redis), asynchronous queues (Kafka/RabbitMQ), and database read replicas."
    });
    questions.push({
      skill: "BEHAVIORAL / IMPACT",
      question: "Describe a project where you significantly cut operational latency or business costs. What metrics proved your success?",
      tip: "Quantify your impact in dollars, percentages, or saved hours just like in your resume bullets."
    });
  }

  return questions.slice(0, 4);
}
