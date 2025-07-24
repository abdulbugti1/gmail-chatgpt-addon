// ChatGPT API integration functions

/**
 * Call ChatGPT API with messages
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} model - GPT model to use (default: gpt-3.5-turbo)
 * @return {string} ChatGPT response
 */
function callChatGPT(messages, model = 'gpt-3.5-turbo') {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in script properties.');
  }
  
  const payload = {
    model: model,
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch(CHATGPT_API_URL, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.error) {
      throw new Error(`ChatGPT API Error: ${responseData.error.message}`);
    }
    
    return responseData.choices[0].message.content.trim();
  } catch (error) {
    console.error('ChatGPT API call failed:', error);
    throw new Error(`Failed to call ChatGPT: ${error.message}`);
  }
}

/**
 * Chat with email content based on user query
 * @param {Object} e - Event object from form submission
 * @return {ActionResponse} Updated card with chat response
 */
function chatWithEmailContent(e) {
  const chatQuery = e.formInput.chatQuery;
  
  if (!chatQuery || chatQuery.trim() === '') {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Please enter a question to ask about the email.'))
      .build();
  }
  
  try {
    // Get email context
    const emailContext = getEmailThreadContext(e);
    
    // Prepare email content for ChatGPT
    const emailContent = emailContext.messages.map(msg => 
      `From: ${msg.from}\nDate: ${msg.date}\nContent: ${msg.body.substring(0, 1000)}${msg.body.length > 1000 ? '...' : ''}`
    ).join('\n\n---\n\n');
    
    // Call ChatGPT with the user's question
    const response = callChatGPT([
      {
        role: 'system',
        content: 'You are an AI assistant helping with email analysis. Answer questions about the provided email thread accurately and helpfully. Keep responses concise but informative.'
      },
      {
        role: 'user',
        content: `Email Thread:\nSubject: ${emailContext.subject}\n\n${emailContent}\n\nQuestion: ${chatQuery}`
      }
    ]);
    
    // Build response card
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('💭 Chat Response')
        .setSubtitle('ChatGPT answered your question'))
      .addSection(CardService.newCardSection()
        .setHeader('🙋 Your Question')
        .addWidget(CardService.newTextParagraph()
          .setText(`"${chatQuery}"`)))
      .addSection(CardService.newCardSection()
        .setHeader('🤖 ChatGPT Answer')
        .addWidget(CardService.newTextParagraph()
          .setText(response)))
      .addSection(CardService.newCardSection()
        .setHeader('Continue Conversation')
        .addWidget(CardService.newTextInput()
          .setFieldName('followUpQuery')
          .setTitle('Ask another question')
          .setHint('Continue the conversation about this email thread')
          .setMultiline(true))
        .addWidget(CardService.newTextButton()
          .setText('💬 ASK FOLLOW-UP')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('askFollowUp')))
        .addWidget(CardService.newTextButton()
          .setText('🔄 NEW CHAT')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showChatScreen')))
        .addWidget(CardService.newTextButton()
          .setText('← BACK TO MENU')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('buildGmailCard'))))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
      
  } catch (error) {
    console.error('Error in chat:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Handle follow-up questions in chat
 * @param {Object} e - Event object from form submission
 * @return {ActionResponse} Updated card with follow-up response
 */
function askFollowUp(e) {
  const followUpQuery = e.formInput.followUpQuery;
  
  if (!followUpQuery || followUpQuery.trim() === '') {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Please enter a follow-up question.'))
      .build();
  }
  
  // Reuse the chatWithEmailContent function with the follow-up query
  const modifiedEvent = {
    ...e,
    formInput: {
      ...e.formInput,
      chatQuery: followUpQuery
    }
  };
  
  return chatWithEmailContent(modifiedEvent);
}

/**
 * Generate email draft with ChatGPT assistance
 * @param {Object} e - Event object from form submission
 * @return {ActionResponse} Updated card with draft
 */
function generateEmailDraft(e) {
  const draftInstructions = e.formInput.draftInstructions;
  
  if (!draftInstructions || draftInstructions.trim() === '') {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Please provide instructions for the draft.'))
      .build();
  }
  
  try {
    // Get email context
    const emailContext = getEmailThreadContext(e);
    
    // Prepare email thread context
    const emailContent = emailContext.messages.map(msg => 
      `From: ${msg.from}\nDate: ${msg.date}\nContent: ${msg.body.substring(0, 1000)}${msg.body.length > 1000 ? '...' : ''}`
    ).join('\n\n---\n\n');
    
    // Generate draft with ChatGPT
    const draft = callChatGPT([
      {
        role: 'system',
        content: 'You are an AI assistant that helps draft professional email responses. Write clear, appropriate, and contextually relevant email responses based on the thread history and user instructions.'
      },
      {
        role: 'user',
        content: `Please draft an email response based on this thread and instructions.\n\nEmail Thread:\nSubject: ${emailContext.subject}\n\n${emailContent}\n\nDraft Instructions: ${draftInstructions}\n\nPlease provide only the email body text, without subject line or signatures.`
      }
    ]);
    
    // Build response card with draft
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('✨ Draft Generated')
        .setSubtitle('AI-powered email response'))
      .addSection(CardService.newCardSection()
        .setHeader('📝 Your Draft')
        .addWidget(CardService.newTextParagraph()
          .setText(draft)))
      .addSection(CardService.newCardSection()
        .setHeader('Next Steps')
        .addWidget(CardService.newTextButton()
          .setText('📧 INSERT INTO EMAIL')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('insertDraftIntoCompose')
            .setParameters({'draft': draft})))
        .addWidget(CardService.newTextButton()
          .setText('✏️ REVISE DRAFT')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('reviseDraft')
            .setParameters({'originalDraft': draft, 'originalInstructions': draftInstructions})))
        .addWidget(CardService.newTextButton()
          .setText('🔄 NEW DRAFT')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showDraftScreen')))
        .addWidget(CardService.newTextButton()
          .setText('← BACK TO MENU')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('buildGmailCard'))))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
      
  } catch (error) {
    console.error('Error generating draft:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error generating draft: ' + error.message))
      .build();
  }
}

