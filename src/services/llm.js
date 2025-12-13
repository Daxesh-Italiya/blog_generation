import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as fs from "node:fs";
import chalk from "chalk";
dotenv.config();

// Google Client for TEXT and IMAGE PROMPTS
const genAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  : null;

// Google GenAI Client for IMAGE GENERATION
const googleGenAI = process.env.GOOGLE_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })
  : null;

export const generateContent = async (systemPrompt, userPrompt) => {
  if (!genAI) {
    throw new Error("GOOGLE_API_KEY not set. Cannot generate content.");
  }

  try {
    const modelName = process.env.GEMINI_TEXT_MODEL || "gemini-1.5-pro";

    // Configure model with system instruction
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Text Gen Error:", error.message);
    throw error;
  }
};

export const generateImagePrompt = async (description) => {
  if (!genAI) {
    console.warn(
      "GOOGLE_API_KEY not set. Skipping Gemini image prompt generation."
    );
    return `[Image Prompt Placeholder for: ${description}]`;
  }

  try {
    const modelName = process.env.GEMINI_TEXT_MODEL || "gemini-1.5-pro";
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(
      `Create a high-quality, detailed AI image generation prompt for an image described as: ${description}. Output ONLY the prompt.`
    );
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Image Prompt Error:", error.message);
    // Fallback just return description
    return `Image prompt for: ${description}`;
  }
};

// Note: generateImage function has been moved to src/services/imageService.js
// Use the brand-aware generateBrandInfographic function instead for consistent branding
