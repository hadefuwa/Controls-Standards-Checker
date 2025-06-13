# Industrial Automation Assistant

A desktop AI assistant built with Electron.js to help with industrial automation and control standards compliance.

## What This App Does

This is a **smart desktop application** that helps industrial automation engineers by:
- ✅ Answering questions about automation standards and regulations
- ✅ Providing guidance on machinery compliance (like EU Machinery Directive)
- ✅ Using AI to search through technical documents
- ✅ Working completely offline once set up

## Features

- **Desktop App**: Runs on Windows, Mac, and Linux
- **AI-Powered**: Uses local AI to understand your questions
- **Document Search**: Searches through industrial standards and regulations
- **Offline Mode**: Works without internet connection
- **Easy to Use**: Simple, clean interface

## How to Run the App

### Prerequisites
You need to have these installed on your computer:
- [Node.js](https://nodejs.org/) (version 16 or higher)
- [Git](https://git-scm.com/) (to download the code)

### Installation Steps

1. **Download the code**:
   ```bash
   git clone https://github.com/hadefuwa/Controls-Standards-Checker.git
   cd Controls-Standards-Checker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

The app window should open automatically!

## Project Structure

```
├── main.js              # Main Electron process
├── preload.js           # Security bridge between main and renderer
├── renderer/            # Frontend (what users see)
│   ├── index.html       # Main app interface
│   ├── index.css        # App styling
│   └── renderer.js      # Frontend logic
├── backend/             # AI and data processing
│   ├── rag.js          # AI search functionality
│   ├── process_docs.js  # Document processing
│   └── embedding_db/    # AI knowledge database
├── llm/                 # AI model integration
└── assets/              # Images and resources
```

## How to Use

1. **Start the app** using `npm start`
2. **Type your question** about industrial automation or safety standards
3. **Press Enter** or click "Ask"
4. **Get AI-powered answers** based on technical documents
5. **Ask follow-up questions** as needed

## Example Questions You Can Ask

- "What are the safety requirements for emergency stops?"
- "How do I comply with the Machinery Directive for my conveyor system?"
- "What documentation is needed for CE marking?"
- "What are the requirements for safety light curtains?"

## Building for Distribution

To create an installer for others to use:

```bash
# For Windows
npm run build-win

# For all platforms
npm run build-all
```

The installer will be created in the `dist/` folder.

## Technical Details

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Electron
- **AI Engine**: ChromaDB for document search
- **Document Processing**: Custom RAG (Retrieval-Augmented Generation)
- **Offline Capable**: All AI processing happens locally

## Contributing

This project is open source! If you want to help improve it:

1. Fork the repository
2. Make your changes
3. Test that everything works
4. Submit a pull request

## Support

If you have questions or need help:
- Create an issue on GitHub
- Check the existing issues for similar problems
- Make sure to include details about your operating system and Node.js version

## License

This project is licensed under the ISC License - see the package.json file for details.

## Changelog

### Version 1.0.0
- Initial release
- Basic AI question answering
- Machinery Directive document support
- Desktop app with Electron
- Offline AI processing

---

**Made for industrial automation engineers by engineers** 🔧⚙️
