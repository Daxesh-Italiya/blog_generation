import fs from 'fs';
import { parse } from 'csv-parse/sync';

export const loadContentCsv = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true // Handle Excel BOM
  });

  return records.map(record => ({
    id: record['No'],
    title: record['Title'],
    slug: record['Slug'] || record['Slug ']?.trim(), // Handle trailing space in header
    tone: record['Tone'],
    primaryKeyword: record['Primary Keyword'],
    secondaryKeywords: record['Secondary keywords'],
    targetAudience: record['Target Audience'],
    outline: record['Outline'],
    wordCount: record['Word Count'],
    eeatInstructions: record['E-E-A-T Writing Instrucution'],
    faqs: record['FAQs'],
    author: record['Author'],
    imageInclude: record['Image inculde'] === 'Yes',
    heroImage: record['Hero Image'],
    bannerImage: record['Inbox banner Image'],
    referenceLinks: record['Refernce Link'] || record['Reference Link'], // Handle typo in CSV header
    internalLinks: record['Link']
  }));
};
