const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { JSDOM } = require('jsdom');
const { twineToJSON } = require('./twine-to-json').default;

/**
 * Converts all .html files in a folder to JSON and saves the output as a ZIP file.
 * @param {string} inputFolderPath - Path to the folder containing .html files.
 * @param {string} outputZipPath - Path to save the ZIP file.
 * @param {string} format - Format of the Twine file (e.g., 'harlowe-3').
 */
async function convertFolderToZip(inputFolderPath, outputZipPath, format = 'harlowe-3') {
    const zip = new JSZip();

    // Read all files in the input folder
    const files = fs.readdirSync(inputFolderPath);

    for (const file of files) {
        const filePath = path.join(inputFolderPath, file);

        // Process only .html files
        if (path.extname(file) === '.html') {
            // Load the HTML file
            const htmlContent = fs.readFileSync(filePath, 'utf8');

            // Parse the HTML and convert to JSON
            const dom = new JSDOM(htmlContent);
            global.document = dom.window.document;

            const jsonOutput = twineToJSON(format);

            // Add the JSON output to the ZIP archive
            const jsonFileName = `${path.basename(file, '.html')}.json`;
            zip.file(jsonFileName, JSON.stringify(jsonOutput, null, 2));
            console.log(`Converted ${file} to ${jsonFileName}`);
        }
    }

    // Generate the ZIP file and save it
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(outputZipPath, zipContent);

    console.log(`ZIP file saved to ${outputZipPath}`);
}

// Example usage
if (require.main === module) {
    try {
        const inputFolderPath = process.argv[2];
        const outputZipPath = './build/twee-jsons.zip'; // Replace with your desired ZIP path
        convertFolderToZip(inputFolderPath, outputZipPath)
            .then(() => console.log('Conversion completed!'))
            .catch((error) => console.error('Error:', error.message));
    } catch (error) {
        console.error(error.message);
        console.error('Usage: node convert-folder-to-zip.js path/to/your/folder');
        process.exit(1);
    }
}

module.exports = { convertFolderToZip };