import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const listModels = async () => {
  let apiUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error(chalk.red("Error: OPENAI_API_KEY is not set."));
    process.exit(1);
  }

  // Normalize URL logic similar to llm.js but for /models endpoint
  // If it ends in /chat/completions, strip it. 
  if (apiUrl.endsWith("/chat/completions")) {
    apiUrl = apiUrl.replace(/\/chat\/completions$/, "");
  }
  // Strip trailing slash
  apiUrl = apiUrl.replace(/\/+$/, "");

  // Append /models if not present (heuristic)
  // Standard OpenAI is BASE/v1/models
  // If user provided BASE/v1, we want BASE/v1/models
  // If user provided BASE/v1/chat/completions, we stripped to BASE/v1, now append /models
  const modelsUrl = `${apiUrl}/models`;

  console.log(chalk.blue(`Fetching models from: ${modelsUrl}`));

  try {
    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request Failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      console.log(chalk.green("\nAvailable Models:"));
      data.data.forEach(model => {
        console.log(`- ${model.id}`);
      });
    } else {
      console.log(chalk.yellow("Unexpected response format:"), data);
    }

  } catch (error) {
    console.error(chalk.red("Error fetching models:"), error.message);
  }
};

listModels();
