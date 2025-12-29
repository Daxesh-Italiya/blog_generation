import fs from "fs";
import path from "path";
import { generateContent } from "../services/llm.js";
import { CostTracker } from "../utils/costTracker.js";
import {
  CONTEXT_PROMPT,
  SECTION_PROMPT,
  META_DATA_PROMPT,
} from "../utils/prompts.js";
import chalk from "chalk";

const OUTPUT_DIR = path.join(process.cwd(), "output");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse outline and group H3 headings under their parent H2 headings
 * @param {string} outline - The outline string from CSV
 * @returns {Array} - Array of sections with H2 heading and associated H3 subheadings
 */
const parseOutlineIntoSections = (outline) => {
  const lines = outline
    .split("\n")
    .filter((line) => line.trim().startsWith("H"));
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("H2:")) {
      // If we have a current section, push it to the array
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start a new section with this H2 heading
      currentSection = {
        h2Heading: trimmedLine,
        h3Subheadings: [],
      };
    } else if (trimmedLine.startsWith("H3:") && currentSection) {
      // Add this H3 heading to the current section
      currentSection.h3Subheadings.push(trimmedLine);
    }
  }

  // Don't forget to push the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
};

export const runWorkflow = async (articleData) => {
  console.log(chalk.blue(`\nProcessing Article: ${articleData.title}`));

  // 1. Setup Output Dir
  const slug = articleData.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const articleDir = path.join(OUTPUT_DIR, slug);
  if (!fs.existsSync(articleDir)) {
    fs.mkdirSync(articleDir, { recursive: true });
  }

  // Token Tracking & Cost Persistence
  const costTracker = new CostTracker(OUTPUT_DIR, articleData.title);

  // 2. Parse Outline into sections
  console.log(chalk.yellow("Parsing outline into sections..."));
  const sections = parseOutlineIntoSections(articleData.outline);
  console.log(chalk.cyan(`Found ${sections.length} main sections`));

  // 3. Context Phase
  console.log(chalk.yellow("Phase 1: Context Setup..."));
  // We inform the LLM of the context, but for 'no approval' mode we mainly just initialize our internal memory
  let fullBlogContent = "";

  // 4. Determine where to start processing
  console.log(chalk.yellow("Checking for existing sections..."));
  const existingFiles = fs
    .readdirSync(articleDir)
    .filter(
      (file) =>
        file.endsWith(".md") &&
        !file.includes("FULL_POST") &&
        !file.includes("INFOGRAPHIC")
    );

  // Extract section numbers from filenames to find the last processed section
  let processedSections = 0;
  for (const file of existingFiles) {
    const match = file.match(/^(\d+)-/);
    if (match) {
      const sectionNum = parseInt(match[1], 10);
      if (sectionNum > processedSections) {
        processedSections = sectionNum;
      }
    }
  }

  console.log(
    chalk.cyan(
      `Found ${processedSections} already processed sections. Starting from section ${
        processedSections + 1
      }...`
    )
  );

  // Load existing content if any
  if (processedSections > 0) {
    console.log(chalk.yellow("Loading previous content..."));

    // Load each existing section
    for (let i = 1; i <= processedSections; i++) {
      // Find the corresponding section
      const section = sections[i - 1];
      if (!section) continue;

      // Construct the filename based on the pattern
      const sectionFileName = `${String(i).padStart(2, "0")}-${section.h2Heading
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
        .slice(0, 30)}.md`;

      const sectionFilePath = path.join(articleDir, sectionFileName);

      // Read the file content
      if (fs.existsSync(sectionFilePath)) {
        const sectionContent = fs.readFileSync(sectionFilePath, "utf8");
        fullBlogContent += `\n${sectionContent}\n`;
      }
    }

    // Try to load the full content if it exists
    const fullContentPath = path.join(articleDir, "FULL_POST.md");
    if (fs.existsSync(fullContentPath)) {
      console.log(chalk.cyan("Found full post content, loading..."));
      const fullPostContent = fs.readFileSync(fullContentPath, "utf8");

      // Extract just the content without the header
      const contentWithoutHeader = fullPostContent.replace(
        /^---[\s\S]*?---\s*/,
        ""
      );
      fullBlogContent = contentWithoutHeader;
    }
  }

  // 5. Section Loop
  console.log(chalk.yellow("Phase 2: Section-by-Section Generation..."));

  for (let i = processedSections; i < sections.length; i++) {
    const section = sections[i];
    console.log(
      chalk.cyan(
        `Generating Section [${i + 1}/${sections.length}]: ${section.h2Heading}`
      )
    );

    // A. Generate Blog Content (Gemini)
    // Create a combined header that includes H3 subheadings for context
    const combinedHeader =
      section.h2Heading +
      (section.h3Subheadings.length > 0
        ? `\nWith subheadings:\n${section.h3Subheadings.join("\n")}`
        : "");

    // Get previous and upcoming sections (not individual headings)
    const previousSections = sections.slice(0, i).map((s) => s.h2Heading);
    const upcomingSections = sections.slice(i + 1).map((s) => s.h2Heading);

    const { content: sectionBody, usage } = await generateContent(
      SECTION_PROMPT(
        combinedHeader,
        articleData,
        fullBlogContent.slice(-2000),
        previousSections,
        upcomingSections,
        articleData.referenceLinks, // Pass extracted reference links
        articleData.faqs,           // Pass extracted FAQs
        articleData.internalLinks   // Pass extracted internal/website links
      ),
      `Write the content for section: ${section.h2Heading}`
    );

    // Track Usage
    costTracker.track(`Section: ${section.h2Heading}`, usage);

    // B. Save Individual Section File
    // FAILSAFE: Forcefully replace any remaining em-dashes with hyphens
    const cleanSectionBody = sectionBody.replace(/—/g, "-");
    let finalSectionContent = `\n${cleanSectionBody}\n`;

    const sectionFileName = `${String(i + 1).padStart(
      2,
      "0"
    )}-${section.h2Heading
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 30)}.md`;
    fs.writeFileSync(
      path.join(articleDir, sectionFileName),
      finalSectionContent
    );

    // Accumulate for Context
    fullBlogContent += finalSectionContent;

    // Safety pause to avoid hitting rate limits too hard if using free tier, and to mimic "thinking"
    await sleep(1000);
  }

  // --- MANDATORY SECTIONS (FAQ & CONCLUSION) ---
  console.log(chalk.yellow("Phase 3: Ensuring Mandatory Sections (FAQ & Conclusion)..."));
  
  // Re-scan directory to find current max section number and existing files
  const currentFiles = fs.readdirSync(articleDir);
  let maxSectionNum = 0;
  let hasFaq = false;
  let hasConclusion = false;

  for (const file of currentFiles) {
    const match = file.match(/^(\d+)-/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSectionNum) maxSectionNum = num;
    }
    if (file.toLowerCase().includes("faq") || file.toLowerCase().includes("questions")) hasFaq = true;
    if (file.toLowerCase().includes("conclusion")) hasConclusion = true;
  }
  
  // Also check fullBlogContent for headers if files were manually merged or something (fallback)
  if (!hasFaq && /#\s*Frequently Question/i.test(fullBlogContent)) hasFaq = true;
  if (!hasConclusion && /#\s*Conclusion/i.test(fullBlogContent)) hasConclusion = true;

  // 1. Generate Conclusion if missing (Order: Intro -> Body -> Conclusion -> FAQ)
  if (!hasConclusion) {
    console.log(chalk.cyan(`Generating Mandatory Section: Conclusion`));
    const conclusionHeader = "Conclusion";
    const { content: conclusionBody, usage: conclusionUsage } = await generateContent(
      SECTION_PROMPT(
        conclusionHeader,
        articleData,
        fullBlogContent, // Passing FULL content as context
        ["(Entire Blog Context)"],
        [],
        articleData.referenceLinks,
        articleData.faqs,
        articleData.internalLinks
      ),
      `Write the Conclusion section based on the blog content provided.`
    );
    
    costTracker.track("Conclusion", conclusionUsage);

    maxSectionNum++;
    const conclusionFileName = `${String(maxSectionNum).padStart(2, "0")}-conclusion.md`;
    // FAILSAFE: Forcefully replace any remaining em-dashes with hyphens
    const cleanConclusionBody = conclusionBody.replace(/—/g, "-");
    const finalConclusionContent = `\n${cleanConclusionBody}\n`;

    fs.writeFileSync(path.join(articleDir, conclusionFileName), finalConclusionContent);
    fullBlogContent += finalConclusionContent;
    await sleep(1000);
  } else {
    console.log(chalk.gray("Conclusion section already exists. Skipping."));
  }

  // 2. Generate FAQ if missing
  if (!hasFaq) {
    console.log(chalk.cyan(`Generating Mandatory Section: Frequently Asked Questions`));
    const faqHeader = "Frequently Asked Questions";
    const { content: faqBody, usage: faqUsage } = await generateContent(
      SECTION_PROMPT(
        faqHeader,
        articleData,
        fullBlogContent, // Passing FULL content as context
        ["(Entire Blog Context)"], 
        ["Conclusion"],
        articleData.referenceLinks,
        articleData.faqs,
        articleData.internalLinks
      ),
      `Write the Frequently Asked Questions section based on the blog content provided.`
    );
    
    costTracker.track("FAQ", faqUsage);

    maxSectionNum++;
    const faqFileName = `${String(maxSectionNum).padStart(2, "0")}-frequently-asked-questions.md`;
    // FAILSAFE: Forcefully replace any remaining em-dashes with hyphens
    const cleanFaqBody = faqBody.replace(/—/g, "-");
    const finalFaqContent = `\n${cleanFaqBody}\n`;
    
    fs.writeFileSync(path.join(articleDir, faqFileName), finalFaqContent);
    fullBlogContent += finalFaqContent;
    await sleep(1000);
  } else {
    console.log(chalk.gray("FAQ section already exists. Skipping."));
  }

  // 6. Final Compilation
  console.log(chalk.green("Phase 5: Compilation..."));
  
  // Generate Meta Data
  console.log(chalk.cyan("Generating Meta Data (Title, Description, Page Title)..."));
  
  let metaData = {
    metaTitle: articleData.title,
    metaDescription: "",
    pageTitle: articleData.title
  };

  try {
    const { content: metaResponse, usage: metaUsage } = await generateContent(
        META_DATA_PROMPT(articleData),
        "Write the meta data in JSON format."
    );

    costTracker.track("Metadata", metaUsage);

    // Attempt to parse JSON
    const jsonMatch = metaResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      metaData = JSON.parse(jsonMatch[0]);
    } else {
        // Fallback or log warning
        console.warn("Could not parse JSON from Meta Data response, using raw output for description if possible");
        metaData.metaDescription = metaResponse.slice(0, 160);
    }
  } catch (e) {
    console.error("Error generating/parsing metadata:", e);
  }

  // Get Totals
  const totals = costTracker.getTotals();

  console.log(chalk.magenta(`\n💰 Usage Report:`));
  console.log(chalk.magenta(`   Input Tokens: ${totals.promptTokens}`));
  console.log(chalk.magenta(`   Output Tokens: ${totals.completionTokens}`));
  console.log(chalk.magenta(`   Total Estimated Cost: $${totals.cost.toFixed(4)}`));

  const fullFilePath = path.join(articleDir, "FULL_POST.md");

  // Add Metadata Header
  const header = `---
title: ${metaData.pageTitle || articleData.title}
meta_title: ${metaData.metaTitle}
description: ${metaData.metaDescription}
slug: ${slug}
date: ${articleData.publishDate || new Date().toISOString().split("T")[0]}
author: ${articleData.author}
total_tokens: ${totals.promptTokens + totals.completionTokens}
input_tokens: ${totals.promptTokens}
output_tokens: ${totals.completionTokens}
estimated_cost_usd: ${totals.cost.toFixed(4)}
---

`;

  fs.writeFileSync(fullFilePath, header + fullBlogContent);

  console.log(chalk.green(`\nCOMPLETED: ${articleData.title}`));
  console.log(`Saved to: ${articleDir}`);
};
