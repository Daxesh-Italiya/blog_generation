# Brand-Aware Image Generation System Guide

## Overview

Your image generation system has been updated to include comprehensive brand guidelines, specific dimensions (1408x768 pixels), and logo integration capabilities. The system now automatically applies your brand colors, includes your logos, and maintains consistent visual identity across all generated infographics.

## Key Features

✅ **Exact Dimensions**: All infographics are generated at 1408x768 pixels
✅ **Brown Color Theme**: Primary background color is your brand brown
✅ **Logo Integration**: Automatic integration of your brand logos
✅ **Multiple Logo Variations**: Support for different colored logos
✅ **Brand Consistency**: Maintains your brand identity throughout
✅ **Professional Design**: Clean, modern layout with high contrast

## Available Brand Assets

The system automatically detects and uses your brand logos:

- `dark_blue_logo.png` - Dark blue version of your logo
- `primary_color_logo.png` - Primary brand color logo
- `white_color_logo.png` - White version of your logo

## Usage Examples

### 1. Generate Single Brand Infographic

```javascript
import { generateBrandInfographic } from "./src/services/imageService.js";

const infographicData = {
  title: "API Integration Best Practices",
  keyPoints: [
    "Authentication & Security using OAuth 2.0",
    "Comprehensive Error Handling",
    "Performance Optimization",
  ],
  visualDescription: "Clean design with brown theme",
};

// Generate with auto logo selection
const result = await generateBrandInfographic(
  infographicData,
  "auto",
  "my-infographic"
);

// Generate with specific logo
const result = await generateBrandInfographic(
  infographicData,
  "dark_blue",
  "my-infographic"
);
```

### 2. Generate Multiple Logo Variations

```javascript
import { generateBrandInfographicVariations } from "./src/services/imageService.js";

const infographicData = {
  title: "Security Guidelines",
  keyPoints: ["SSL Encryption", "Access Control", "Data Protection"],
  visualDescription: "Professional security-focused design",
};

// Generate all logo variations
const variations = await generateBrandInfographicVariations(infographicData);
```

### 3. Analyze Content for Infographic Suitability

```javascript
import { INFOGRAPHIC_PROMPT } from "./src/utils/prompts.js";

const sectionContent = "Your blog section content here...";
const analysis = INFOGRAPHIC_PROMPT(sectionContent);
console.log(analysis);
```

## Brand Guidelines Applied

### Color Scheme

- **Primary**: Brown theme background
- **Logo Integration**: Automatically selects appropriate logo color
- **High Contrast**: Ensures text readability
- **Professional**: Clean, modern aesthetic

### Design Standards

- **Dimensions**: Exactly 1408x768 pixels
- **Aspect Ratio**: 1.786:1 (1408:768)
- **Format**: PNG for web optimization
- **Resolution**: High-resolution output

### Logo Usage

- **Auto Selection**: System chooses best logo for background
- **Background Integration**: Logos seamlessly integrated
- **Color Matching**: Logo color adapts to content needs
- **Professional Placement**: Logos positioned for optimal impact

## API Reference

### `generateBrandInfographic(infographicData, logoPreference, slug)`

Generates a single brand-aware infographic.

**Parameters:**

- `infographicData` (Object): Data structure with title, keyPoints, visualDescription
- `logoPreference` (String): "auto", "dark_blue", "primary", "white"
- `slug` (String): Directory name for saving the image

**Returns:** Promise<Array> - Array of generated image filenames

### `generateBrandInfographicVariations(infographicData, logoVariations, slug)`

Generates multiple infographics with different logo variations.

**Parameters:**

- `infographicData` (Object): Same as above
- `logoVariations` (Array): Array of logo preferences to test
- `slug` (String): Base directory name

**Returns:** Promise<Object> - Results object with success/error for each variation

### `getAvailableBrandLogos()`

Returns array of available logo filenames.

**Returns:** Array - Available logo files in public/images/

## Workflow Integration

The updated system seamlessly integrates with your existing workflow:

1. **Content Analysis**: `INFOGRAPHIC_PROMPT` analyzes blog content
2. **Brand Guidelines**: Automatic application of brand rules
3. **Logo Integration**: Smart logo selection and placement
4. **Dimension Control**: Exact 1408x768 pixel output
5. **Quality Assurance**: Professional design standards

## Testing

Run the test script to verify all components:

```bash
node test-brand-image-generation.js
```

This will test:

- ✅ Infographic analysis functionality
- ✅ Brand prompt generation
- ✅ Logo detection
- ✅ Service integration

## Next Steps

Your brand-aware image generation system is now ready for production use. Simply:

1. Use the updated `INFOGRAPHIC_PROMPT` to analyze content
2. Call `generateBrandInfographic()` with your data
3. Get professionally branded infographics at 1408x768 pixels

All generated images will maintain your brand identity with brown backgrounds, integrated logos, and professional design standards.

## Troubleshooting

- **API Key Required**: Make sure GOOGLE_API_KEY is set in your environment
- **Logo Detection**: Ensure logo files are in `public/images/` directory
- **Dimensions**: System enforces 1408x768 pixel output automatically
- **Brand Colors**: Brown theme is applied automatically to all infographics

---

_System updated on 13/12/2025 - Ready for production use!_
