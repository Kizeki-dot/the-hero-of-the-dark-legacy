# Novel Reader — Separate Chapters Edition

This version is designed for a **large novel with lots of chapters**. You do not put the novel text inside `volume-01.html`, and you do not write `<p>` tags.

## Folder structure

```text
NovelReader/
├── content/
│   └── volume-01/
│       ├── volume.json
│       └── chapters/
│           ├── chapter-001.txt
│           ├── chapter-002.txt
│           ├── chapter-003.txt
│           └── ...
├── audio/
│   └── volume-01/
│       ├── chapter-001/
│       │   ├── scene-01.mp3
│       │   └── scene-02.mp3
│       ├── chapter-002/
│       │   └── scene-01.mp3
│       └── ...
└── chapters/
    └── volume-01.html
```

## Adding a chapter

Create a new file such as:

`content/volume-01/chapters/chapter-004.txt`

Paste your novel normally. The TXT file is displayed with its line breaks preserved exactly. If you leave one blank line, one blank line is shown; if you leave two, two are shown. You do not need `<p>` tags.

Example:

```text
The first paragraph of the chapter.

The second paragraph.

The third paragraph can be as long as you want.
```

You never need to type `<p>`.

Then add the chapter to `content/volume-01/volume.json`:

```json
{
  "number": 4,
  "title": "Your Chapter Title",
  "file": "chapters/chapter-004.txt"
}
```

The reader will automatically show it in the **Choose Chapter** dropdown.

## Chapter navigation

Chapter 2, Chapter 3, etc. are **not displayed as a row of buttons** anymore.

The reader has:

- a **Choose Chapter** dropdown
- Previous Chapter button
- Next Chapter button
- automatic disabling of Previous on the first chapter
- automatic disabling of Next on the last chapter
- a `?chapter=4` URL so a chapter can be opened directly

## Chapter audio

Yes — audio is completely separated by chapter.

For Chapter 01, put its audio here:

`audio/volume-01/chapter-001/`

For Chapter 02:

`audio/volume-01/chapter-002/`

For Chapter 03:

`audio/volume-01/chapter-003/`

This means you can have a lot of music without putting everything into one huge audio folder.

Example:

```text
chapter-001/
├── rain.mp3
├── door.mp3
└── ending.mp3

chapter-002/
├── morning.mp3
├── journey.mp3
└── battle.mp3
```

### Adding music inside a chapter

Inside the chapter TXT file:

```text
This paragraph has no music.

[[music: rain.mp3 | volume=0.55 | title=Rainy Night]]

This paragraph and the following paragraphs are inside the music scene.

Another paragraph.

[[/music]]

Music stops here.
```

The reader automatically looks for `rain.mp3` inside that chapter's audio folder. The music passage is treated as one continuous passage, so its line breaks are preserved exactly too.

So in Chapter 01, this:

```text
[[music: rain.mp3]]
```

means:

`audio/volume-01/chapter-001/rain.mp3`

In Chapter 02, the same marker means:

`audio/volume-01/chapter-002/rain.mp3`

You can therefore reuse filenames in different chapters without conflicts.

## Important: lots of audio

There is no hard-coded list of audio files in the JavaScript. The audio filename comes from the chapter TXT file.

That means you can add as many scene MP3s as you need. You only reference the ones used by that chapter.

## Adding another volume later

Use the same structure:

```text
content/
├── volume-01/
│   ├── volume.json
│   └── chapters/
└── volume-02/
    ├── volume.json
    └── chapters/
```

and:

```text
audio/
├── volume-01/
└── volume-02/
```

Each volume can have its own chapter files and audio folders.

## Local testing

Because the reader uses `fetch()` to load TXT and JSON files, opening the HTML directly with `file://` can be blocked by the browser.

GitHub Pages works normally.

For local testing, run a simple local web server from the NovelReader folder.

## GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder.
3. Open Settings → Pages.
4. Select the main branch and root folder.
5. Open the GitHub Pages URL.

## Music behavior

- When the reader reaches the **top of a music passage**, the music starts; the entire passage does not need to be visible first.
- When the reader leaves the passage, the music **pauses at its current position** instead of restarting from 0.
- If the reader scrolls back into the same passage, the music **continues from where it paused**.
- The player has **Play/Pause** and Mute/Volume controls; there is no Stop button.
- Switching to another chapter resets the previous chapter's audio.
- If the browser tab is temporarily hidden, the music pauses without rewinding.


## Language switch

The site UI now has a language button in the header.

- **English** is the default.
- Click **မြန်မာ** to switch the interface to Burmese.
- Click **English** to switch back.
- The selected language is saved in the browser, so it stays selected on the next visit.
- This translates the **website interface only**. Your chapter TXT files and chapter titles are not automatically translated.


## Bilingual chapter text

The language button changes both the website UI and the chapter text. Burmese is the current/default chapter file (`file` or `fileMy`). English can be added later without changing the reader code.

For example:

```text
content/volume-01/chapters/chapter-001.txt       # Burmese
content/volume-01/chapters/chapter-001.en.txt    # English (add later)
```

The existing `volume.json` can keep: 

```json
{ "number": 1, "title": "The Beginning", "file": "chapters/chapter-001.txt" }
```

Or, if you prefer explicit paths, add `fileMy` and `fileEn` to a chapter entry. When English is selected and its file does not exist yet, the reader shows an English-coming-soon message instead of showing the Burmese text. When you add the English file later, it will load automatically. Chapter audio remains separate by chapter and is unchanged by the text-language switch.
