export const CONTEXT_PROMPT = (metadata) => `
You are an expert technical blog writer. 
Analyze the following blog requirements and build a writing plan.

Title: ${metadata.title}
Target Audience: ${metadata.targetAudience}
Tone: ${metadata.tone}
Keywords: ${metadata.primaryKeyword}, ${metadata.secondaryKeywords}
Style Guide: ${metadata.eeatInstructions}

Do not generate the blog post yet. simply acknowledge the constraints and confirm you are ready to write section by section.

IMPORTANT: You MUST include an "FAQ" section in your writing plan.
`;

export const SECTION_PROMPT = (
  sectionHeader,
  metadata,
  previousContext,
  previousTopics = [],
  upcomingTopics = [],
  referenceLinks = "",
  exampleFaqs = "",
  internalLinks = ""
) => `
You are writing a section for the blog post: "${metadata.title}".
BLOG TITLE: "${metadata.title}" (Keep this core context in mind).

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

### **WRITING GUIDELINES (STRICT ADHERENCE REQUIRED)**
1. **Research & Sourcing**:
   - Understand the topic deeply before writing.
   - Use verified data from authoritative sources (simulate checking for Domain Authority > 21, Spam Score < 10%).
   - **ALWAYS** provide transparent source citations/links for every statistic or claim.
   - Please always verify sources you add for any data or statistics. Please add sources link only after verfiy.
   - Cross-check every link to ensure accuracy.

2. **Tone & Style**:
   - **Simple, Conversational English**: Write like you are talking to a friend.
   - **Active Voice**: Use "We build apps" (not "Apps are built by us").
   - **Human Touches**: Use phrases like "That’s where it gets interesting..." or "Here’s the catch."
   - **Contractions**: Use "I'm", "you're", "we've" for natural flow.
   - **Word Choice**: Use simple words ("use" instead of "utilize", "help" instead of "facilitate"). Avoid jargon unless explained.

3. **Formatting & Structure**:
   - **Short Sentences**: 15–20 words max. Mix short/medium lengths.
   - **Short Paragraphs**: 3-5 sentences max per paragraph.
   - **Scannability**: Use bold highlights, bullet points, and headers.
   - **Constraint**: Keyword density should be **0.8-1.2%** (approx 1 keyword per 100 words). Do NOT force it.

4. **SEO & Content**:
   - **Primary Keyword**: ${metadata.primaryKeyword} (Use naturally).
   - **Secondary Keywords**: ${metadata.secondaryKeywords} (Integrate naturally).
   - **Internal Links**: specific relevant internal links where possible.
   - **User Intent**: Address EXACTLY what the user is looking for in this section.
   - **CRITICAL NEGATIVE CONSTRAINT**: **NEVER** use the em-dash character (—). It is strictly FORBIDDEN. Use a standard hyphen (-) or comma instead. If you generate a —, you have FAILED.

### **SPECIFIC SECTION RULES**

${
  sectionHeader.toLowerCase().includes("introduction")
    ? `**FOR INTRODUCTION:**
- Start with a strong **Hook Line**.
- Provide a **2–3 sentence overview**.
- End with "This blog will cover..." (Use a variation of this, do not use the exact phrase every time).
- Must include the **Primary Keyword** naturally.`
    : ""
}

${
  sectionHeader.toLowerCase().includes("conclusion")
    ? `**FOR CONCLUSION (STRICT LENGTH LIMIT):**
- **Constraint**: Write EXACTLY 3 paragraphs. No more.
- **Paragraph 1**: Summarize key takeaways (Max 40-50 words).
- **Paragraph 2**: Reinforce value and trust (Max 40-50 words).
- **Paragraph 3**: Actionable next step + CTA (Max 30-40 words).
- **Action**: End with "BOOK A FREE CONSULTATION CALL" or "VISIT THE SERVICE PAGE" linking to a relevant service.
- **Negative Constraint**: Do NOT write long paragraphs. Keep it punchy.
${
  internalLinks
    ? `- **CTA LINK**: Use one of the provided **GENERAL WEBSITE LINKS** (e.g., Contact or Services) for the CTA.`
    : ""
}
- Add internal links *above* the Conclusion section.`
    : ""
}

${
  /faq|questions|q&a/.test(sectionHeader.toLowerCase())
     ? `**FOR FAQS (STRICT LENGTH LIMIT):**
- **Constraint**: Answer each question in **2-3 sentences MAXIMUM**.
- **Negative Constraint**: Do NOT write long explanations. Direct answers only.
- Use the provided FAQ list below.

${
  exampleFaqs
    ? `**CONTEXT FAQs (Use these as a base/mandate)**:
${exampleFaqs}

Rule: Answer these questions strictly within the 2-3 sentence limit.`
    : ""
}`
    : ""
}

${
  referenceLinks
    ? `### **INTERNAL REFERENCE LINKS**
The following links are available. Use them **ONLY** if they are highly relevant to this specific section's content.
Format: Link | Description

${referenceLinks}

Rule: If you use a link, integrate it naturally into the text. Do not list them at the end.`
    : ""
}

${
  internalLinks
    ? `### **GENERAL WEBSITE LINKS**
The following links are available (Home, Contact, Services, etc.).
Format: Link | Description

${internalLinks}

Rule: Incorporate these links naturally where relevant in the content. In the Conclusion section, specificially use the appropriate link for the CTA.`
    : ""
}

### **MANDATORY RULES**
1. Write **ONLY** the content for this specific section.
2. Do **NOT** write the next section header.
3. Do **NOT** write a conclusion unless this **IS** the conclusion section.
4. Ensure smooth transition from previous content.

PREVIOUS CONTEXT:
${previousContext}

Generate the content for "${sectionHeader}" now, in Markdown format.
`;

// Image generation prompts and brand palette removed

export const META_DATA_PROMPT = (metadata) => `
You are an SEO expert.
Generate the following metadata for the blog post "Title: ${metadata.title}".

Primary Keyword: ${metadata.primaryKeyword}
Target Audience: ${metadata.targetAudience}

Requirements:
1. **Meta Title**: 50–60 characters. Engaging and includes primary keyword.
2. **Meta Description**: 150–160 characters. Compelling summary with primary keyword.
3. **Page Title**: 60–70 characters. Descriptive and SEO-friendly.

Output format (Strict JSON):
{
  "metaTitle": "...",
  "metaDescription": "...",
  "pageTitle": "..."
}
`;

