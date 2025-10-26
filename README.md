# AI-Web-Assistant

AI-Web-Assistant is a browser-based AI assistant extension that utilizes Google's built-in AI model to help users handle various web tasks, including information retrieval, content summarization, translation, and more.

## Feature List

- **AI Image Analysis**: Analyze images using user screenshots and questions.
- **Text Analysis**: Users can ask questions to the AI assistant, and AI will respond to their inquiries.
- **Web Page Analysis and Summarization**: AI analyzes the current page the user is on (except official Google pages) and summarizes and parses the page content.
- **Translation Function**: Convert AI analysis results into the required language.
- **Personalized Settings**: In the settings interface, users can modify AI-related configurations according to their needs.

## Installation

### Install from Source Code
Prerequisites:
1) Open chrome://flags, find prompt-api-for-gemini-nano and set it to "Enabled" [Note that there will be a prompt to restart the browser, but don't click it. Wait for the next step to complete before restarting]
2) Then find optimization-guide-on-device-model and set it to "Enabled BypassPerfRequirement", then restart the browser.
3) Go to chrome://components/, find Optimization Guide On Device Model. If the version shows as 0.0.0.0, click "Check for update". The model will then start downloading. The model is approximately 2GB, and the download time depends on your network connection - I waited a few minutes.

1. Clone or download the project locally:
   ```bash
   git clone https://github.com/nizhenshuaishark/AI-Web-Assistant.git
   ```
   Or directly download the code archive and extract it.
2. Open the browser (using Chrome) and navigate to the `chrome://extensions/` page

3. Enable "Developer mode" (in the top right corner of the page)

4. Click "Load unpacked extension"

5. Select your downloaded `AI-Web-Assistant` folder
## Usage Instructions

1. After installation, click the AI-Web-Assistant icon in the browser toolbar and select to pin the icon to the extension bar
<img width="1815" height="529" alt="image" src="https://github.com/user-attachments/assets/f9498fb4-1064-43be-8a87-f06dce1691ad" />
2. In the popup window, enter the question you want to ask or the text you need to process

4. Click the "Send" button to get AI's response

5. Use the settings panel to adjust AI model parameters or select different languages

## Testing Steps

### Basic Functionality Testing

1. **Installation Verification**
   - Input: Install extension normally
   - Expected output: Extension icon appears in the browser toolbar and can be clicked to open normally

2. **Image Assistant Test**
   - Input: On the page you want to analyze, click Capture Screenshot and enter your question in the "your question" area, then click the analyze button in the bottom right corner of the popup page.
   - Expected output: AI will provide its analysis based on the image and question.

3. **Text Assistant Test**
   - Input: Enter a clear generation request (such as "write a short article about autumn")
   - Expected output: AI generates text content that meets the requirements

4. **Page Assistant Test**
   - Click analyze current page to perform AI analysis of the current browser page.
   - Expected output: AI generates text content that meets the requirements

### Advanced Functionality Testing

1. **Long Web Page Content Summary**
   - Select a content-rich web page for page analysis.
   - Expected output: AI generates an analysis of the current web page content.

2. **Multi-language Support**
   - Input: Switch to different languages and then enter questions
   - Expected output: AI provides responses in the corresponding language
3. **Translation Function**
   - Input: After getting an AI response on any page, select the target language you want to translate to, click the translate button to translate the AI response content to the target language.
   - Expected output: AI returns the translation in the corresponding language.

3. **Settings Save**
   - Modification: Change settings options (such as language preferences)
   - Expected output: Settings are properly saved and maintained the next time the extension is opened

## Dependencies

- Chrome or Edge browser (version 80 or higher)
- Active internet connection
- AI model API access permission (requires API key configuration)

## Configuration Files

### manifest.json

This file defines the extension's basic information, including:
- Extension name and version
- Permission settings
- Icon paths
- Script file locations


### Code Structure

- `assets/`: Contains all image and icon files
- `js/`: JavaScript source code files
- `popup/`: HTML, CSS, and JS files for the extension popup
- `manifest.json`: Extension configuration file
- `README.md`: Project documentation file


### Frequently Asked Questions

1. **Extension fails to load**
   - Check if Developer mode is enabled
   - Confirm that all files are in the correct location

2. **AI not responding**
   Check if the browser has installed the built-in model, and check if the prompt API is available.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
