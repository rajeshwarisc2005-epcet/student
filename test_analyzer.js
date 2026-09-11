import { analyzeResume } from './src/js/analyzer.js';
import { sampleResumes, sampleJobDescriptions } from './src/js/samples.js';

console.log("=== RUNNING RESUME ANALYZER UNIT TESTS ===");

// Test 1: Senior Full Stack Engineer Resume
const fullStackResult = analyzeResume(
  sampleResumes.softwareEngineer.content,
  sampleJobDescriptions.fullStackJob.content
);

console.log(`[Test 1] Senior Engineer Score: ${fullStackResult.scores.total}/100`);
console.log(`[Test 1] Verdict: ${fullStackResult.scores.verdict}`);
console.log(`[Test 1] JD Match Rate: ${fullStackResult.jdMatch?.matchRate}%`);
console.log(`[Test 1] Power Verbs: ${fullStackResult.verbsAnalysis.powerVerbsCount}, Weak Phrases: ${fullStackResult.verbsAnalysis.weakPhrasesCount}`);
console.log(`[Test 1] Quantified Metrics %: ${fullStackResult.metricsAnalysis.metricPercentage}%`);
console.log(`[Test 1] Detected Skills Count: ${fullStackResult.detectedSkills.totalFound}`);

if (fullStackResult.scores.total < 80) {
  throw new Error(`Expected high score for senior resume, got ${fullStackResult.scores.total}`);
}

// Test 2: Unoptimized Draft Resume
const poorResult = analyzeResume(
  sampleResumes.poorResume.content,
  sampleJobDescriptions.fullStackJob.content
);

console.log(`\n[Test 2] Poor Resume Score: ${poorResult.scores.total}/100`);
console.log(`[Test 2] Verdict: ${poorResult.scores.verdict}`);
console.log(`[Test 2] Weak Phrases: ${poorResult.verbsAnalysis.weakPhrasesCount}`);
console.log(`[Test 2] Missing Sections:`, Object.entries(poorResult.sections).filter(([_, v]) => !v).map(([k]) => k));
console.log(`[Test 2] Bullet Suggestions Generated: ${poorResult.bulletSuggestions.length}`);

if (poorResult.scores.total > 60) {
  throw new Error(`Expected low score for unoptimized resume, got ${poorResult.scores.total}`);
}

// Test 3: Data Analyst Resume
const dataResult = analyzeResume(
  sampleResumes.dataAnalyst.content,
  sampleJobDescriptions.dataAnalystJob.content
);

console.log(`\n[Test 3] Data Analyst Score: ${dataResult.scores.total}/100`);
console.log(`[Test 3] JD Match Rate: ${dataResult.jdMatch?.matchRate}%`);
console.log(`[Test 3] Interview Questions: ${dataResult.interviewQuestions.length}`);

console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✓");
