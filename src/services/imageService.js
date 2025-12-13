import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  BRAND_IMAGE_GENERATION_PROMPT,
  BRAND_COLOR_PALETTE,
} from "../utils/prompts.js";

export const getImageLink = (slug, imageName) => {
  if (!imageName) return null;

  const publicPath = `/images/${slug}/${imageName}`;
  const localCheckPath = path.join(
    process.cwd(),
    "public",
    "images",
    slug,
    imageName
  );

  return `![${imageName}](${publicPath})`;
};

export const ensurePublicDir = () => {
  const dir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Convert dimensions to Google Imagen aspect ratio
 * @param {Object} dimensions - {width: number, height: number}
 * @returns {string} - Aspect ratio string for Google Imagen API
 */
const getAspectRatio = (dimensions) => {
  const { width, height } = dimensions;
  const ratio = width / height;

  // Common aspect ratios supported by Google Imagen API
  const ratios = {
    "1:1": 1,
    "3:4": 0.75,
    "4:3": 1.333,
    "16:9": 1.778,
    "9:16": 0.556,
  };

  // Find the closest match
  let closestRatio = "1:1";
  let minDifference = Math.abs(ratio - ratios["1:1"]);

  for (const [aspect, value] of Object.entries(ratios)) {
    const difference = Math.abs(ratio - value);
    if (difference < minDifference) {
      minDifference = difference;
      closestRatio = aspect;
    }
  }

  return closestRatio;
};

/**
 * Generate an enhanced image with widescreen support and logo integration
 * @param {string} prompt - The base prompt for image generation
 * @param {string} slug - Directory slug for saving the image
 * @param {number} numberOfImages - Number of images to generate
 * @param {Object} dimensions - Object with width and height {width: number, height: number}
 * @param {string} brandingPrompt - Optional branding prompt to concatenate
 * @param {Object} logoOptions - Options for logo integration
 * @returns {Promise<Array>} - Array of generated image filenames
 */
export const generateImage = async (
  prompt,
  slug = "generated",
  numberOfImages = 1,
  dimensions = { width: 1408, height: 768 }, // Default to 16:9 widescreen
  brandingPrompt = null,
  logoOptions = { include: true, position: "top-right", opacity: 1 }
) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });

  // Get aspect ratio for prompt enhancement
  const aspectRatio = getAspectRatio(dimensions);

  // Create the full prompt by concatenating branding prompt if provided
  let fullPrompt = prompt;

  if (brandingPrompt) {
    fullPrompt = `${prompt}\n\n${brandingPrompt}`;
  } else {
    // Use default brand prompt if none provided
    const defaultBrandPrompt = `
#BRAND GUIDELINES WITH EXACT COLOR CODES (Do Not include this in the final image):
- Primary Background: ${BRAND_COLOR_PALETTE.primary[500]} (brown theme)
- Secondary Accent: ${BRAND_COLOR_PALETTE.secondary[500]} (blue accent)
- Success Elements: ${BRAND_COLOR_PALETTE.success[500]} (green indicators)
- Text Color: ${BRAND_COLOR_PALETTE.neutral.dark} (dark text)
- White: ${BRAND_COLOR_PALETTE.neutral.white} (contrast elements)
- Professional and clean design aesthetic
- Brand color consistency throughout
    `;
    fullPrompt = `${prompt}\n\n${defaultBrandPrompt}`;
  }

  // Add logo integration if requested
  if (logoOptions.include) {
    const logoIntegrationPrompt = `
#LOGO INTEGRATION:
- Include company logo in ${logoOptions.position} corner
- Logo should be ${logoOptions.opacity * 100}% opacity (semi-transparent)
- Logo should be appropriately sized (10-15% of image width)
- Logo should not interfere with main content
- Maintain professional appearance with logo placement
    `;
    fullPrompt = `${fullPrompt}\n\n${logoIntegrationPrompt}`;
  }

  console.log(
    `Generating WIDESCREEN ${aspectRatio} image (${dimensions.width}x${dimensions.height})`
  );

  console.log("fullPrompt", fullPrompt);

  // Use the correct JavaScript SDK structure (based on documentation)
  const response = await ai.models.generateImages({
    model: "imagen-4.0-ultra-generate-001",
    prompt: fullPrompt,
    config: {
      numberOfImages: numberOfImages,
      aspectRatio: "16:9",
    },
  });

  const generatedImages = [];
  let idx = 1;

  // Ensure the directory exists for this slug
  const slugDir = path.join(process.cwd(), "public", "images", slug);
  if (!fs.existsSync(slugDir)) {
    fs.mkdirSync(slugDir, { recursive: true });
  }

  for (const generatedImage of response.generatedImages) {
    const imgBytes = generatedImage.image.imageBytes;
    const buffer = Buffer.from(imgBytes, "base64");
    const filename = `imagen-${idx}.png`;
    const filepath = path.join(slugDir, filename);
    fs.writeFileSync(filepath, buffer);
    generatedImages.push(filename);
    idx++;
  }

  return generatedImages;
};

