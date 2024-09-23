# Typing-Auto-Refiner

Typing-Auto-Refiner is an AI-powered tool for auto-correcting typing and refining tone in common applications through a Chrome extension. It leverages the OpenAI API and is designed to be significantly more cost-effective than market alternatives (e.g., Grammarly) for daily use by students and professionals.

## How It Works

### Chrome Extension

The tool is implemented as a Chrome extension, providing auto-correction and tone-tuning functionality for selected text. Here's the process:

1. The extension sends the selected text to a local FastAPI backend server.
2. The server processes the request and calls the OpenAI API using the user's API key.
3. OpenAI performs the text polishing task.
4. The user can then choose to accept or reject the suggested changes in Chrome.

## Setup and Installation

### Prerequisites

- Git
- Python 3.7+
- Chrome browser

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Typing-Auto-Refiner.git
   cd Typing-Auto-Refiner
   ```

2. Create a `.env` file in the `src/` directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Start the local backend server:
   ```bash
   python src/api.py
   ```

   You should see output similar to:
   ```
   INFO:     Started server process [41553]
   INFO:     Waiting for application startup.
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
   ```

### Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle switch in the top right corner
3. Click "Load unpacked" and select the `Typing-Auto-Refiner/chrome` directory
4. The extension should now appear in your right-click menu

## Usage

1. Ensure the backend server is running
2. Select text in any Chrome input field
3. Use the extension to request text refinement
4. Review and apply the suggested changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgements

- [OpenAI](https://openai.com/) for providing the API
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
