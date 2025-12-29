
import dotenv from "dotenv";
import * as fs from "node:fs";
import chalk from "chalk";
dotenv.config();

// LLM Service for Text Generation

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Retry on 504 Gateway Timeout, 502 Bad Gateway, 500 Internal Server Error, 429 Too Many Requests
      if ([500, 502, 503, 504, 429].includes(response.status)) {
        const errorText = await response.text();
        console.warn(`Attempt ${i + 1} failed with status ${response.status}: ${errorText}. Retrying in ${backoff}ms...`);
        if (i === retries - 1) {
          throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
      } else {
         const errorText = await response.text();
         throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying in ${backoff}ms...`);
      if (i === retries - 1) throw error;
    }
    await sleep(backoff);
    backoff *= 2; // Exponential backoff
  }
};

export const generateContent = async (systemPrompt, userPrompt, { url, modelName, key } = {}) => {
  let apiUrl = url || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  
  // Heuristic: If it doesn't look like a full endpoint and looks like a base URL, append /chat/completions
  // But strictly speaking, standard OpenAI SDKs assume baseURL is just the host+prefix.
  // We'll try to be smart: if it doesn't end in /chat/completions and also doesn't end in /v1 (sometimes people leave it off),
  // we effectively want to normalize it. 
  // Safest: check if it ends with /chat/completions. If not, append it.
  
  // However, some might pass a full custom URL that ISN'T /chat/completions. 
  // Let's assume if it came from environment OPENAI_BASE_URL, it might need appending. 
  // If it came from `url` argument, we assume caller knows what they are doing.
  
  if (!url && process.env.OPENAI_BASE_URL && !apiUrl.endsWith("/chat/completions")) {
      // Remove trailing slash if present
      apiUrl = apiUrl.replace(/\/+$/, "");
      apiUrl += "/chat/completions";
  }

  const apiModel = modelName || process.env.OPENAI_MODEL_NAME || "gpt-4o";
  const apiKey = key || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key not set. Cannot generate content. Please provide a key or set OPENAI_API_KEY.");
  }

  // Debug logging to help identify config issues
  console.log(chalk.gray(`[LLM] Using Provider: ${new URL(apiUrl).hostname}, Model: ${apiModel}`));

  try {
    const response = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 }
    };
  } catch (error) {
    console.error("Text Gen Error:", error.message);
    throw error;
  }
};
