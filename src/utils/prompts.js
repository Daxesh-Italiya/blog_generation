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

export const SECTION_PROMPT = (sectionHeader, metadata, previousContext) => `
You are writing a section for the blog post: "${metadata.title}".

CURRENT SECTION: "${sectionHeader}"

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
Analyze the following blog section content and extract key points suitable for an infographic.

CONTENT:
${sectionContent}

OUTPUT FORMAT:
- Infographic Title
- Key Data Points / Bullets
- Visual Description (for a designer)

If no infographic is suitable for this section, output "NO_INFOGRAPHIC".
`;
