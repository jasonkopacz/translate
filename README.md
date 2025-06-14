# Smart Translate - Chrome Extension

A sophisticated Chrome extension that intelligently translates a percentage of words on web pages using the DeepL API. The extension prioritizes important content areas and provides hover tooltips showing original text.

## Features

- 🌐 **Smart Translation**: Translate a configurable percentage of words on any webpage
- 🎯 **Intelligent Prioritization**: Focuses on important content areas (headings, main content, articles)
- 🎨 **Beautiful UI**: Modern popup interface built with ShadCN/UI and Tailwind CSS
- 🔄 **Toggle Functionality**: Easily switch between translated and original text
- 💡 **Hover Tooltips**: See original text by hovering over translated words
- 🚀 **Auto-Translation**: Automatically translates new pages based on your settings
- 🔧 **Configurable**: Adjust translation percentage and language pairs

## Setup Instructions

### 1. Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- DeepL API account and key

### 2. Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd translate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure DeepL API Key**
   
   Edit the `.env` file in the root directory:
   ```env
   DEEPL_API_KEY=your_actual_deepl_api_key_here
   ```
   
   Get your API key from [DeepL API](https://www.deepl.com/api.html)

4. **Build the extension**
   ```bash
   npm run build
   ```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `build` folder from your project directory
5. The extension should now appear in your extensions list

### 4. Usage

1. **Pin the extension**: Click the puzzle piece icon in Chrome toolbar and pin "Smart Translate"
2. **Configure settings**: Click the extension icon to open the popup
   - Select source language (or use auto-detect)
   - Select target language
   - Set translation percentage (1-100%)
   - Toggle translation on/off
3. **Translate pages**: 
   - Click "Translate Now" for immediate translation
   - Or enable auto-translation for new pages
4. **View original text**: Hover over underlined translated words
5. **Restore original**: Click the restore button to revert translations

## Architecture

### Core Components

- **Popup (`src/popup.tsx`)**: Main UI interface for settings and controls
- **Content Script (`src/content.tsx`)**: DOM manipulation and word replacement logic
- **Background Script (`src/background.tsx`)**: DeepL API integration and message handling
- **Types (`src/types.ts`)**: TypeScript interfaces and language definitions

### Key Features Implementation

#### Smart Word Selection
- Traverses DOM to find text nodes
- Filters out non-content elements (scripts, navigation, etc.)
- Prioritizes important content areas using element scoring system
- Selects specified percentage of words based on priority

#### Translation Process
- Batches words for efficient API usage
- Caches translations to avoid redundant requests
- Preserves original text structure and formatting
- Adds visual indicators (underlines) and hover tooltips

#### UI Components
- Built with ShadCN/UI component library
- Tailwind CSS for styling
- Responsive design optimized for extension popup
- Clean, modern interface with proper accessibility

## Supported Languages

The extension supports all DeepL languages:
- Bulgarian, Czech, Danish, German, Greek, English
- Spanish, Estonian, Finnish, French, Hungarian
- Indonesian, Italian, Japanese, Korean, Lithuanian
- Latvian, Norwegian, Dutch, Polish, Portuguese
- Romanian, Russian, Slovak, Slovenian, Swedish
- Turkish, Ukrainian, Chinese

## Development

### Project Structure
```
src/
├── components/ui/     # ShadCN UI components
├── lib/              # Utility functions
├── types.ts          # TypeScript definitions
├── popup.tsx         # Extension popup interface
├── content.tsx       # Content script for DOM manipulation
├── background.tsx    # Background service worker
├── App.tsx           # Main React app
└── index.tsx         # Entry point
```

### Building for Production
```bash
npm run build
```

### Development Mode
```bash
npm start
```

### Testing
```bash
npm test
```

## Technical Details

### Chrome Extension Manifest V3
- Uses service worker for background processing
- Content scripts for DOM manipulation
- Proper permissions for DeepL API access
- Storage API for settings persistence

### Performance Optimizations
- Batch API requests to minimize network calls
- Efficient DOM traversal with TreeWalker
- Debounced translation to prevent excessive requests
- Smart caching of translation results

### Security
- Secure API key handling
- Content Security Policy compliance
- Minimal required permissions
- Input sanitization for user data

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure your DeepL API key is valid and has quota remaining
   - Check that the key is properly set in the `.env` file

2. **Extension Not Loading**
   - Verify you've built the project (`npm run build`)
   - Check that you're loading the `build` folder, not the source
   - Ensure all dependencies are installed

3. **Translation Not Working**
   - Check the developer console for error messages
   - Verify the page isn't blocked by CSP restrictions
   - Ensure the extension has proper permissions

### Debug Mode
Enable developer tools on the extension popup:
1. Right-click the extension icon
2. Select "Inspect popup"
3. View console for debug information

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and feature requests, please create an issue in the project repository.
