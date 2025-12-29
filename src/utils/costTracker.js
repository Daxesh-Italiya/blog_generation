
import fs from 'fs';
import path from 'path';

// Rates based on Claude 3.5 Sonnet (as per workflow.js comments)
// $3/1M in, $15/1M out
const COST_RATES = {
  input: 3.00 / 1000000,
  output: 15.00 / 1000000
};

export class CostTracker {
  constructor(outputDir, blogTitle) {
    this.filePath = path.join(outputDir, 'cost-report.json');
    this.blogTitle = blogTitle;
    this.data = {};
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (e) {
        console.warn("Failed to load existing cost report, starting fresh.", e);
        this.data = {};
      }
    }
    
    // Initialize blog key if it doesn't exist
    if (!this.data[this.blogTitle]) {
      this.data[this.blogTitle] = {};
    }
  }

  save() {
    try {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (e) {
        console.error("Failed to save cost report:", e);
    }
  }

  track(sectionName, usage) {
    if (!usage) return;

    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    const inputCost = promptTokens * COST_RATES.input;
    const outputCost = completionTokens * COST_RATES.output;
    const totalSectionCost = inputCost + outputCost;

    // Structure: BlogName -> SectionName -> { input, output, cost }
    this.data[this.blogTitle][sectionName] = {
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      cost: Number(totalSectionCost.toFixed(6))
    };

    this.calculateTotal();
    this.save();
  }
  
  calculateTotal() {
      let totalInput = 0;
      let totalOutput = 0;
      let totalCost = 0;
      
      const sections = this.data[this.blogTitle];
      for (const [key, value] of Object.entries(sections)) {
          if (key === 'TOTAL') continue;
          totalInput += value.inputTokens || 0;
          totalOutput += value.outputTokens || 0;
          totalCost += value.cost || 0;
      }
      
      this.data[this.blogTitle]['TOTAL'] = {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          cost: Number(totalCost.toFixed(6))
      };
  }
  
  getTotals() {
      // Ensure total exists
      if (!this.data[this.blogTitle]['TOTAL']) {
          this.calculateTotal();
      }
      
      const total = this.data[this.blogTitle]['TOTAL'];
      return {
          promptTokens: total.inputTokens,
          completionTokens: total.outputTokens,
          cost: total.cost
      };
  }
}
