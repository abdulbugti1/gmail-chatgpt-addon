// Gmail ChatGPT Assistant Add-on
// Main entry points and core functionality

const CHATGPT_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

/**
 * Main function to build the Gmail card UI
 * @param {Object} e - Event object from Gmail
 * @return {Card} The card to display in Gmail sidebar
 */
function buildGmailCard(e) {
  try {
    // Get email thread context
    const emailContext = getEmailThreadContext(e);
    
    // Build the main navigation card
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🤖 ChatGPT Assistant')
        .setSubtitle('Choose an action below')
        .setImageUrl('https://developers.google.com/workspace/add-ons/images/card-header.png')
        .setImageStyle(CardService.ImageStyle.CIRCLE))
      .addSection(buildMainMenuSection(emailContext))
      .build();
      
    return card;
  } catch (error) {
    console.error('Error building Gmail card:', error);
    
    // Return error card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('⚠️ Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(`Something went wrong: ${error.message}`)))
      .build();
  }
}

/**
 * Build main menu with three primary options
 * @param {Object} emailContext - Email thread context
 * @return {CardSection} Main menu section
 */
function buildMainMenuSection(emailContext) {
  const section = CardService.newCardSection();
  
  // Email thread info widget
  const threadInfo = CardService.newDecoratedText()
    .setTopLabel('Current Thread')
    .setText(emailContext.subject || 'Unknown Subject')
    .setBottomLabel(`${emailContext.messageCount || 0} messages`)
    .setWrapText(true)
    .setIcon(CardService.Icon.EMAIL);
    
  section.addWidget(threadInfo);
  
  // Divider
  section.addWidget(CardService.newDivider());
  
  // Main action buttons with icons and descriptions
  const analyzeButton = CardService.newDecoratedText()
    .setTopLabel('📊 Analyze Email')
    .setText('Get AI insights and summary')
    .setBottomLabel('Understand key points and context')
    .setWrapText(true)
    .setButton(CardService.newTextButton()
      .setText('ANALYZE')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showAnalyzeScreen')))
    .setIcon(CardService.Icon.DESCRIPTION);
    
  const chatButton = CardService.newDecoratedText()
    .setTopLabel('💬 Chat with Email')
    .setText('Ask questions about this thread')
    .setBottomLabel('Interactive AI conversation')
    .setWrapText(true)
    .setButton(CardService.newTextButton()
      .setText('CHAT')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showChatScreen')))
    .setIcon(CardService.Icon.CHAT);
    
  const draftButton = CardService.newDecoratedText()
    .setTopLabel('✏️ Draft Response')
    .setText('Generate AI-powered reply')
    .setBottomLabel('Smart email composition')
    .setWrapText(true)
    .setButton(CardService.newTextButton()
      .setText('DRAFT')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showDraftScreen')))
    .setIcon(CardService.Icon.EDIT);
  
  section.addWidget(analyzeButton);
  section.addWidget(chatButton);  
  section.addWidget(draftButton);
  
  return section;
}

/**
 * Get email thread context using Gmail Add-on API
 * @param {Object} e - Event object from Gmail
 * @return {Object} Email thread context
 */
function getEmailThreadContext(e) {
  try {
    // Use Gmail add-on context to get message data
    const messageId = e.messageMetadata.messageId;
    const accessToken = e.messageMetadata.accessToken;
    
    // Get current message using Gmail add-on API
    const currentMessage = GmailApp.getMessageById(messageId);
    const thread = currentMessage.getThread();
    const messages = thread.getMessages();
    
    // Extract thread information
    const emailContext = {
      threadId: thread.getId(),
      subject: thread.getFirstMessageSubject(),
      participants: extractParticipantsFromThread(messages),
      messages: messages.map(msg => ({
        id: msg.getId(),
        from: msg.getFrom(),
        to: msg.getTo(),
        date: msg.getDate().toString(),
        body: msg.getPlainBody() || msg.getBody().replace(/<[^>]*>/g, '') // Get plain text or strip HTML
      })),
      currentMessageId: messageId,
      messageCount: messages.length
    };
    
    return emailContext;
  } catch (error) {
    console.error('Error getting email context:', error);
    // Fallback to basic information from event metadata
    return {
      error: 'Limited email access',
      threadId: e.messageMetadata.threadId || 'unknown',
      subject: e.messageMetadata.subject || 'Unknown Subject',
      participants: [],
      messages: [{
        id: e.messageMetadata.messageId,
        from: 'Unknown',
        to: 'Unknown', 
        date: new Date().toString(),
        body: 'Email content access limited in add-on mode'
      }],
      currentMessageId: e.messageMetadata.messageId,
      messageCount: 1
    };
  }
}

/**
 * Extract message body from payload
 * @param {Object} payload - Message payload
 * @return {string} Message body text
 */
function extractMessageBody(payload) {
  let body = '';
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body += Utilities.newBlob(Utilities.base64Decode(part.body.data)).getDataAsString();
      } else if (part.mimeType === 'text/html' && part.body.data && !body) {
        // Fallback to HTML if no plain text
        const htmlContent = Utilities.newBlob(Utilities.base64Decode(part.body.data)).getDataAsString();
        body += htmlContent.replace(/<[^>]*>/g, ''); // Simple HTML tag removal
      }
    }
  } else if (payload.body.data) {
    body = Utilities.newBlob(Utilities.base64Decode(payload.body.data)).getDataAsString();
  }
  
  return body || 'No content available';
}

