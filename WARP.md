# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Python backend

- **Create and activate a virtualenv (recommended)**
  - macOS/Linux (from repo root):
    - `python -m venv .venv`
    - `source .venv/bin/activate`
  - Then install dependencies:
    - `pip install -r requirements.txt`

- **Run the FastAPI backend locally** (from repo root):
  - `python src/api.py`
  - This starts the app on `http://localhost:8000`.

- **Quick backend smoke tests** (with server running):
  - Health/root check:
    - `curl http://localhost:8000/`
  - Auto-correction endpoint:
    - `curl -X POST "http://localhost:8000/auto-correct" -H "Content-Type: application/json" -d '{"text": "helo how are ou todya?"}'`
  - Tone-tuning endpoint:
    - `curl -X POST "http://localhost:8000/tune-text" -H "Content-Type: application/json" -d '{"text": "hello, how are you today?", "tone": "formal"}'`

- **One-off local pipeline test** (no HTTP, uses Python API directly):
  - `python src/main.py`

- **Backend configuration**
  - Create `src/.env` containing your API key before running any Python that calls OpenAI:
    - Example: `OPENAI_API_KEY=your_openai_api_key_here`

### Chrome extension

- Load the extension in Chrome:
  - Go to `chrome://extensions/`.
  - Enable **Developer mode**.
  - Click **Load unpacked** and select the `chrome/` directory in this repo.

### Tests / linting

- There is currently **no automated test suite or lint configuration** in this repo. If you add tests (e.g., with `pytest`), document the commands here.

## Architecture and structure

### High-level overview

- This project implements an AI-powered text refiner with two main components:
  - A **Python FastAPI backend** in `src/` that exposes HTTP endpoints for auto-correction and tone tuning and wraps the OpenAI Python SDK.
  - A **Chrome extension** in `chrome/` that integrates with the browser context menu and page content to send selected text for refinement and display suggested changes inline.
- Prompt templates for the OpenAI calls live in YAML files under `src/prompt/` to keep model behavior configurable without changing code.

### Backend (`src/`)

- `src/api.py`
  - Defines the FastAPI application: `app = FastAPI()`.
  - Endpoints:
    - `GET /` — simple JSON welcome message, useful as a health check.
    - `POST /auto-correct` — accepts `{ "text": str }`, logs the incoming and corrected text, delegates to `get_auto_corrected_text`, and returns `{ "corrected_text": ... }`. If the helper returns an empty string (error case), it responds with HTTP 500.
    - `POST /tune-text` — accepts `{ "text": str, "tone": str }`, delegates to `get_tuned_text`, and returns `{ "tuned_text": ... }`, again mapping empty-string failures to HTTP 500.
  - Contains a `__main__` block that runs `uvicorn` directly, which is why `python src/api.py` is the primary dev command.

- `src/call_openai_api.py`
  - Responsible for **all Python-side interaction with OpenAI** and prompt loading.
  - Uses `python-dotenv` to load environment variables (notably `OPENAI_API_KEY`) from `.env` files before creating a single `OpenAI` client instance.
  - `load_prompt(prompt_path, version_name)`:
    - Resolves `prompt_path` relative to the `src/` directory.
    - Loads a YAML file and returns the value under the given `version_name` key, raising if it is missing.
  - `error_handler` decorator:
    - Wraps OpenAI calls, logging any exception and returning an empty string instead of raising.
    - The FastAPI layer in `api.py` interprets this empty string as a server error and returns HTTP 500.
  - `get_auto_corrected_text(text)`:
    - Loads `base_prompt` from `prompt/auto_correction_prompt.yaml`.
    - Calls `client.chat.completions.create` with model `gpt-3.5-turbo`, using the YAML text as a system message and the raw `text` as the user message.
  - `get_tuned_text(text, tone)`:
    - Loads `system_prompt` and `user_prompt` from `prompt/tone_tuning.yaml`.
    - Formats the `user_prompt` template with `{text, tone}` and calls `client.chat.completions.create` with model `gpt-4o-mini`.

