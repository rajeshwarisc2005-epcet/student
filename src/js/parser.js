/**
 * Client-Side Resume Document Parser
 * Parses PDF (via PDF.js), DOCX (via Mammoth.js), and plain text.
 */

export async function parseResumeFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  switch (extension) {
    case 'pdf':
      return await parsePdf(file);
    case 'docx':
      return await parseDocx(file);
    case 'txt':
    case 'md':
      return await parseText(file);
    default:
      throw new Error(`Unsupported file type: .${extension}. Please upload a PDF, DOCX, or TXT file.`);
  }
}

/**
 * Extracts plain text from PDF using PDF.js
 */
async function parsePdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF parser library is still loading. Please try again in a few seconds.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by line position
    let lastY = null;
    let pageText = "";
    for (const item of textContent.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += "\n";
      } else if (pageText.length > 0 && !pageText.endsWith(" ") && !item.str.startsWith(" ")) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}

/**
 * Extracts plain text from DOCX using Mammoth.js
 */
async function parseDocx(file) {
  if (!window.mammoth) {
    throw new Error("DOCX parser library is still loading. Please try again in a moment.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Extracts plain text from TXT or Markdown file
 */
function parseText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}
