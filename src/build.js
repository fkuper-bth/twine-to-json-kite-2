const fs = require("fs");
const Uglify = require("uglify-js");

const package = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const code = fs.readFileSync("src/twine-to-json.js", "utf-8");
const js = Uglify.minify(code);

var html = fs.readFileSync("templates/storyFormat.html", "utf-8");
html = html.replace("{{SCRIPT}}", js.code);
html = html.replace("{{COMMAND}}", 'twineToJSON("harlowe-3")');

const outputJSON = {
    name: package.name,
    version: package.version,
    author: package.author,
    description: package.description,
    proofing: false,
    source: html,
};

if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
}

const outputString = "window.storyFormat(" + JSON.stringify(outputJSON, null, 2) + ");";
fs.writeFile("dist/format.js", outputString, function (err) {
    if (err) {
        console.log("Error building story format:", err);
    } else {
        console.log("Successfully built story format to dist/format.js");
    }
});