window.storyFormat({
    "name": "Harlowe 3 w/ Kite2 to JSON",
    "version": "0.0.4",
    "author": "Frederik Kuper",
    "description": "Convert Harlowe 3-formatted Twine story with Kite2 customizations to JSON",
    "proofing": false,
    "source": `
<html>
	<head>
        <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
		<title>Harlowe To JSON</title>
        <script type='text/javascript'>
            /**
* Twine To JSON
*
* Copyright (c) 2020 Jonathan Schoonhoven
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
* associated documentation files (the 'Software'), to deal in the Software without restriction,
* including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
* subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial
* portions of the Software.
*
* THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
* LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


const STORY_TAG_NAME = 'tw-storydata';
const PASSAGE_TAG_NAME = 'tw-passagedata';
const FORMAT_TWINE = 'twine';
const FORMAT_HARLOWE_3 = 'harlowe-3';
const VALID_FORMATS = [FORMAT_TWINE, FORMAT_HARLOWE_3];


/**
 * Convert Twine story to JSON.
 */
function twineToJSON(format) {
    const storyElement = document.getElementsByTagName(STORY_TAG_NAME)[0];
    const storyMeta = getElementAttributes(storyElement);
    const result = {
        uuid: storyMeta.ifid,
        name: storyMeta.name,
        creator: storyMeta.creator,
        creatorVersion: storyMeta['creator-version'],
        schemaName: storyMeta.format,
        schemaVersion: storyMeta['format-version'],
        createdAtMs: Date.now(),
        startNode: storyMeta.startnode
    };
    validate(format);
    const passageElements = Array.from(storyElement.getElementsByTagName(PASSAGE_TAG_NAME));
    result.passages = passageElements.map((passageElement) => {
        return processPassageElement(passageElement, format);
    });
    return result;
}


/**
 * Validate story and inputs. Currently this only validates the format arg. TODO: make this more robust.
 */
function validate(format) {
    const isValidFormat = VALID_FORMATS.some(validFormat => validFormat === format);
    if (!isValidFormat) {
        throw new Error('Format is not valid.');
    }
}


/**
 * Convert the HTML element for a story passage to JSON.
 */
function processPassageElement(passageElement, format) {
    const passageMeta = getElementAttributes(passageElement);
    const result = {
        name: passageMeta.name,
        tags: passageMeta.tags,
        id: passageMeta.pid,
    };
    result.text = passageElement.textContent.trim();
    Object.assign(result, processPassageText(result.text, format));
    result.cleanText = sanitizeText(result.text, result.novelEvents, result.hooks, format);
    return result;
}


function processPassageText(passageText, format) {
    const result = { novelEvents: [] };
    if (format === FORMAT_HARLOWE_3) {
        result.hooks = [];
    }
    let currentIndex = 0;
    while (currentIndex < passageText.length) {
        const maybeCustomTag = extractCustomTagsAtIndex(passageText, currentIndex);
        if (maybeCustomTag) {
            currentIndex += maybeCustomTag.original.length;
            const maybeAssociatedText = extractCustomTagAssociatedTag(currentIndex, passageText);
            if (maybeAssociatedText) {
                maybeCustomTag.text = maybeAssociatedText;
            }
            result.novelEvents.push(maybeCustomTag);
        }

        const maybeLink = extractLinksAtIndex(passageText, currentIndex);
        if (maybeLink) {
            result.novelEvents.push(maybeLink);
            currentIndex += maybeLink.original.length;
        }

        if (format !== FORMAT_HARLOWE_3) {
            currentIndex += 1;
            continue;
        }

        const maybeLeftHook = extractLeftHooksAtIndex(passageText, currentIndex);
        if (maybeLeftHook) {
            result.hooks.push(maybeLeftHook);
            currentIndex += maybeLeftHook.original.length;
        }
        currentIndex += 1;

        const maybeHook = extractHooksAtIndex(passageText, currentIndex);
        if (maybeHook) {
            result.hooks.push(maybeHook);
            currentIndex += maybeHook.original.length;
        }
    }
    return result;
}


function extractCustomTagsAtIndex(passageText, currentIndex) {
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];

    if (currentChar === '>' && nextChar === '>') {
        const customTag = getSubstringBetweenBrackets(passageText, currentIndex + 1, '>', '<');
        const original = passageText.substring(currentIndex, currentIndex + customTag.length + 4);
        const customTagParts = customTag.split('|');
        if (customTagParts.length > 3) {
            throw new Error('Custom tag has too many parts');
        }
        if (customTagParts.length === 3) {
            const type = "character_action_description";
            const index = customTagParts[0].trim();
            const action = customTagParts[1].trim();
            const expression = customTagParts[2].trim();

            return { type: type, index: index, action: action, expression: expression, original: original };
        }
        if (customTagParts.length === 2) {
            const type = customTagParts[0].trim().toLowerCase();
            const name = customTagParts[1].trim();

            return { type: type, name: name, original: original };
        }
        if (customTagParts.length === 1) {
            const type = customTagParts[0].trim().toLowerCase();

            return { type: type, original: original };
        }
    }
}


function extractCustomTagAssociatedTag(index, passageText) {
    let searchIndex = index;

    while (searchIndex < passageText.length) {
        const nextCustomTag = extractCustomTagsAtIndex(passageText, searchIndex);
        const nextLink = extractLinksAtIndex(passageText, searchIndex);
        const nextLeftHook = extractLeftHooksAtIndex(passageText, searchIndex);
        const nextHook = extractHooksAtIndex(passageText, searchIndex);

        // if we hit a custom tag, link, left hook, or hook, we stop searching
        // and set the text of the custom tag to the text between the index and the next tag
        if (nextCustomTag || nextLink || nextLeftHook || nextHook) {
            return passageText.substring(index, searchIndex).trim();
        }

        searchIndex += 1;
    }
}


function extractLinksAtIndex(passageText, currentIndex) {
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];
    const result = { type: 'link' };

    if (currentChar === '[' && nextChar === '[') {
        const link = getSubstringBetweenBrackets(passageText, currentIndex + 1);
        const leftSplit = link.split('<-', 2);
        const rightSplit = link.split('->', 2);
        const pipeSplit = link.split('|', 2);
        const original = passageText.substring(currentIndex, currentIndex + link.length + 4);
        if (leftSplit.length === 2) {
            result.linkText = leftSplit[1].trim();
            result.passageName = leftSplit[0].trim();
            result.original = original;
            return result;
        }
        else if (rightSplit.length === 2) {
            result.linkText = rightSplit[0].trim();
            result.passageName = rightSplit[1].trim();
            result.original = original;
            return result;
        }
        else if (pipeSplit.length === 2) {
            result.linkText = pipeSplit[0].trim();
            result.passageName = pipeSplit[1].trim();
            result.original = original;
            return result;
        }
        else {
            result.linkText = null;
            result.passageName = link.trim();
            result.original = original;
            return result;
        }
    }
}


function extractLeftHooksAtIndex(passageText, currentIndex) {
    const regexAlphaNum = /[a-z0-9]+/i;
    const currentChar = passageText[currentIndex];
    if (currentChar === '|') {
        const maybeHookName = getSubstringBetweenBrackets(passageText, currentIndex, '|', '>');
        if (maybeHookName.match(regexAlphaNum)) {
            const hookStartIndex = currentIndex + maybeHookName.length + 2; // advance to next char after ">"
            const hookStartChar = passageText[hookStartIndex];
            if (hookStartChar === '[') {
                const hookText = getSubstringBetweenBrackets(passageText, hookStartIndex);
                const hookEndIndex = hookStartIndex + hookText.length + 2;
                const original = passageText.substring(currentIndex, hookEndIndex);
                return { hookName: maybeHookName, hookText: hookText, original: original };
            }
        }
    }
}


function extractHooksAtIndex(passageText, currentIndex) {
    const regexAlphaNum = /[a-z0-9]+/i;
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];
    const prevChar = currentIndex && passageText[currentIndex - 1];
    if (currentChar === '[' && nextChar !== '[' && prevChar !== '[') {
        const hookText = getSubstringBetweenBrackets(passageText, currentIndex);
        const hookEndIndex = currentIndex + hookText.length + 2;
        const hookEndChar = passageText[hookEndIndex];
        if (hookEndChar === '<') {
            const maybeHookName = getSubstringBetweenBrackets(passageText, hookEndIndex, '<', '|');
            if (maybeHookName.match(regexAlphaNum)) {
                const original = passageText.substring(currentIndex, hookEndIndex + maybeHookName.length + 2);
                return { hookName: maybeHookName, hookText: hookText, original: original };
            }
        }
        const original = passageText.substring(currentIndex, hookText.length + 2);
        return { hookName: undefined, hookText: hookText, original: original };
    }
}


function sanitizeText(passageText, novelEvents, hooks, format) {
    novelEvents.forEach((customTag) => {
        passageText = passageText.replace(customTag.original, '');
    });
    if (format === FORMAT_HARLOWE_3) {
        hooks.forEach((hook) => {
            passageText = passageText.replace(hook.original, '');
        });
    }
    return passageText.trim();
}


/**
 * Convert an HTML element to an object of attribute values.
 */
function getElementAttributes(element) {
    const result = {};
    const attributes = Array.from(element.attributes);
    attributes.forEach((attribute) => {
        result[attribute.name] = attribute.value;
    });
    return result;
}


/**
 * True if string starts with the given substring.
 */
function stringStartsWith(string, startswith) {
    return string.trim().substring(0, startswith.length) === startswith;
}


function getSubstringBetweenBrackets(string, startIndex, openBracket, closeBracket) {
    openBracket = openBracket || '[';
    closeBracket = closeBracket || ']';
    const bracketStack = [];
    let currentIndex = startIndex || 0;
    let substring = '';
    if (string[currentIndex] !== openBracket) {
        throw new Error("startIndex of getSubstringBetweenBrackets must correspond to an open bracket, input: ", string);
    }
    while (currentIndex < string.length) {
        const currentChar = string[currentIndex];
        // pull top bracket from stack if we hit a close bracket
        if (currentChar === closeBracket) {
            bracketStack.pop();
        }
        // build substring so long as stack is populated
        if (bracketStack.length) {
            substring += currentChar;
        }
        // add open brackets to the top of the stack
        if (currentChar === openBracket) {
            bracketStack.push(currentChar);
        }
        // return if stack is empty and substring is set
        if (!bracketStack.length) {
            return substring;
        }
        currentIndex += 1;
    }
    return substring;
}

global.twineToJSON = twineToJSON;
        </script>
	</head>
	<body>
        <pre id='content'></pre>
        <div id='storyData' style='display: none;'>{{STORY_DATA}}</div>
        <script type='text/javascript'>document.getElementById('content').innerHTML = JSON.stringify(twineToJSON("harlowe-3"), null, 2);</script>
	</body>
</html>
`
});