- `src/prompt/`
  - `auto_correction_prompt.yaml` — defines `base_prompt`, a system instruction that the assistant should only correct spelling and grammar and output just the corrected text.
  - `tone_tuning.yaml` — defines:
    - `system_prompt` describing a tone-tuning assistant that outputs only tuned text.
    - `user_prompt`, a template string with `{text}` and `{tone}` placeholders used by `get_tuned_text`.
  - Together, these files encapsulate the behavior of the two main flows (auto-correction and tone tuning) without embedding prompt strings directly into Python code.

- `src/main.py`
  - Simple manual test harness for the Python API:
    - Uses a hard-coded sample string.
    - Calls `get_auto_corrected_text` and then `get_tuned_text` with a fixed tone ("formal"), printing both results.
  - Useful for quick sanity checks of OpenAI connectivity and prompt behavior independent of the HTTP layer or Chrome extension.

### Chrome extension (`chrome/`)

- `chrome/manifest.json`
  - Manifest V3 configuration.
  - Declares:
    - Background service worker: `background.js`.
    - Content script: `content.js` on `<all_urls>`.
    - Popup UI: `popup.html`.
    - Permissions: `contextMenus`, `activeTab`, `scripting`, and `<all_urls>` host permission.

- `chrome/background.js`
  - Sets up the **context menu structure** when the extension is installed:
    - A root "Text Correction" item with children:
      - "Auto-Correction" for basic grammar/spelling fixes.
      - A "Tone Tuning" parent with sub-items for specific tones (Professional, Friendly, Strong, Humorous, Aggressive).
  - Handles `chrome.contextMenus.onClicked` events:
    - Determines whether to auto-correct or tune tone based on the clicked item.
    - For tone tuning, extracts the tone from the menu ID.
    - Invokes `processText` and, on success, sends `{ action: "updateText", text: processedText }` to the content script.
  - Manages an `OpenAI` JS client instance:
    - Uses `setApiKey(apiKey)` to initialize `openai = new OpenAI({ apiKey })` and store the key in `chrome.storage.local`.
    - On startup, attempts to load an existing key from `chrome.storage.local` and reinitialize the client.
  - OpenAI-backed operations:
    - `processText(text, action, tone)` builds different prompts depending on whether the action is auto-correction or tone tuning, and calls `openai.chat.completions.create` with a generic "refine and polish text" system prompt.
    - `refineText(text)` similarly wraps a general refinement prompt and is used by the `refineText` message flow.
  - Acts as a **bridge** between the browser UI (context menus, content script) and OpenAI, either returning processed text to be injected back into the page or surfacing errors.

- `chrome/content.js`
  - Runs in the context of web pages and is responsible for **UI overlays and text replacement**:
    - Tracks global state (`tempElement`, `isDisplayingTempElement`, `isRequestInProgress`, `lastProcessedRange`) on `window` to prevent duplicate overlays and overlapping requests.
    - Listens for messages from the background script:
      - Handles actions `autoCorrect`, `tuneTone`, and `updateText`.
      - Captures the user’s current text selection and the associated `Range` object.
      - For `tuneTone`, prompts the user for a desired tone via a small in-page prompt `div`.
      - For `updateText`, debounces creation of the preview overlay with the returned text.
    - Uses a debounced `createTempElement(range, result)` to:
      - Render a fixed-position overlay near the selection containing a `textarea` with the suggested text.
      - Provide **Apply** and **Reject** buttons:
        - Apply replaces the selected text in the DOM with the edited content.
        - Reject simply dismisses the overlay.
  - Provides an auxiliary `refineSelectedText()` flow that talks back to the background script via a `refineText` message.
  - Includes a placeholder for prompting the user for an API key and wiring it into the background script via `setApiKey`; the actual UI element (`#setApiKey`) is not yet present in `popup.html`, so additional wiring is needed if you want in-page API key configuration.

- `chrome/popup.html` and `chrome/popup.js`
  - Minimal popup shell and an empty script file.
  - Currently unused for core flows; could be expanded in the future (e.g., for API key management or global settings).

### Other top-level items

- `requirements.txt`
  - Lists Python dependencies: FastAPI, OpenAI Python SDK, Pydantic v2, `python-dotenv`, `PyYAML`, and `uvicorn`.

- `slack/`
  - Present but currently empty (no files at this depth). It appears reserved for potential future Slack-related integrations.