/**
 * Revise existing draft with new instructions
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated card with revision interface
 */
function reviseDraft(e) {
  const originalDraft = e.parameters.originalDraft;
  const originalInstructions = e.parameters.originalInstructions;
  
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Revise Draft'))
    .addSection(CardService.newCardSection()
      .setHeader('Current Draft')
      .addWidget(CardService.newTextParagraph()
        .setText(originalDraft)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextInput()
        .setFieldName('revisionInstructions')
        .setTitle('How should this be revised?')
        .setHint('Describe changes to make to the draft')
        .setMultiline(true)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('Generate Revision')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('generateDraftRevision')
          .setParameters({
            'originalDraft': originalDraft,
            'originalInstructions': originalInstructions
          })))
      .addWidget(CardService.newTextButton()
        .setText('Back to Draft')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('generateEmailDraft'))))
    .build();
    
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

/**
 * Generate revised draft based on revision instructions
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated card with revised draft
 */
function generateDraftRevision(e) {
  const originalDraft = e.parameters.originalDraft;
  const originalInstructions = e.parameters.originalInstructions;
  const revisionInstructions = e.formInput.revisionInstructions;
  
  if (!revisionInstructions || revisionInstructions.trim() === '') {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Please provide revision instructions.'))
      .build();
  }
  
  try {
    // Generate revised draft
    const revisedDraft = callChatGPT([
      {
        role: 'system',
        content: 'You are an AI assistant that helps revise email drafts. Make the requested changes while maintaining professionalism and context appropriateness.'
      },
      {
        role: 'user',
        content: `Please revise this email draft based on the revision instructions.\n\nOriginal Draft:\n${originalDraft}\n\nOriginal Instructions: ${originalInstructions}\n\nRevision Instructions: ${revisionInstructions}\n\nProvide the revised email body text only.`
      }
    ]);
    
    // Show revised draft
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('Revised Draft'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(revisedDraft)))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextButton()
          .setText('Insert into Compose')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('insertDraftIntoCompose')
            .setParameters({'draft': revisedDraft})))
        .addWidget(CardService.newTextButton()
          .setText('Revise Again')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('reviseDraft')
            .setParameters({'originalDraft': revisedDraft})))
        .addWidget(CardService.newTextButton()
          .setText('Back to Main')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('buildGmailCard'))))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
      
  } catch (error) {
    console.error('Error revising draft:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error revising draft: ' + error.message))
      .build();
  }
}