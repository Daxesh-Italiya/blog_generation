import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const generateContent = async (systemPrompt, userPrompt) => {
  try {
    const modelName = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-pro';
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemPrompt 
    });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    // Fallback or re-throw
    throw error;
  }
};

// Placeholder for Image Generation if user wants actual images later
// Currently standard Google SDK is primarily for text/multimodal input
export const generateImagePrompt = async (description) => {
    // We can use the same text model to refine a prompt
    const modelName = process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-pro';
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(`Create a high-quality AI image generation prompt for: ${description}`);
    return result.response.text();
};

