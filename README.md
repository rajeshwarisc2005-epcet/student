# ATS Resume Optimizer & AI Career Studio

A modern, client-side Applicant Tracking System (ATS) Resume Analyzer, 5-Axis Radar Diagnostic Engine, and AI Career Coach built with Vite, Vanilla JavaScript, and Groq LLM.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/privacy-100%25%20Client--Side-emerald.svg)

---

## 🚀 Key Features

- **⚡ Sub-Second Resume Parsing**: Upload PDF or DOCX documents, or paste raw text. Parses client-side with zero data sent to external servers for basic parsing.
- **🎯 5-Axis ATS Dimension Radar**: Interactive geometric diagnostic plotting:
  - **Hard Skills**: Quantitative skill taxonomy count.
  - **Action Verbs**: High-impact power verbs vs. weak/passive phrasing.
  - **Impact Metrics**: Percentage of quantified achievements (%, $, numbers).
  - **ATS Headers**: Detection and standardization of core recruiter sections.
  - **Readability & Length**: Word count, density, and estimated page ratio.
- **✨ Live Score Simulator ("What-If" Engine)**: Toggle individual optimizations to see simulated pass rate improvements in real time before rewriting your resume.
- **📝 Bullet Point Optimizer**: Side-by-side comparison transforming passive bullets into metrics-driven, action-oriented power bullets.
- **🤖 AI Career Coach**: Groq LLM-powered interactive assistant providing tailored strategic advice, interview questions, and comprehensive resume reviews.
- **📄 Formatted CV Studio**: Real-time recruiter-ready resume generator with customizable themes (Modern, Executive, Minimal) and instant print/PDF export.

---

## 🛠️ Tech Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Bundler**: [Vite](https://vitejs.dev/)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **PDF Extraction**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **AI Backend**: [Groq Cloud API](https://groq.com/) (Llama-3 / Mixtral)

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/rajeshwarisc2005-epcet/student.git
cd student
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables (Optional)
Copy `.env.example` to `.env.local` and add your Groq API key:
```bash
cp .env.example .env.local
```

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to test the application locally.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