/**
 * Get header value by name
 * @param {Array} headers - Email headers
 * @param {string} name - Header name
 * @return {string} Header value
 */
function getHeaderValue(headers, name) {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

/**
 * Extract participants from thread messages using GmailApp
 * @param {Array} messages - Thread messages from GmailApp
 * @return {Array} Unique participants
 */
function extractParticipantsFromThread(messages) {
  const participants = new Set();
  
  messages.forEach(msg => {
    const from = msg.getFrom();
    const to = msg.getTo();
    const cc = msg.getCc();
    
    if (from) participants.add(from);
    if (to) to.split(',').forEach(email => participants.add(email.trim()));
    if (cc) cc.split(',').forEach(email => participants.add(email.trim()));
  });
  
  return Array.from(participants);
}

/**
 * Build email summary section
 * @param {Object} emailContext - Email thread context
 * @param {Object} e - Event object for passing context
 * @return {CardSection} Email summary section
 */
function buildEmailSummarySection(emailContext, e) {
  const section = CardService.newCardSection()
    .setHeader('Email Summary');
    
  if (emailContext.error) {
    section.addWidget(CardService.newTextParagraph()
      .setText(`Note: ${emailContext.error}`));
  }
  
  section.addWidget(CardService.newTextParagraph()
    .setText(`Subject: ${emailContext.subject}`));
    
  section.addWidget(CardService.newTextParagraph()
    .setText(`Thread: ${emailContext.messageCount} messages`));
    
  // Show participants if available
  if (emailContext.participants && emailContext.participants.length > 0) {
    section.addWidget(CardService.newTextParagraph()
      .setText(`Participants: ${emailContext.participants.slice(0, 3).join(', ')}${emailContext.participants.length > 3 ? '...' : ''}`));
  }
    
  section.addWidget(CardService.newTextButton()
    .setText('Analyze with ChatGPT')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('analyzeEmailWithChatGPT')
      .setParameters({
        'threadId': emailContext.threadId,
        'messageId': emailContext.currentMessageId
      })));
  
  return section;
}

/**
 * Build chat interface section
 * @return {CardSection} Chat section
 */
function buildChatSection() {
  const section = CardService.newCardSection()
    .setHeader('Chat with Email Content');
    
  section.addWidget(CardService.newTextInput()
    .setFieldName('chatQuery')
    .setTitle('Ask about this email')
    .setHint('What would you like to know about this email thread?'));
    
  section.addWidget(CardService.newTextButton()
    .setText('Ask ChatGPT')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('chatWithEmailContent')));
  
  return section;
}

/**
 * Build draft assistance section
 * @return {CardSection} Draft section
 */
function buildDraftSection() {
  const section = CardService.newCardSection()
    .setHeader('Draft Response');
    
  section.addWidget(CardService.newTextInput()
    .setFieldName('draftInstructions')
    .setTitle('Draft instructions')
    .setHint('How should ChatGPT help draft your response?')
    .setMultiline(true));
    
  section.addWidget(CardService.newTextButton()
    .setText('Generate Draft')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('generateEmailDraft')));
  
  return section;
}

/**
 * Show analyze screen
 * @param {Object} e - Event object
 * @return {ActionResponse} Analyze screen card
 */
