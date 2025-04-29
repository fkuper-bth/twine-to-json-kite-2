const fs = require('fs');
const { JSDOM } = require('jsdom');
const { twineToJSON } = require('./twine-to-json').default;

/**
 * Converts a Twine HTML file to JSON and saves the output.
 * @param {string} htmlFilePath - Path to the input HTML file.
 * @param {string} outputFilePath - Path to save the JSON output.
 * @param {string} format - Format of the Twine file (e.g., 'harlowe-3').
 */
function convertTwineToJSON(htmlFilePath, outputFilePath, format = 'harlowe-3') {
    if (!htmlFilePath) {
        throw new Error('Error: Please provide the path to the input .html file.');
    }

    // Load the HTML file
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

    // Parse the HTML and convert to JSON
    const dom = new JSDOM(htmlContent);
    global.document = dom.window.document;

    const jsonOutput = twineToJSON(format);

    // Save the JSON output
    fs.writeFileSync(outputFilePath, JSON.stringify(jsonOutput, null, 2), 'utf8');
    console.log(`JSON output saved to ${outputFilePath}`);
}

// Run the script if executed directly
if (require.main === module) {
    try {
        const htmlFilePath = process.argv[2];
        const outputFilePath = 'output.json';
        convertTwineToJSON(htmlFilePath, outputFilePath);
    } catch (error) {
        console.error(error.message);
        console.error('Usage: node test.js path/to/your/test.html');
        process.exit(1);
    }
}

module.exports = { convertTwineToJSON };