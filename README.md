# Gmail ChatGPT Assistant Add-on

A Gmail add-on that integrates with ChatGPT to provide AI-powered email analysis, conversation assistance, and draft generation.

## Features

- **Thread Analysis**: Summary, action items, key dates, tone and a suggested next step for the open thread
- **Chat with the Thread**: Ask questions (or tap a suggested one); follow-ups remember the conversation
- **Reply Drafting**: Describe the reply, pick a tone, edit the draft, and create it as a reply in one click
- **Compose Assistant**: "Write with ChatGPT" in the compose window drafts a new email and inserts it at the cursor
- **Copy Thread**: The whole thread formatted as a prompt, ready to paste into ChatGPT on the web
- **Quick Revisions**: One-tap "Shorter", "More formal", "Friendlier", or describe your own change

## Setup

### 1. Install clasp (Apps Script CLI)

```bash
npm install -g @google/clasp
clasp login
```

Then turn on **Google Apps Script API** at https://script.google.com/home/usersettings.

### 2. Link this folder to an Apps Script project

Existing project: copy the Script ID from Project Settings in the Apps Script editor and create `.clasp.json`:

```json
{ "scriptId": "YOUR_SCRIPT_ID", "rootDir": "." }
```

New project: `clasp create --type standalone --title "ChatGPT Assistant" --rootDir .`

### 3. Push the code

```bash
clasp push            # upload local files (only *.gs and appsscript.json, see .claspignore)
clasp push --watch    # re-upload on every save while developing
```

### 4. Configure OpenAI

In the Apps Script editor, go to Project Settings > Script Properties and add:

| Property | Required | Value |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Your key from https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | No | Model name; defaults to `gpt-4o` |

### 5. Install in Gmail

1. In the Apps Script editor, click **Deploy > Test deployments > Install**
2. Open Gmail and refresh; the add-on appears in the right sidebar
3. Open an email and authorize the add-on

The test deployment always runs the latest pushed code, so after the first install `clasp push` is all you need. For a versioned release, use `clasp deploy -d "description"`.

## Usage

- **Open any email**: the sidebar shows the thread and three actions: Analyze, Ask, Draft a reply
- **Draft a reply**: edit the draft directly in the text box, refine it, then **Create reply** to open it as a Gmail reply draft
- **Compose**: in a new email, open the add-on menu in the compose toolbar and choose **Write with ChatGPT**; **Insert into email** places the draft at the cursor

## File Structure

- `appsscript.json` - Add-on manifest: scopes, triggers, branding
- `Code.gs` - Sidebar entry point, home menu and thread analysis
- `Chat.gs` - Chat with the thread, with per-thread history
- `Drafts.gs` - Reply and compose drafting, revisions and insertion
- `Thread.gs` - Reads the open thread and formats it for prompts
- `ChatGPT.gs` - OpenAI API client
- `UI.gs` - Shared card, button and navigation helpers

## Privacy

The open thread's text is sent to OpenAI when you use Analyze, Ask or Draft a reply. The add-on only reads the message you have open, using Gmail's per-message access token.
