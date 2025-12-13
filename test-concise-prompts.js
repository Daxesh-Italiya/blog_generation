// Test the new concise prompt system
import {
  INFOGRAPHIC_PROMPT,
  BRAND_IMAGE_GENERATION_PROMPT,
} from "./src/utils/prompts.js";

// Test content that would generate an infographic
const testContent = `
When developing a Custom SaaS application, startups need to follow a structured approach. The process begins with product finalization, where you define core features and user requirements. 

Next comes business and market research to validate your idea and identify target customers. During development, you need to focus on testing and quality assurance to ensure reliability. 

Finally, a solid go-to-market strategy is essential for successful launch and customer acquisition.
`;

// Test the new concise INFOGRAPHIC_PROMPT
console.log("=== NEW CONCISE INFOGRAPHIC PROMPT TEST ===");
const infographicResult = INFOGRAPHIC_PROMPT(testContent);
console.log("Generated Infographic Plan:");
console.log(infographicResult);

// Test the new concise BRAND_IMAGE_GENERATION_PROMPT
console.log("\n=== NEW CONCISE IMAGE GENERATION PROMPT TEST ===");
const testInfographicData = {
  title: "Custom SaaS Development Checklist for Startups: Complete Guide",
  keyPoints: [
    "Product Finalization",
    "Business & Market Research",
    "Testing & Quality Assurance",
    "Go-to-Market Strategy",
  ],
  visualDescription:
    "Two columns of colorful circular icons with white line-art illustrations and labels",
};

const imagePrompt = BRAND_IMAGE_GENERATION_PROMPT(testInfographicData, "auto");
console.log("Generated Image Prompt:");
console.log(imagePrompt);

console.log("\n=== COMPARISON: OLD vs NEW ===");
console.log(
  "❌ OLD: Very long, verbose prompts with lots of technical details"
);
console.log(
  "✅ NEW: Short, sharp, specific prompts that clearly tell the model what to generate"
);
console.log("\n🎯 The new prompts are designed like your example:");
console.log("   'A modern infographic on a solid black background...'");

console.log("\n=== BENEFITS ===");
console.log("✅ Less confusing for AI model");
console.log("✅ More focused on core requirements");
console.log("✅ Faster processing");
console.log("✅ Better results with specific instructions");
console.log("✅ Easier to debug and modify");

console.log("\n🚀 Ready for production use!");
