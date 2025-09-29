# Monaco Code IDE Project

## Overview
This is a Monaco Editor-based code IDE built with React and Vite that allows users to write and execute Python and JavaScript code directly in the browser. The project uses:

- **Monaco Editor**: Microsoft's code editor (used in VS Code)
- **Pyodide**: Python runtime in the browser via WebAssembly
- **React**: Frontend framework
- **Vite**: Build tool and development server

## Project Structure
```
monaco-project/
├── src/
│   ├── components/
│   │   └── CodeIDE.jsx      # Main IDE component
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── assets/              # Static assets
├── public/                  # Public assets
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite configuration
└── index.html               # HTML template
```

## Features
- Multi-language code editor (Python, JavaScript)
- Real-time code execution
- Python support via Pyodide (runs Python in browser)
- JavaScript evaluation
- Dark theme Monaco editor
- Split view with code editor and output panel

## Development Setup
- **Server**: Configured to run on 0.0.0.0:5000 for Replit compatibility
- **Workflow**: "Frontend Server" running `npm run dev`
- **HMR**: Hot module replacement configured for proxy environment

## Deployment Configuration
- **Target**: Autoscale (stateless web application)
- **Build**: `npm run build` (creates production build)
- **Run**: `npm run preview` (serves built application)

## Recent Changes
- Configured Vite for Replit proxy compatibility (2024-09-29)
- Set up development workflow on port 5000
- Configured deployment settings for production

## Architecture Notes
- Frontend-only application with no backend requirements
- Uses CDN-hosted Pyodide for Python execution
- All code execution happens client-side in the browser
- No database or persistent storage needed