# Offline Code Reviewer

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
![JavaScript](https://img.shields.io/badge/JavaScript-74.3%25-yellow.svg)
![CSS](https://img.shields.io/badge/CSS-25.5%25-purple.svg)
![React](https://img.shields.io/badge/React-19.2-blue.svg)
![Electron](https://img.shields.io/badge/Electron-30.0-white.svg)

An offline desktop application for intelligent code review and analysis. Leveraging Electron, Express, and local LLM integration (Ollama), this tool provides code analysis without internet connectivity.

## ✨ Features

- 🔍 **Intelligent Code Review** - AI-powered code analysis using local LLMs
- 📝 **Code Generation** - Assisted code generation and suggestions
- 💬 **Interactive Chat** - Have conversations about your code
- 🚀 **Offline First** - No internet required, full privacy
- 💾 **Local Storage** - SQLite database for code history
- 🎨 **Modern UI** - Built with React and Vite for fast development
- 📦 **Desktop Integration** - Native Electron application

## 🛠️ Tech Stack

### Backend
- **Electron** - Desktop application framework
- **Express.js** - Backend API server
- **Node.js** - JavaScript runtime
- **better-sqlite3** - Local database

### Frontend
- **React** 19.2 - UI framework
- **Vite** - Build tool and dev server
- **Highlight.js** - Code syntax highlighting
- **Marked** - Markdown parsing

### External
- **Ollama** - Local LLM integration

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v14.0 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Ollama** (for LLM capabilities) - [Download](https://ollama.ai/)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sarthak-titar/offline-code-reviewer.git
   cd offline-code-reviewer
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Install Ollama** (if not already installed)
   - Visit [Ollama](https://ollama.ai/) and follow installation instructions
   - Pull a model: `ollama pull llama2` (or your preferred model)

## 🎯 Usage

### Development Mode

Start all services in development mode:

```bash
npm start
```

This command will:
- Start the Express review server (default: port 3001)
- Start the generator server (default: port 3002)
- Start the chat server (default: port 3003)
- Start the React development server (port 5173)
- Open the Electron window

### Build for Production

```bash
npm run build
```

Generates a distributable Electron application.

## 📁 Project Structure

```
offline-code-reviewer/
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── package.json            # Root dependencies
├── server/
│   ├── server.js           # Code review API server
│   ├── generator.js        # Code generation service
│   └── chat.js             # Chat service
├── client/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── main.jsx        # React entry point
│   │   └── components/     # React components
│   ├── package.json        # Client dependencies
│   ├── vite.config.js      # Vite configuration
│   └── index.html          # HTML entry point
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Server Ports
REVIEW_SERVER_PORT=3001
GENERATOR_SERVER_PORT=3002
CHAT_SERVER_PORT=3003

# Database
DB_PATH=./data/reviewer.db

# Development
NODE_ENV=development
```

## 🧪 Running Tests

```bash
cd client
npm run lint
```

## 📚 API Documentation

### Review Server (Port 3001)
- `POST /review` - Submit code for review
- `GET /reviews` - Get review history

### Generator Server (Port 3002)
- `POST /generate` - Generate code suggestions
- `GET /suggestions` - Get generation history

### Chat Server (Port 3003)
- `POST /chat` - Send chat message
- `GET /chat/history` - Get chat history

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🐛 Troubleshooting

### Application won't start
- Ensure all dependencies are installed: `npm install && cd client && npm install && cd ..`
- Check that ports 3001, 3002, 3003, and 5173 are available
- Verify Ollama is running: `ollama serve`

### Ollama connection errors
- Ensure Ollama is installed and running
- Check `OLLAMA_BASE_URL` in `.env` is correct
- Verify a model is available: `ollama list`

### Port already in use
- Change port numbers in `.env`
- Or kill the process using the port: `lsof -i :PORT` (macOS/Linux)

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Sarthak Titar**
- GitHub: [@sarthak-titar](https://github.com/sarthak-titar)

## 📞 Support

For support, please:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Open an [Issue](https://github.com/sarthak-titar/offline-code-reviewer/issues)
3. Check existing issues for solutions

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop application framework
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [Ollama](https://ollama.ai/) - Local LLM inference
- [Express.js](https://expressjs.com/) - Web application framework

---

Made with ❤️ by Sarthak Titar
