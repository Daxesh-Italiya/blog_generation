import fs from "fs";
import path from "path";
import { loadContentCsv } from "./src/services/csvLoader.js";
import { generateContent } from "./src/services/llm.js";
import { INFOGRAPHIC_PROMPT } from "./src/utils/prompts.js";
import chalk from "chalk";

/**
 * Regenerate INFOGRAPHIC_PLAN.md using the new concise prompts
 */
const regenerateInfographicPlan = async (articleData) => {
  console.log(
    chalk.blue(`\n🔄 Regenerating Infographic Plan for: ${articleData.title}`)
  );

  const slug = articleData.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const articleDir = path.join(process.cwd(), "output", slug);
  const infoFilePath = path.join(articleDir, "INFOGRAPHIC_PLAN.md");

  // Ensure output directory exists
  if (!fs.existsSync(articleDir)) {
    fs.mkdirSync(articleDir, { recursive: true });
  }

  // Parse outline into sections (similar to workflow.js)
  const parseOutlineIntoSections = (outline) => {
    const lines = outline
      .split("\n")
      .filter((line) => line.trim().startsWith("H"));
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("H2:")) {
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          h2Heading: trimmedLine,
          h3Subheadings: [],
          content: "",
        };
      } else if (trimmedLine.startsWith("H3:") && currentSection) {
        currentSection.h3Subheadings.push(trimmedLine);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  // Parse sections from the outline
  const sections = parseOutlineIntoSections(articleData.outline);

  let infographicContent = "# Infographic Plan\n\n";

  console.log(
    chalk.yellow(`📝 Analyzing ${sections.length} sections for infographics...`)
  );

  // Generate infographic plan for each section using new concise prompt
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(
      chalk.cyan(
        `Analyzing section [${i + 1}/${sections.length}]: ${section.h2Heading}`
      )
    );

    try {
      // Read the actual section content from the markdown file
      const sectionFileName = `${String(i + 1).padStart(
        2,
        "0"
      )}-${section.h2Heading
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
        .slice(0, 30)}.md`;
      const sectionFilePath = path.join(articleDir, sectionFileName);

      let sectionContent = section.h2Heading; // Default to heading if file not found

      if (fs.existsSync(sectionFilePath)) {
        const fileContent = fs.readFileSync(sectionFilePath, "utf8");
        // Extract just the content part (remove image links at the beginning)
        sectionContent = fileContent.replace(/^!\[.*\]\(.*\)\n\n/, "").trim();
        console.log(
          chalk.gray(
            `📄 Read ${sectionContent.length} characters from section content`
          )
        );
      } else {
        console.log(
          chalk.gray(`⚠️  Section file not found: ${sectionFileName}`)
        );
      }

      // Use the new concise INFOGRAPHIC_PROMPT with actual content
      const sectionPrompt = INFOGRAPHIC_PROMPT(sectionContent);

      // Generate infographic mapping using the concise prompt
      const infoMapping = await generateContent(
        sectionPrompt,
        "Extract infographic details."
      );

      if (!infoMapping.includes("NO_INFOGRAPHIC")) {
        infographicContent += `## For Section: ${section.h2Heading}\n${infoMapping}\n\n`;
        console.log(
          chalk.green(`✅ Generated infographic plan for section ${i + 1}`)
        );
      } else {
        console.log(
          chalk.gray(`⏭️  Skipped section ${i + 1} (no infographic needed)`)
        );
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Error generating infographic for section ${i + 1}:`),
        error.message
      );
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Save the new concise infographic plan
  fs.writeFileSync(infoFilePath, infographicContent);

  console.log(
    chalk.green(`\n✅ INFOGRAPHIC_PLAN.md regenerated successfully!`)
  );
  console.log(chalk.cyan(`📁 Saved to: ${infoFilePath}`));

  return infoFilePath;
};

/**
 * Main function to regenerate infographic plans for all articles
 */
const main = async () => {
  try {
    console.log(chalk.bold("🚀 INFOGRAPHIC PLAN REGENERATOR"));
    console.log(
      chalk.gray("Using new concise prompts with actual section content...\n")
    );

    // Load content from CSV
    const csvPath = path.join(process.cwd(), "content.csv");
    console.log(chalk.blue(`📖 Loading content from: ${csvPath}`));

    const articles = loadContentCsv(csvPath);
    console.log(chalk.cyan(`Found ${articles.length} articles to process.\n`));

    if (articles.length === 0) {
      console.log(chalk.yellow("⚠️  No articles found in CSV."));
      return;
    }

    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(
        chalk.bold(`\n📄 Processing Article ${i + 1}/${articles.length}:`)
      );
      console.log(chalk.bold(`Title: ${article.title}`));

      await regenerateInfographicPlan(article);
    }

    console.log(
      chalk.bold.green("\n🎉 ALL INFOGRAPHIC PLANS REGENERATED SUCCESSFULLY!")
    );
    console.log(
      chalk.cyan(
        "✨ New concise prompts with actual content will generate better, more relevant infographics."
      )
    );
  } catch (error) {
    console.error(chalk.red("💥 Fatal Error:"), error);
  }
};

// Run the regenerator
main();
