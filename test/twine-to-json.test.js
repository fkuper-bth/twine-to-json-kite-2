const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Ensure the function is loaded
require('../src/twine-to-json');

// Define test cases with input and expected output file paths
const testCases = [
    {
        input: 'simple_story.html',
        expected: 'simple_story.json',
        format: 'twine',
    },
    {
        input: 'harlowe_story.html',
        expected: 'harlowe_story.json',
        format: 'harlowe-3',
    },
    {
        input: 'kite2_story.html',
        expected: 'kite2_story.json',
        format: 'harlowe-3',
    }
];

describe('twineToJSON with multiple input files', () => {
    beforeEach(() => {
        delete global.document; // Ensure a clean global document before each test
    });

    afterEach(() => {
        delete global.document;
    });

    testCases.forEach(({ input, expected, format }) => {
        it(`should correctly parse ${input} and match ${expected}`, () => {
            // Arrange: setup the global document and load the expected JSON
            setupGlobalDocument(input);
            const jsonFilePath = path.join(__dirname, 'resources', expected);
            const expectedResult = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
            expectedResult.createdAtMs = expect.any(Number); // Allow for any timestamp

            // Act: run the function
            const result = twineToJSON(format);

            // Assert: compare the result with the expected JSON
            expect(result).toEqual(expectedResult);
        });
    });

    it('should throw an error for invalid format', () => {
        // Arrange: setup the global document
        setupGlobalDocument('simple_story.html');

        // Act & Assert: check for error when using an invalid format
        expect(() => twineToJSON('invalid-format')).toThrow('Format is not valid.');
    });
});

function setupGlobalDocument(fileName) {
    // Load the HTML input file
    const htmlFilePath = path.join(__dirname, 'resources', fileName);
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

    // Parse the HTML content
    const dom = new JSDOM(htmlContent);
    global.document = dom.window.document;
}