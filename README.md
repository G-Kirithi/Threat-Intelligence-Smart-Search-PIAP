# Threat Intelligence & Smart Search Platform (PIAP)

Welcome! This repository hosts a dual-stack setup for the **Personalized Intelligence Aggregation Platform (PIAP)**:
1. **Primary Unified Server (Node.js/TypeScript + React)**: The exact high-performance stack currently running in the AI Studio live preview. It integrates the Express API backend, Gemini AI client, search indexing, and Vite React frontend into a unified pipeline.
2. **Core Python Architecture (`src/piap/`)**: The original design containing FastAPI routes, SQLite triggers, and agent state-machine logic.

This guide details how to set up, configure, and run either of these configurations locally inside **VS Code**.

---

## 🛠️ Option 1: Run the Unified Node.js Stack (Recommended)
This runs the unified backend server and serves the React visual frontend on port `3000`. It is the easiest to start and exactly mirrors your live container.

### 1. Prerequisites
- Install **Node.js** (v18 or higher is recommended).
- Verify installation:
  ```bash
  node -v
  npm -v
  ```

### 2. Configure Environment Variables
Create a file named `.env` in the project root directory and paste your API keys:
```env
# Get a free key from Google AI Studio (https://aistudio.google.com/)
GEMINI_API_KEY="your-gemini-api-key-here"
```

### 3. Open in VS Code & Install Dependencies
1. Open VS Code, select **File > Open Folder...**, and select the root of this project.
2. Open a new Terminal in VS Code (`Ctrl + `` or **Terminal > New Terminal**).
3. Run the following command to install the frontend and backend dependencies:
   ```bash
   npm install
   ```

### 4. Run the Development Server
In your VS Code Terminal, run:
```bash
npm run dev
```
- The Vite bundler and Express backend will boot together.
- Open your browser to **`http://localhost:3000`** to interact with your secure Security Dashboard, Smart Search, and AI Analysis team!

---

## 🐍 Option 2: Run the Python FastAPI Server
If you want to run or test the Python modules located in `src/piap`, follow these steps:

### 1. Prerequisites
- Install **Python** (v3.10 or higher is recommended).
- Ensure `pip` is installed.

### 2. Open a Terminal & Set Up Virtual Environment
Inside your VS Code Terminal, navigate to the project directory and create a Python virtual environment to keep dependencies clean:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows (cmd):
venv\Scripts\activate
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
```

### 3. Install Python Dependencies
Install the required standard libraries:
```bash
pip install fastapi uvicorn google-genai feedparser pydantic sqlite3 chroma-db jinja2
```

### 4. Run the Python API
With your virtual environment activated, boot the Uvicorn ASGI server:
```bash
# Add current directory to PYTHONPATH so python finds the piap package
export PYTHONPATH=$PYTHONPATH:$(pwd)/src
# For Windows PowerShell:
$env:PYTHONPATH += ";$PWD/src"

# Launch FastAPI
python -m uvicorn piap.main:app --host 127.0.0.1 --port 8000 --reload
```
You can view the interactive FastAPI documentation at **`http://127.0.0.1:8000/docs`**.

---

## 💻 Recommended VS Code Setup

To get the most out of your coding environment, we suggest installing the following official VS Code extensions:

1. **Prettier - Code formatter** (for automatic CSS, TypeScript, and JSON formatting)
2. **Tailwind CSS IntelliSense** (for autocomplete suggestions in JSX stylesheets)
3. **Python** (by Microsoft, for rich syntax highlighting and virtualenv selection)
4. **Console Ninja / EsLint** (for linting and real-time JavaScript/TypeScript runtime evaluation)

### Automated VS Code Debugger Configurations
We have pre-configured a `.vscode/launch.json` workspace file. You can simply hit **F5** in VS Code to boot up the unified development server instantly!
