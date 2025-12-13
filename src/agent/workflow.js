import fs from "fs";
import path from "path";
import { generateContent, generateImagePrompt } from "../services/llm.js";
import {
  CONTEXT_PROMPT,
  SECTION_PROMPT,
  INFOGRAPHIC_PROMPT,
} from "../utils/prompts.js";
import {
  getImageLink,
  ensurePublicDir,
  generateImage,
} from "../services/imageService.js";
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

/**
 * Parse the INFOGRAPHIC_PLAN.md file to extract image prompts
 * @param {string} planPath - Path to the INFOGRAPHIC_PLAN.md file
 * @returns {Array} - Array of objects containing section and image prompt
 */
const parseImagePrompts = (planPath) => {
  if (!fs.existsSync(planPath)) {
    console.warn(
      chalk.yellow(
        `Infographic plan not found at ${planPath}. Skipping image generation.`
      )
    );
    return [];
  }

  const content = fs.readFileSync(planPath, "utf8");
  const imagePrompts = [];

  // Split content by section markers (## For Section:)
  const sections = content.split("## For Section:");

  // Process each section (skip the first one which is the header)
  for (let i = 1; i < sections.length; i++) {
    const sectionContent = sections[i].trim();

    // Extract the section title (first line)
    const firstLine = sectionContent.split("\n")[0].trim();
    const sectionTitle = firstLine.replace(/^: /, "");

    // Look for "Visual Description" section
    const visualDescMatch = sectionContent.match(
      /Visual Description.*?:\s*(.*?)(?=\n\n|\n##|$)/s
    );

    if (visualDescMatch && visualDescMatch[1]) {
      const visualDescription = visualDescMatch[1].trim();

      // Create a simplified prompt for image generation
      // In a real implementation, you might want to process this more carefully
      const imagePrompt = `Create a professional, modern infographic based on this description: ${visualDescription}`;

      // Create a sanitized filename from the section title
      const filename = sectionTitle
        .replace(/H2: /, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase();

      imagePrompts.push({
        sectionTitle,
        prompt: imagePrompt,
        filename,
      });
    }
  }

  return imagePrompts;
};

export const runWorkflow = async (articleData) => {
  console.log(chalk.blue(`\nProcessing Article: ${articleData.title}`));

  // 1. Setup Output Dir
  const slug = articleData.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const articleDir = path.join(OUTPUT_DIR, slug);
  if (!fs.existsSync(articleDir)) {
    fs.mkdirSync(articleDir, { recursive: true });
  }
  ensurePublicDir();

  // 2. Parse Outline into sections
  console.log(chalk.yellow("Parsing outline into sections..."));
  const sections = parseOutlineIntoSections(articleData.outline);
  console.log(chalk.cyan(`Found ${sections.length} main sections`));

  // 3. Context Phase
  console.log(chalk.yellow("Phase 1: Context Setup..."));
  // We inform the LLM of the context, but for 'no approval' mode we mainly just initialize our internal memory
  let fullBlogContent = "";
  let infographicContent = "# Infographic Plan\n\n";

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

    // Try to load the infographic plan if it exists
    const infoPath = path.join(articleDir, "INFOGRAPHIC_PLAN.md");
    if (fs.existsSync(infoPath)) {
      console.log(chalk.cyan("Found infographic plan, loading..."));
      const infoContent = fs.readFileSync(infoPath, "utf8");
      infographicContent = infoContent;
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

    const sectionBody = await generateContent(
      SECTION_PROMPT(
        combinedHeader,
        articleData,
        fullBlogContent.slice(-2000),
        previousSections,
        upcomingSections
      ),
      `Write the content for section: ${section.h2Heading}`
    );

    // B. Handle Images
    let finalSectionContent = `\n${sectionBody}\n`;

    // Check if we need to insert Hero Image at the start
    if (i === 0 && articleData.heroImage) {
      const link = getImageLink(slug, path.basename(articleData.heroImage));
      if (link) finalSectionContent = `${link}\n\n${finalSectionContent}`;
    }

    // [New] Generate Image Prompt using Gemini if Image Include is Yes
    if (articleData.imageInclude) {
      const imgPrompt = await generateImagePrompt(
        `An illustration for a blog section titled "${
          section.h2Heading
        }": ${sectionBody.slice(0, 100)}...`
      );
      finalSectionContent += `\n\n<!-- AI Image Prompt: ${imgPrompt.trim()} -->\n`;
    }

    // C. Save Individual Section File
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

    // D. Generate Infographic Mapping (Parallel)
    const infoMapping = await generateContent(
      INFOGRAPHIC_PROMPT(sectionBody),
      "Extract infographic details."
    );
    if (!infoMapping.includes("NO_INFOGRAPHIC")) {
      infographicContent += `## For Section: ${section.h2Heading}\n${infoMapping}\n\n`;
    }

    // Safety pause to avoid hitting rate limits too hard if using free tier, and to mimic "thinking"
    await sleep(1000);
  }

  // 6. Final Compilation
  console.log(chalk.green("Phase 5: Compilation..."));
  const fullFilePath = path.join(articleDir, "FULL_POST.md");
  const infoFilePath = path.join(articleDir, "INFOGRAPHIC_PLAN.md");

  // Add Metadata Header
  const header = `---
title: ${articleData.title}
slug: ${slug}
date: ${articleData.publishDate || new Date().toISOString().split("T")[0]}
author: ${articleData.author}
---

`;

  fs.writeFileSync(fullFilePath, header + fullBlogContent);
  fs.writeFileSync(infoFilePath, infographicContent);

  console.log(chalk.green(`\nCOMPLETED: ${articleData.title}`));
  console.log(`Saved to: ${articleDir}`);

  // 7. Generate Images from Infographic Plan
  console.log(
    chalk.yellow("Phase 6: Generating Images from Infographic Plan...")
  );

  // Parse the infographic plan to extract image prompts
  const imagePrompts = parseImagePrompts(infoFilePath);

  console.log(imagePrompts);

  if (imagePrompts.length > 0) {
    console.log(
      chalk.cyan(`Found ${imagePrompts.length} image prompts to generate.`)
    );

    // Create directory for images
    const imagesDir = path.join(articleDir, "images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Generate each image
    for (const imgPrompt of imagePrompts) {
      console.log(
        chalk.cyan(`Generating image for: ${imgPrompt.sectionTitle}`)
      );

      try {
        // Generate the image using the enhanced generateImage function
        const imageFilenames = await generateImage(
          imgPrompt.prompt, // prompt
          imgPrompt.filename, // slug
          1, // numberOfImages
          { width: 1408, height: 768 }, // dimensions
          null // brandingPrompt (use default)
        );

        if (imageFilenames && imageFilenames.length > 0) {
          const imageFilename = imageFilenames[0];
          const imagePath = path.join(imagesDir, imageFilename);

          console.log(
            chalk.green(`Image generated successfully: ${imagePath}`)
          );

          // Add image link to the corresponding section file
          const sectionFileName = imgPrompt.filename + ".md";
          const sectionFilePath = path.join(articleDir, sectionFileName);

          if (fs.existsSync(sectionFilePath)) {
            // Read the current content
            let sectionContent = fs.readFileSync(sectionFilePath, "utf8");

            // Add the image link
            const imageLink = `\n![Infographic for ${imgPrompt.sectionTitle}](images/${imageFilename})\n`;
            sectionContent += imageLink;

            // Write the updated content
            fs.writeFileSync(sectionFilePath, sectionContent);
            console.log(chalk.green(`Added image link to ${sectionFileName}`));
          }
        }
      } catch (error) {
        console.error(
          chalk.red(`Error generating image for ${imgPrompt.sectionTitle}:`),
          error
        );
      }

      // Pause between image generations
      await sleep(2000);
    }

    console.log(chalk.green("Image generation complete!"));
  } else {
    console.log(chalk.yellow("No image prompts found in infographic plan."));
  }
};
