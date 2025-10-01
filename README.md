# Gmail ChatGPT Assistant Add-on

A Gmail add-on that integrates with ChatGPT to provide AI-powered email analysis, conversation assistance, and draft generation.

## Features

- **Email Thread Analysis**: Get AI-powered insights & summaries of email conversations
- **Interactive Chat**: Ask questions about email content and get contextual answers
- **Smart Draft Generation**: Generate email responses with customizable tone and content
- **Compose Assistant**: Get help drafting new emails from scratch
- **Draft Revision**: Iteratively improve drafts with AI assistance

## Setup Instructions

### 1. Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the files from this repository:
   - `appsscript.json` - Manifest configuration
   - `Code.gs` - Main add-on logic
   - `ChatGPT.gs` - ChatGPT API integration
   - `Compose.gs` - Compose UI functions

### 2. Configure OpenAI API Key

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. In Google Apps Script, go to Project Settings (gear icon)
3. In the "Script Properties" section, add:
   - Property: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

### 3. Enable Required Services

1. In Google Apps Script, click "Services" (+ icon)
2. Add "Gmail API" service
3. Set identifier to "Gmail"

### 4. Deploy the Add-on

1. Click "Deploy" > "New deployment"
2. Choose type: "Add-on"
3. Fill in the deployment details
4. Click "Deploy"

### 5. Install in Gmail

1. Go to [Gmail](https://mail.google.com)
2. Open the add-ons panel (right sidebar)
3. Find your add-on and authorize it
4. The ChatGPT Assistant will appear in the sidebar

## Usage

### Email Analysis
1. Open any email thread in Gmail
2. The add-on will automatically load in the sidebar
3. Click "Analyze with ChatGPT" to get AI insights about the conversation

### Chat with Email Content
1. In the "Chat with Email Content" section, type your question
2. Click "Ask ChatGPT" to get answers about the email thread
3. Follow up with additional questions as needed

### Draft Responses
1. In the "Draft Response" section, provide instructions for how ChatGPT should help
2. Click "Generate Draft" to create an AI-powered response
3. Review, revise, or insert the draft into your reply

### Compose New Emails
1. Start composing a new email in Gmail
2. Look for "Draft with ChatGPT" in the compose toolbar
3. Provide the email purpose, key points, and desired tone
4. Generate and refine your draft with AI assistance

## File Structure

- `appsscript.json` - Add-on manifest and configuration
- `Code.gs` - Main entry points and email context extraction
- `ChatGPT.gs` - OpenAI API integration and chat functionality
- `Compose.gs` - Compose window integration and draft insertion

## API Usage

The add-on uses OpenAI's GPT-3.5-turbo model by default. You can modify the model in the `callChatGPT` function in `ChatGPT.gs`.

## Security Notes

- API keys are stored securely in Google Apps Script properties
- The add-on only accesses email data when explicitly triggered
- No email content is stored permanently by the add-on

## Troubleshooting

### Common Issues

1. **"API key not configured" error**
   - Ensure you've added `OPENAI_API_KEY` to Script Properties
   - Verify the API key is valid and has sufficient credits

2. **Gmail API errors**
   - Make sure Gmail API service is enabled in the Apps Script project
   - Check that the add-on has proper Gmail permissions

3. **Add-on not appearing**
   - Try refreshing Gmail
   - Check that the deployment was successful
   - Verify the manifest configuration is correct

### Debug Mode

To enable debug logging:
1. In Google Apps Script, go to Executions
2. View logs for detailed error information
3. Use `console.log()` statements for debugging

## Customization

You can customize the add-on by:
- Modifying the ChatGPT prompts in the API calls
- Adjusting the UI layout in the card building functions
- Adding new features by extending the existing functions
- Changing the default GPT model or parameters

## Limitations

- Requires active internet connection
- Subject to OpenAI API rate limits and costs
- Gmail add-ons have UI constraints compared to web applications
- Email content size is limited by ChatGPT token limits

## Contributing

Feel free to submit issues and enhancement requests!
