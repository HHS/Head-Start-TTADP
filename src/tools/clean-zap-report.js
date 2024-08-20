const fs = require('fs');
const cheerio = require('cheerio');

// Get command-line arguments for source and destination files
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node clean-zap-report.js <sourceFile> <destinationFile>');
  process.exit(1);
}

const sourceFile = args[0];
const destinationFile = args[1];

// List of rules to remove
const ignoreIds = ['10096'];

fs.readFile(sourceFile, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading the source file: ${err.message}`);
    process.exit(1);
  }

  const $ = cheerio.load(data);

  ignoreIds.forEach((id) => {
    // Remove summary table entries
    $(`a[href="#${id}"]`).parents('tr').remove();

    // Remove detailed sections
    $(`#${id}`).parents('table.results').remove();

    // Adjust the count in the summary table
    const lowRiskCountCell = $('td:contains("Low")').next('td').find('div');
    const lowRiskCount = parseInt(lowRiskCountCell.text(), 10);
    if (!Number.isNaN(lowRiskCount) && lowRiskCount > 0) {
      lowRiskCountCell.text(lowRiskCount - 1);
    } else {
      lowRiskCountCell.text(lowRiskCount);
    }
  });

  fs.writeFile(destinationFile, $.html(), 'utf8', (error) => {
    if (error) {
      console.error(`Error writing to the destination file: ${error.message}`);
      process.exit(1);
    }
    console.log(`Cleaned report saved to ${destinationFile}`);
  });
});