/**
 * Generate a widescreen brand-aware infographic (16:9 aspect ratio)
 * @param {Object} infographicData - The data for the infographic
 * @param {string} logoPreference - Preferred logo color ('auto', 'dark_blue', 'primary', 'white')
 * @param {string} slug - Directory slug for saving the image
 * @param {Object} logoOptions - Logo integration options
 * @returns {Promise<Array>} - Array of generated image filenames
 */
export const generateBrandInfographic = async (
  infographicData,
  logoPreference = "auto",
  slug = "infographics",
  logoOptions = { include: true, position: "bottom-right", opacity: 0.8 }
) => {
  // Generate the brand-aware prompt
  const brandPrompt = BRAND_IMAGE_GENERATION_PROMPT(
    infographicData,
    logoPreference
  );

  // Use widescreen dimensions (16:9 aspect ratio)
  const widescreenDimensions = { width: 1920, height: 1080 };

  // Add specific widescreen requirements
  const fullPrompt = `${brandPrompt}

WIDESCREEN INFOGRAPHIC SPECIFICATIONS:
- Create a WIDESCREEN 16:9 aspect ratio infographic (1920x1080 pixels)
- This is a WIDESCREEN format, NOT square (not 1024x1024)
- Professional infographic layout optimized for widescreen displays
- Content should be arranged horizontally for maximum impact
- Maintain readability across the widescreen format
- Ensure landscape/widescreen orientation, not portrait or square

Please generate the WIDESCREEN infographic now.`;

  return await generateImage(
    fullPrompt,
    slug,
    1,
    widescreenDimensions,
    null,
    logoOptions
  );
};

/**
 * Generate multiple brand infographics with different logo variations (Widescreen)
 * @param {Object} infographicData - The data for the infographics
 * @param {Array} logoVariations - Array of logo preferences to test
 * @param {string} slug - Directory slug for saving the images
 * @param {Object} logoOptions - Logo integration options
 * @returns {Promise<Object>} - Object with results for each logo variation
 */
export const generateBrandInfographicVariations = async (
  infographicData,
  logoVariations = ["auto", "dark_blue", "primary", "white"],
  slug = "infographics",
  logoOptions = { include: true, position: "bottom-right", opacity: 0.8 }
) => {
  const results = {};

  for (const logoVar of logoVariations) {
    try {
      const variationSlug = `${slug}_${logoVar}`;
      const images = await generateBrandInfographic(
        infographicData,
        logoVar,
        variationSlug,
        logoOptions
      );
      results[logoVar] = {
        success: true,
        images: images,
        logoPreference: logoVar,
      };
    } catch (error) {
      results[logoVar] = {
        success: false,
        error: error.message,
        logoPreference: logoVar,
      };
    }
  }

  return results;
};

/**
 * Get available brand logos
 * @returns {Array} - Array of available logo filenames
 */
export const getAvailableBrandLogos = () => {
  const logosDir = path.join(process.cwd(), "public", "images");
  const logoFiles = [];

  if (fs.existsSync(logosDir)) {
    const files = fs.readdirSync(logosDir);
    logoFiles.push(...files.filter((file) => file.includes("logo")));
  }

  return logoFiles;
};

/**
 * Get logo file content for integration
 * @param {string} logoFilename - Name of the logo file
 * @returns {Object} - Logo file information
 */
export const getLogoFile = (logoFilename) => {
  const logosDir = path.join(process.cwd(), "public", "images");
  const logoPath = path.join(logosDir, logoFilename);

  if (fs.existsSync(logoPath)) {
    const stats = fs.statSync(logoPath);
    return {
      filename: logoFilename,
      path: logoPath,
      size: stats.size,
      exists: true,
    };
  }

  return {
    filename: logoFilename,
    exists: false,
  };
};
