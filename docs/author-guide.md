# Curriculum author guide

For CIC staff who create and edit modules. No code deploy is needed: changes are live as soon as you save.
Admins and CIC instructors can edit. Partner teachers and reviewers see a read-only teacher edition.

## How content is organised

```
Course (Python Foundations)
└── Module (e.g. "Loops"): has a title, summary, concepts, Published on/off
    └── Lesson (Warm-up, Learn, Practice, Wrap-up)
        └── Activity: one of: pretest, video, slides, check, worksheet, code, exit, posttest
```

Students see modules in order. A module is open to a student only if it's **published**, their teacher
**assigned** it, and they finished (or tested out of) the previous one.

## Three ways to create a module

1. **New module from template**: creates the standard 8-step CIC module as a draft with placeholder content.
2. **Worksheet → module (AI)**: paste a worksheet or slide deck's text, or upload a photo of a printed page.
   AI drafts every step. Always review it before publishing, especially the answer keys and tests.
3. **Remix**: on any module, click **Remix** to copy it (including answer keys and tests) into a new draft
   you can adapt. **Translate** does the same but translates the text into another language (code and
   answer keys are never changed).

## Editing each activity type

| Type | What you fill in | Tips |
|---|---|---|
| Pretest / posttest | Questions, choices, the correct choice, a concept tag | **Use the same questions in both**: learning gain is post − pre. Students get one attempt and never see which answers were right. |
| Check / exit | Same as above, plus an explanation | Students see the explanation and can retry. |
| Video | YouTube or Vimeo link + a summary | The summary shows under the video and is what *Lite mode* students read. `**bold**` and `` `code` `` work. |
| Slides | Title + body per slide | Lines that look like code are shown as code blocks. |
| Worksheet | Prompts, short or long answer | Replaces a printed worksheet; answers are saved to the student's record. |
| Code | Prompt, starter code, tests, reference solution | Tests are Python `assert` lines run after the student's code, e.g. `assert total_of([1, 2]) == 3, 'total_of([1, 2]) should be 3'`. The message is what students see when it fails. The **solution is never shown**; it only guides AI hints. |

**Concept tags** (e.g. `loops`, `conditionals`) power the teacher's "stuck map" and the learning-gain-by-concept
report. Use the same spelling everywhere.

## Publishing

Tick **Published** and **Save module**. Unpublishing hides a module from students but keeps their progress.
A module can only be deleted if no student has progress in it.

## Quality checklist before publishing

- [ ] Every quiz question has the right answer selected
- [ ] Pretest and posttest have the same questions
- [ ] The code exercise's reference solution passes every test (paste it into `/play` with the tests to check)
- [ ] Concept tags are set on the check, code and exit activities
