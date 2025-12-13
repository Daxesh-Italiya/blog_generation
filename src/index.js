import { loadContentCsv } from './services/csvLoader.js';
import { runWorkflow } from './agent/workflow.js';
import path from 'path';
import chalk from 'chalk';

const main = async () => {
  try {
    const csvPath = path.join(process.cwd(), 'content.csv');
    console.log(chalk.bold('--- Blog Generator Agent ---'));
    console.log(`Loading content from: ${csvPath}`);

    const articles = loadContentCsv(csvPath);
    console.log(`Found ${articles.length} articles to process.`);
    
    // For this POC, we process the first one, or loop through all.
    // User requested "take source content.csv", implies bulk or sequential.
    
    if (articles.length === 0) {
        console.log("No articles found in CSV.");
        return;
    }

    // Process all sequentially
    for (const article of articles) {
       // Check status if needed, or just process all. 
       // CSV has 'Status' column but we can ignore or filter.
       await runWorkflow(article);
    }

    console.log(chalk.bold.green('\nAll Tasks Completed.'));

  } catch (error) {
    console.error(chalk.red('Fatal Error:'), error);
  }
};

main();
