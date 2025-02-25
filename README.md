# Ubuntu AI Desktop

A custom Ubuntu desktop application that provides a ChatGPT-like interface powered by local Ollama models.

## Features

- ChatGPT-style interface with 90/10 layout
- Local model integration via Ollama
- Real-time streaming responses
- Code block syntax highlighting
- Conversation history with AI-generated summaries
- Easy exit back to default Ubuntu desktop

## Prerequisites

1. Install required system packages:
```bash
sudo apt install python3-poetry nodejs npm
npm install -g pnpm
```

2. Install Ollama:
- Download from [ollama.com/download](https://ollama.com/download)
- Pull a model: `ollama pull llama2`

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/ubuntu-ai-desktop
cd ubuntu-ai-desktop
```

2. Set up the backend:
```bash
cd backend
poetry install
```

3. Set up the frontend:
```bash
cd ../frontend
pnpm install
```

## Running the Application

1. Start Ollama service (if not already running)

2. Start the backend server:
```bash
cd backend
poetry run uvicorn app.main:app
```

3. Start the frontend development server:
```bash
cd frontend
pnpm dev
```

4. Open your browser and navigate to http://localhost:5173

## Usage

- The interface starts with a ChatGPT-style search box
- After first message, it splits into a 90/10 layout with chat and history
- Code blocks are automatically detected and syntax-highlighted
- Conversation history is saved and summarized
- Click "Exit to Desktop" to return to default Ubuntu desktop
