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
const KITE2_KEYWORD_TYPES = Object.freeze({
    SEPARATOR: '--',
    INFO_TEXT: 'info',
    PLAYER_TEXT: 'player',
    END: 'end',
    SOUND: 'sound',
    BIAS: 'bias',
    CHARACTER_ACTION: 'character',
});

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
        const maybeCustomKeyword = extractCustomKeywordsAtIndex(passageText, currentIndex);
        if (maybeCustomKeyword) {
            currentIndex += maybeCustomKeyword.original.length;
            if (maybeCustomKeyword.type === getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.CHARACTER_ACTION) ||
                maybeCustomKeyword.type === getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.PLAYER_TEXT) ||
                maybeCustomKeyword.type === getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.INFO_TEXT)
            ) {
                const maybeAssociatedText = extractCustomKeywordAssociatedText(currentIndex, passageText);
                if (maybeAssociatedText) {
                    maybeCustomKeyword.text = maybeAssociatedText;
                } else {
                    throw new Error('Keyword has no associated text: ' + maybeCustomKeyword.typeValue);
                }
            }
            result.novelEvents.push(maybeCustomKeyword);
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

function extractCustomKeywordsAtIndex(passageText, currentIndex) {
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];

    if (currentChar === '>' && nextChar === '>') {
        const customKeyword = getSubstringBetweenBrackets(passageText, currentIndex + 1, '>', '<');
        const original = passageText.substring(currentIndex, currentIndex + customKeyword.length + 4);
        const customKeywordParts = customKeyword.split('|');
        if (customKeywordParts.length > 2) {
            throw new Error('Custom keyword has too many parts');
        }
        if (customKeywordParts.length === 0) {
            throw new Error('Custom keyword is empty');
        }
        const typeValue = customKeywordParts[0].trim().toLowerCase();
        const type = parseCustomKeywordType(typeValue);

        if (customKeywordParts.length === 2) {
            const associatedValue = customKeywordParts[1].trim();
            return { type: type, typeValue: typeValue, associatedValue: associatedValue, original: original };
        }
        if (customKeywordParts.length === 1) {
            if (type === getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.CHARACTER_ACTION) ||
                type === getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.SOUND) ||
                type === getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.BIAS)
            ) {
                throw new Error('Custom keyword of type ' + type + ' requires an associated value');
            }
            return { type: type, typeValue: typeValue, original: original };
        }
    }
}

function parseCustomKeywordType(typeString) {
    var type = 'CUSTOM';

    // normalize the type string
    typeString = typeString.trim().toLowerCase();

    // check if typestring start with the word 'character'
    if (typeString.startsWith(KITE2_KEYWORD_TYPES.CHARACTER_ACTION)) {
        return getPropertyName(KITE2_KEYWORD_TYPES, (obj) => obj.CHARACTER_ACTION);
    }

    // check for other predefined keyword types
    for (const key in KITE2_KEYWORD_TYPES) {
        if (KITE2_KEYWORD_TYPES[key] === typeString) {
            type = key;
        }
    }

    return type;
}

function extractCustomKeywordAssociatedText(index, passageText) {
    let searchIndex = index;

    while (searchIndex < passageText.length) {
        const nextCustomKeyword = extractCustomKeywordsAtIndex(passageText, searchIndex);
        const nextLink = extractLinksAtIndex(passageText, searchIndex);
        const nextLeftHook = extractLeftHooksAtIndex(passageText, searchIndex);
        const nextHook = extractHooksAtIndex(passageText, searchIndex);

        // if we hit a custom keyword, link, left hook, or hook, we stop searching
        // and set the text of the custom keyword to the text between the index and the next keyword
        if (nextCustomKeyword || nextLink || nextLeftHook || nextHook) {
            return passageText.substring(index, searchIndex).trim();
        }

        searchIndex += 1;
    }
}

function extractLinksAtIndex(passageText, currentIndex) {
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];
    const result = { type: 'LINK' };

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
    novelEvents.forEach((customKeyword) => {
        passageText = passageText.replace(customKeyword.original, '');
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

/**
 * Get the property name from an object using an expression.
 * This is a utility function that allows you to extract a property name from an object.
 * @param {*} obj The object to extract the property name from.
 * @param {*} expression An expression that takes an object and returns the property name.
 * @returns The property name extracted from the object as a string.
 */
function getPropertyName(obj, expression) {
    var res = {};
    Object.keys(obj).map(k => { res[k] = k; });
    return expression(res);
}

window.twineToJSON = twineToJSON;