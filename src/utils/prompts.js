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
Analyze the following blog section content and extract key points suitable for an infographic with brand consistency.

CONTENT:
${sectionContent}

BRAND GUIDELINES WITH EXACT COLOR CODES:
- Primary Background: Use primary color #F54AFC or lighter shades (#FEF0EB, #FBD2C2) for brown theme
- Include brand logo in background (positioned appropriately)
- Secondary Color: #1F7CE4 for accents and highlights
- Success Green: #10B981 for positive indicators
- Dark Text: #0F172A for high contrast readability
- White: #FFFFFF for text backgrounds and contrast
- Maintain brand color consistency throughout
- Use different colored logos available in public/images/ (dark_blue_logo.png, primary_color_logo.png, white_color_logo.png)
- Ensure professional and clean design
- Brand colors should be prominent and consistent

OUTPUT FORMAT:
- Infographic Title
- Key Data Points / Bullets (formatted for visual appeal)
- Brand-aware Visual Description (for designer with specific color codes)
- Recommended logo color from available options

If no infographic is suitable for this section, output "NO_INFOGRAPHIC".
`;

export const BRAND_IMAGE_GENERATION_PROMPT = (
  infographicData,
  logoPreference = "auto"
) => `
Create an infographic with the following specifications:

BRAND REQUIREMENTS WITH EXACT COLOR CODES:
- Dimensions: 1408x768 pixels
- Primary Background Color: Use primary color #F54AFC or lighter brown shades (#FEF0EB, #FBD2C2, #FB9B9A)
- Secondary Accent Color: #1F7CE4 for highlights and callouts
- Success/Positive Elements: #10B981 for checkmarks, positive indicators
- Text Colors: #0F172A for main text, #FFFFFF for text on dark backgrounds
- Brand logo integration: ${
  logoPreference === "auto"
    ? "Choose appropriate logo from available colors"
    : `Use ${logoPreference} logo`
}
- Professional and clean design aesthetic
- Brand color consistency throughout

INFOGRAPHIC DATA:
${infographicData}

VISUAL DESIGN SPECIFICATIONS WITH COLOR CODES:
- Use primary color #F54AFC as foundation (or lighter shades for brown theme)
- Secondary color #1F7CE4 for emphasis and call-to-action elements
- Success color #10B981 for positive indicators and achievements
- Integrate logo seamlessly in background or corner using appropriate color variant
- Ensure text readability with #0F172A on light backgrounds, #FFFFFF on dark
- Modern, professional layout with brand-identifiable design elements
- Clean typography that matches brand guidelines

TECHNICAL REQUIREMENTS:
- Exact dimensions: 1408x768 pixels
- High resolution output
- PNG format
- Optimized for web use
- Color accuracy: Use exact hex codes provided

Generate an infographic that perfectly represents the brand with precise color specifications while effectively communicating the key information.
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
