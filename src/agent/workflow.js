import fs from 'fs';
import path from 'path';
import { generateContent } from '../services/llm.js';
import { CONTEXT_PROMPT, SECTION_PROMPT, INFOGRAPHIC_PROMPT } from '../utils/prompts.js';
import { getImageLink, ensurePublicDir } from '../services/imageService.js';
import chalk from 'chalk';

const OUTPUT_DIR = path.join(process.cwd(), 'output');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const runWorkflow = async (articleData) => {
  console.log(chalk.blue(`\nProcessing Article: ${articleData.title}`));
  
  // 1. Setup Output Dir
  const slug = articleData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const articleDir = path.join(OUTPUT_DIR, slug);
  if (!fs.existsSync(articleDir)) {
    fs.mkdirSync(articleDir, { recursive: true });
  }
  ensurePublicDir();

  // 2. Parse Outline (assuming Outline format in CSV is like "H2: Intro... \n H3: ...")
  const outlineLines = articleData.outline.split('\n').filter(line => line.trim().startsWith('H'));
  
  // 3. Context Phase
  console.log(chalk.yellow('Phase 1: Context Setup...'));
  // We inform the LLM of the context, but for 'no approval' mode we mainly just initialize our internal memory
  let fullBlogContent = ""; 
  let infographicContent = "# Infographic Plan\n\n";

  // 4. Section Loop
  console.log(chalk.yellow('Phase 2: Section-by-Section Generation...'));

  for (let i = 0; i < outlineLines.length; i++) {
    const sectionHeader = outlineLines[i].trim();
    console.log(chalk.cyan(`Generating Section [${i+1}/${outlineLines.length}]: ${sectionHeader}`));

    // A. Generate Blog Content
    const sectionBody = await generateContent(
      SECTION_PROMPT(sectionHeader, articleData, fullBlogContent.slice(-2000)), // Pass last 2k chars as context
      `Write the content for header: ${sectionHeader}`
    );

    // B. Handle Images
    let finalSectionContent = `\n${sectionBody}\n`;
    
    // Check if we need to insert Hero Image at the start (first H2)
    if (i === 0 && articleData.heroImage) {
        const link = getImageLink(slug, path.basename(articleData.heroImage));
        if (link) finalSectionContent = `${link}\n\n${finalSectionContent}`;
    }

    // C. Save Individual Section File
    const sectionFileName = `${String(i+1).padStart(2, '0')}-${sectionHeader.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0,30)}.md`;
    fs.writeFileSync(path.join(articleDir, sectionFileName), finalSectionContent);
    
    // Accumulate for Context
    fullBlogContent += finalSectionContent;

    // D. Generate Infographic Mapping (Parallel)
    const infoMapping = await generateContent(
        INFOGRAPHIC_PROMPT(sectionBody),
        "Extract infographic details."
    );
    if (!infoMapping.includes("NO_INFOGRAPHIC")) {
        infographicContent += `## For Section: ${sectionHeader}\n${infoMapping}\n\n`;
    }
    
    // Safety pause to avoid hitting rate limits too hard if using free tier, and to mimic "thinking"
    await sleep(1000); 
  }

  // 5. Final Compilation
  console.log(chalk.green('Phase 5: Compilation...'));
  const fullFilePath = path.join(articleDir, 'FULL_POST.md');
  const infoFilePath = path.join(articleDir, 'INFOGRAPHIC_PLAN.md');

  // Add Metadata Header
  const header = `---
title: ${articleData.title}
slug: ${slug}
date: ${articleData.publishDate || new Date().toISOString().split('T')[0]}
author: ${articleData.author}
---

`;

  fs.writeFileSync(fullFilePath, header + fullBlogContent);
  fs.writeFileSync(infoFilePath, infographicContent);

  console.log(chalk.green(`\nCOMPLETED: ${articleData.title}`));
  console.log(`Saved to: ${articleDir}`);
};
