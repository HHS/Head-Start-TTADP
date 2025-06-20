const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('clean-zap-report.js', () => {
  const sourceFile = path.join(__dirname, 'sample_owasp_report.html');
  const destinationFile = path.join(__dirname, 'owasp_report_cleaned.html');
  const cleanZapReportScript = path.join(__dirname, '../tools/clean-zap-report.js');

  beforeAll(() => {
    // Create a sample HTML report for testing
    const sampleReport = `
            <html>
            <body>
                <table class="summary">
                    <tr>
                        <td class="risk-1">
                            <div>Low</div>
                        </td>
                        <td align="center">
                            <div>2</div>
                        </td>
                    </tr>
                </table>
                <table class="results">
                    <tr height="24">
                        <th width="20%" class="risk-1"><a id="10096"></a>
                            <div>Low</div>
                        </th>
                        <th class="risk-1">Some Alert to Ignore</th>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>Sample description</td>
                    </tr>
                </table>
            </body>
            </html>
        `;
    fs.writeFileSync(sourceFile, sampleReport);
  });

  afterAll(() => {
    // Clean up the test files
    fs.unlinkSync(sourceFile);
    if (fs.existsSync(destinationFile)) {
      fs.unlinkSync(destinationFile);
    }
  });

  it('should remove findings with ID 10096 and adjust the low risk count', () => {
    // Run the clean-zap-report.js script
    execSync(`node ${cleanZapReportScript} ${sourceFile} ${destinationFile}`);

    // Load the cleaned report
    const cleanedReport = fs.readFileSync(destinationFile, 'utf8');

    // Check that the ignored finding is removed
    expect(cleanedReport).not.toContain('Some Alert to Ignore');

    // Check that the count of low risk findings is decremented
    expect(cleanedReport).toContain('<div>1</div>');
  });
});
