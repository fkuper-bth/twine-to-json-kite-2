const fs = require('fs');
const { JSDOM } = require('jsdom');
const { twineToJSON } = require('./twine-to-json').default;

// Get the HTML file path from the command-line arguments
const htmlFilePath = process.argv[2];

if (!htmlFilePath) {
    console.error('Error: Please provide the path to the input .html file as an argument.');
    console.error('Usage: npm test -- path/to/your/test.html');
    process.exit(1);
}

// Load the HTML file
const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

// Parse the HTML and convert to JSON
const dom = new JSDOM(htmlContent);
global.document = dom.window.document;

const format = 'harlowe-3'; // or 'twine'
const jsonOutput = twineToJSON(format);

// Save the JSON output
const outputFilePath = 'output.json';
fs.writeFileSync(outputFilePath, JSON.stringify(jsonOutput, null, 2), 'utf8');
console.log(`JSON output saved to ${outputFilePath}`);