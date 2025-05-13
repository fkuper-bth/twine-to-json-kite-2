# About

A story format for converting a Twine 2 story to JSON with support for Harlowe 3.x and Kite 2 specifics.

For more info on the Kite 2 format specification read [this](#kite-2-story-format-specification) section.

This project was forked from [twine-to-json](https://github.com/jtschoonhoven/twine-to-json), which was inspired by [Twison](https://github.com/lazerwalker/twison), which in turn was inspired by [Entweedle](http://www.maximumverbosity.net/twine/Entweedle/).


## Setup

From the Twine 2 homescreen, select `Formats` and then `Add a New Format`. At the prompt, paste in one of the addresses below:

For vanilla Twine-to-JSON (without special support for Harlowe 3.x), use this address:

```
https://fkuper.github.io/twine-to-json-kite-2/dist/twine.js
```

For Harlowe-flavored Twine-to-JSON, use this address:

```
https://fkuper.github.io/twine-to-json-kite-2/dist/harlowe-3.js
```

If you're not sure which one you should use then go with the Harlowe-flavored version. It has everything the vanilla flavor has, plus a little extra.


## Export

Once you've installed format, enter your story and choose `Change Story Format`. Select the new format and return to your story. Selecting `Play` will export a JSON file.

From within your story, set the story format to Twison. Choosing "Play" will now give you a JSON file.


## Kite 2 story format specification

Kite 2 stories are essentially Harlowe 3.x flavoured stories with some extra features on top which in turn can be processed and interpreted to deliver visually appealing interactive visual novels by a visual novel engine.

All custom tags that this format adds are enclosed within **double angle brackets**: `>>...<<`.


### Currently supported tags

- `>>CharacterName|AnimationName|FacialExpressionName<<`
  - This tag describes a character's animation and facial expression.
  - It will be associated automatically with any plain text that follows this tag.
  - **example input**:
    ```
    >>Character1|Speaks|Smiling<<
    Hello World!
    ```
  - **output**:
    ```json
    {
        "type": "character_action_description",
        "index": "Character1",
        "action": "Speaks",
        "expression": "Smiling",
        "original": ">>Character1|Speaks|Smiling<<",
        "text": "Hello World!"
    }
    ```
- `>>Info<<`
  - This tag denotes a message that denotes that the associated text should be interpreted as providing story context to the player and does not stem from a character within the story.
  - It will be associated automatically with any plain text that follows this tag.
  - **example input**:
    ```
    >>Info<<
    This message could be used to give the player more context for the current situation.
    ```
  - **output**:
    ```json
    {
        "type": "info",
        "original": ">>Info<<",
        "text": "This message could be used to give the player more context for the current situation."
    }
    ```
- `>>Player<<`
  - This tag denotes a message that should come from the player's character without requiring user interaction.
  - **example input**:
  - **output**:
- `>>--<<`
  - This tag is used to signify the end of a previously used tag.
  - **example input**:
    ```
    >>--<<
    ```
  - **output**:
    ```json
    {
        "type": "--",
        "original": ">>--<<"
    }
    ```
- `>>End<<`
  - This tag denotes the end of the story.
  - **example input**:
    ```
    >>End<<
    ```
  - **output**:
    ```json
    {
        "type": "end",
        "original": ">>End<<"
    }
    ```


### Adding your own tags

You can also choose to add your own tags, which can in turn be interpreted by a visual novel engine.

To add your own tag, simply follow this format: `>>TagTypeName|TagValue<<`.

- **example tag**:
    ```
    >>Sound|TelephoneCall<<
    ```
- **output**:
    ```json
    {
        "type": "sound",
        "name": "TelephoneCall",
        "original": ">>Sound|TelephoneCall<<"
    }
    ```

This tag could be used to trigger sound effects.


### Example stories

For complete story example inputs and outputs please take a look at the [./test/resources](./test/resources/) directory.