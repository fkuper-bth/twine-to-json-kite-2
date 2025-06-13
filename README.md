# About

A story format for converting a Twine 2 story to JSON with support for Harlowe 3.x and Kite 2 specifics.

For more info on the Kite 2 format specification read [this](#kite-2-story-format-specification) section.

This project was forked from [twine-to-json](https://github.com/jtschoonhoven/twine-to-json), which was inspired by [Twison](https://github.com/lazerwalker/twison), which in turn was inspired by [Entweedle](http://www.maximumverbosity.net/twine/Entweedle/).


## Setup

From the Twine 2 homescreen, select `Formats` and then `Add a New Format`. At the prompt, paste in the address below:

```
https://fkuper.github.io/twine-to-json-kite-2/dist/format.js
```


## Export

Once you've installed format, enter your story and choose `Change Story Format`. Select the new format and return to your story. Selecting `Play` will export a JSON file.

From within your story, set the story format to Twison. Choosing "Play" will now give you a JSON file.


## Kite 2 story format specification

Kite 2 stories are essentially Harlowe 3.x flavoured stories with some extra features on top which in turn can be processed and interpreted to deliver visually appealing interactive visual novels by a visual novel engine.

All custom keywords that this format adds are enclosed within **double angle brackets**: `>>...<<`.


### Currently supported pre-defined keywords

There is a set of pre-defined keywords that are supported by this story format out of the box. The specification is part of the Kite 2 project and not currently publically available. 

Here is a list of keywords that are currently supported out of the box:

- `>>--<<`
- `>>info<<`
- `>>player<<`
- `>>end<<`
- `>>sound<<`
- `>>bias<<`
- `>>character<<`


### Adding your own keywords

You can also choose to add your own keywords, which can in turn be interpreted by a visual novel engine.

Also note that if you wish to add your own keywords, you should avoid using names already defined as part of the Kite 2 specification (see [this](#currently-supported-pre-defined-keywords) section).

To add your own keyword, simply follow this format: `>>KeywordTypeName|KeywordValue<<`.

- **example keyword**:
    ```
    >>animation|backflip<<
    ```
- **output**:
    ```json
    {
        "type": "CUSTOM",
        "typeValue": "animation",
        "name": "backflip",
        "original": ">>animation|backflip<<"
    }
    ```

This keyword could be used to trigger an animation.


### Example stories

For complete story example inputs and outputs please take a look at the [./test/resources](./test/resources/) directory.