function showAnalyzeScreen(e) {
  const emailContext = getEmailThreadContext(e);
  
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('📊 Email Analysis')
      .setSubtitle('AI-powered insights'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Thread Subject')
        .setText(emailContext.subject)
        .setBottomLabel(`${emailContext.messageCount} messages`)
        .setIcon(CardService.Icon.EMAIL)
        .setWrapText(true)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('🔍 ANALYZE WITH AI')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('analyzeEmailWithChatGPT')))
      .addWidget(CardService.newTextButton()
        .setText('← BACK TO MENU')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('buildGmailCard'))))
    .build();
    
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

/**
 * Show chat screen
 * @param {Object} e - Event object
 * @return {ActionResponse} Chat screen card
 */
function showChatScreen(e) {
  const emailContext = getEmailThreadContext(e);
  
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('💬 Chat with Email')
      .setSubtitle('Ask questions about this thread'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Thread Subject')
        .setText(emailContext.subject)
        .setBottomLabel(`${emailContext.messageCount} messages available for chat`)
        .setIcon(CardService.Icon.EMAIL)
        .setWrapText(true)))
    .addSection(CardService.newCardSection()
      .setHeader('Ask Your Question')
      .addWidget(CardService.newTextInput()
        .setFieldName('chatQuery')
        .setTitle('What would you like to know?')
        .setHint('e.g., "What are the main action items?" or "Who needs to respond?"')
        .setMultiline(true))
      .addWidget(CardService.newTextButton()
        .setText('💭 ASK CHATGPT')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('chatWithEmailContent')))
      .addWidget(CardService.newTextButton()
        .setText('← BACK TO MENU')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('buildGmailCard'))))
    .build();
    
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

/**
 * Show draft screen
 * @param {Object} e - Event object
 * @return {ActionResponse} Draft screen card
 */
function showDraftScreen(e) {
  const emailContext = getEmailThreadContext(e);
  
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✏️ Draft Response')
      .setSubtitle('AI-powered email composition'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newDecoratedText()
        .setTopLabel('Replying to')
        .setText(emailContext.subject)
        .setBottomLabel(`Context from ${emailContext.messageCount} messages`)
        .setIcon(CardService.Icon.EMAIL)
        .setWrapText(true)))
    .addSection(CardService.newCardSection()
      .setHeader('Draft Instructions')
      .addWidget(CardService.newTextInput()
        .setFieldName('draftInstructions')
        .setTitle('How should I help with your response?')
        .setHint('e.g., "Write a professional reply accepting the meeting" or "Draft a follow-up asking for clarification"')
        .setMultiline(true))
      .addWidget(CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('Tone')
        .setFieldName('draftTone')
        .addItem('Professional', 'professional', true)
        .addItem('Friendly', 'friendly', false)
        .addItem('Formal', 'formal', false)
        .addItem('Brief', 'brief', false))
      .addWidget(CardService.newTextButton()
        .setText('✨ GENERATE DRAFT')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('generateEmailDraft')))
      .addWidget(CardService.newTextButton()
        .setText('← BACK TO MENU')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('buildGmailCard'))))
    .build();
    
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

/**
 * Analyze email thread with ChatGPT
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated card
 */
function analyzeEmailWithChatGPT(e) {
  try {
    // Get fresh email context
    const emailContext = getEmailThreadContext(e);
    
    // Prepare context for ChatGPT
    const emailSummary = emailContext.messages.map(msg => 
      `From: ${msg.from}\nDate: ${msg.date}\n${msg.body.substring(0, 1000)}${msg.body.length > 1000 ? '...' : ''}`
    ).join('\n\n---\n\n');
    
    // Call ChatGPT API
    const analysis = callChatGPT([
      {
        role: 'system',
        content: 'You are an AI assistant helping with email analysis. Provide a concise summary and key insights about the email thread.'
      },
      {
        role: 'user',
        content: `Please analyze this email thread and provide key insights:\n\nSubject: ${emailContext.subject}\nMessages: ${emailContext.messageCount}\n\nEmail Thread:\n${emailSummary}`
      }
    ]);
    
    // Build response card
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🎯 Analysis Results')
        .setSubtitle('ChatGPT insights'))
      .addSection(CardService.newCardSection()
        .setHeader('📋 Summary & Insights')
        .addWidget(CardService.newTextParagraph()
          .setText(analysis)))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextButton()
          .setText('🔄 ANALYZE AGAIN')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showAnalyzeScreen')))
        .addWidget(CardService.newTextButton()
          .setText('← BACK TO MENU')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('buildGmailCard'))))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
      
  } catch (error) {
    console.error('Error analyzing email:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error analyzing email: ' + error.message))
      .build();
  }
}