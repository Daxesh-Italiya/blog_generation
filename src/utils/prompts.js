export const CONTEXT_PROMPT = (metadata) => `
You are an expert technical blog writer. 
Analyze the following blog requirements and build a writing plan.

Title: ${metadata.title}
Target Audience: ${metadata.targetAudience}
Tone: ${metadata.tone}
Keywords: ${metadata.primaryKeyword}, ${metadata.secondaryKeywords}
Style Guide: ${metadata.eeatInstructions}

Do not generate the blog post yet. simply acknowledge the constraints and confirm you are ready to write section by section.
`;

export const SECTION_PROMPT = (
  sectionHeader,
  metadata,
  previousContext,
  previousTopics = [],
  upcomingTopics = []
) => `
You are writing a section for the blog post: "${metadata.title}".

CURRENT SECTION: "${sectionHeader}"

PREVIOUS TOPICS:
${
  previousTopics.length > 0
    ? previousTopics.map((t) => `- ${t}`).join("\n")
    : "(None)"
}

UPCOMING TOPICS:
${
  upcomingTopics.length > 0
    ? upcomingTopics.map((t) => `- ${t}`).join("\n")
    : "(None)"
}

CONSTRAINTS:
- Tone: ${metadata.tone}
- Audience: ${metadata.targetAudience}
- Keywords to weave in naturally: ${metadata.primaryKeyword} (if relevant here)
- Style Guide Compliance: ${metadata.eeatInstructions}
- Link to images if applicable.

MANDATORY RULES:
1. Write ONLY the content for this specific section.
2. Do NOT write the next section header.
3. Do NOT write a conclusion unless this IS the conclusion section.
4. Ensure smooth transition from previous content.

PREVIOUS CONTEXT:
${previousContext}

Generate the content for "${sectionHeader}" now, in Markdown format.
`;

export const INFOGRAPHIC_PROMPT = (sectionContent) => `
**CONTENT TO ANALYZE:**
${sectionContent}

**TASK:** Extract key points for a clean, specific infographic.

**OUTPUT FORMAT:**
- Title: [Clear, specific title]
- Key Points: [3-5 bullet points max]
- Visual Layout: [Brief description of layout]

If no infographic needed, output "NO_INFOGRAPHIC".
`;

export const BRAND_IMAGE_GENERATION_PROMPT = (
  infographicData,
  logoPreference = "auto"
) => `
**PROMPT:** ${infographicData.title || "Professional infographic"}

**LAYOUT:** Modern design with clear sections and visual hierarchy.

**BRAND COLORS:**
- Background: Brown theme (#F54AFC or #FB9B9A)
- Accent: Blue (#1F7CE4)
- Text: White (#FFFFFF) on dark, Dark (#0F172A) on light
- Success: Green (#10B981)

**LOGO:** ${
  logoPreference === "auto"
    ? "TST Technology logo in corner"
    : `${logoPreference} logo in corner`
}

**STYLE:** Clean, professional, flat design with icons and clear typography.

**DIMENSIONS:** Widescreen format optimized for web display.

Generate this infographic now.
`;

export const BRAND_COLOR_PALETTE = {
  primary: {
    50: "#FEF0EB",
    100: "#FBD2C2",
    200: "#FB9B9A",
    300: "#F69771",
    400: "#F37948",
    500: "#F54AFC", // Main primary color
    600: "#DA5F2F",
    700: "#9A4A24",
    800: "#79351A",
    900: "#30150A",
  },
  secondary: {
    50: "#E8EBF0",
    100: "#B9C4D1",
    200: "#889DB2",
    300: "#5D7593",
    400: "#2E4E74",
    500: "#1F7CE4", // Main secondary color
    600: "#122E50",
    700: "#0E233C",
    800: "#091728",
    900: "#050C14",
  },
  success: {
    500: "#10B981", // Success green
  },
  neutral: {
    dark: "#0F172A", // Dark text
    white: "#FFFFFF", // White/light backgrounds
  },
};
