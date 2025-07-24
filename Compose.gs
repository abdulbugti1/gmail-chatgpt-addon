// Compose UI integration functions

/**
 * Handle compose trigger for draft assistance
 * @param {Object} e - Event object from Gmail compose
 * @return {Card} Compose assistance card
 */
function draftWithChatGPT(e) {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('✨ ChatGPT Compose')
      .setSubtitle('AI-powered email drafting'))
    .addSection(buildComposeAssistanceSection())
    .build();
    
  return card;
}

/**
 * Build compose assistance section
 * @return {CardSection} Compose assistance section
 */
function buildComposeAssistanceSection() {
  const section = CardService.newCardSection()
    .setHeader('📝 New Email Assistant');
    
  section.addWidget(CardService.newDecoratedText()
    .setTopLabel('💡 Tip')
    .setText('Describe what you want to write and I\'ll draft it for you')
    .setWrapText(true)
    .setIcon(CardService.Icon.DESCRIPTION));
    
  section.addWidget(CardService.newDivider());
    
  section.addWidget(CardService.newTextInput()
    .setFieldName('emailPurpose')
    .setTitle('📋 Email Purpose')
    .setHint('e.g., "Schedule a team meeting" or "Follow up on project status"')
    .setMultiline(false));
    
  section.addWidget(CardService.newTextInput()
    .setFieldName('keyPoints')
    .setTitle('🎯 Key Points')
    .setHint('List the main points or details to include')
    .setMultiline(true));
    
  section.addWidget(CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('🎭 Tone')
    .setFieldName('emailTone')
    .addItem('Professional', 'professional', true)
    .addItem('Friendly', 'friendly', false)
    .addItem('Formal', 'formal', false)
    .addItem('Brief', 'brief', false)
    .addItem('Urgent', 'urgent', false));
    
  section.addWidget(CardService.newTextButton()
    .setText('✨ GENERATE DRAFT')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction()
      .setFunctionName('generateComposeDraft')));
  
  return section;
}

/**
 * Generate draft for new compose window
 * @param {Object} e - Event object from form submission
 * @return {ActionResponse} Updated card with draft
 */
function generateComposeDraft(e) {
  const emailPurpose = e.formInput.emailPurpose || '';
  const keyPoints = e.formInput.keyPoints || '';
  const emailTone = e.formInput.emailTone || 'professional';
  
  if (!emailPurpose.trim() && !keyPoints.trim()) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Please provide either an email purpose or key points.'))
      .build();
  }
  
  try {
    // Generate draft with ChatGPT
    const draft = callChatGPT([
      {
        role: 'system',
        content: `You are an AI assistant that helps draft professional emails. Write clear, appropriate emails with a ${emailTone} tone. Provide only the email body text without subject line or signatures.`
      },
      {
        role: 'user',
        content: `Please draft an email with the following details:\n\nPurpose: ${emailPurpose}\n\nKey Points:\n${keyPoints}\n\nTone: ${emailTone}\n\nPlease write a complete email body that covers these points appropriately.`
      }
    ]);
    
    // Build response card with draft
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('Generated Draft'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(draft)))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextButton()
          .setText('Insert into Email')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('insertDraftIntoCompose')
            .setParameters({'draft': draft})))
        .addWidget(CardService.newTextButton()
          .setText('Revise')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('reviseComposeDraft')
            .setParameters({'originalDraft': draft})))
        .addWidget(CardService.newTextButton()
          .setText('Start Over')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('draftWithChatGPT'))))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
      
  } catch (error) {
    console.error('Error generating compose draft:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error generating draft: ' + error.message))
      .build();
  }
}

/**
 * Insert draft into Gmail compose window
 * @param {Object} e - Event object
 * @return {ActionResponse} Compose action response
 */
function insertDraftIntoCompose(e) {
  const draft = e.parameters.draft;
  
  if (!draft) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('No draft content to insert.'))
      .build();
  }
  
  try {
    // Create compose action to insert draft
    const composeAction = CardService.newComposeActionResponseBuilder()
      .setGmailDraft(CardService.newGmailDraft()
        .setBody(draft))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setComposeAction(composeAction)
      .setNotification(CardService.newNotification()
        .setText('Draft inserted into email!'))
      .build();
      
  } catch (error) {
    console.error('Error inserting draft:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error inserting draft: ' + error.message))
      .build();
  }
}

/**
 * Revise compose draft
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated card with revision interface
 */
function reviseComposeDraft(e) {
  const originalDraft = e.parameters.originalDraft;
  
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
        .setTitle('How should this be changed?')
        .setHint('Describe the changes you want to make')
        .setMultiline(true)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('Generate Revision')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('generateComposeRevision')
          .setParameters({'originalDraft': originalDraft})))
      .addWidget(CardService.newTextButton()
        .setText('Back to Draft')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showDraft')
          .setParameters({'draft': originalDraft}))))
    .build();
    
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

/**
 * Generate revised compose draft
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated card with revised draft
 */
function generateComposeRevision(e) {
  const originalDraft = e.parameters.originalDraft;
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
        content: 'You are an AI assistant that helps revise email drafts based on user feedback. Make the requested changes while maintaining professionalism and clarity.'
      },
      {
        role: 'user',
        content: `Please revise this email draft based on the instructions:\n\nOriginal Draft:\n${originalDraft}\n\nRevision Instructions:\n${revisionInstructions}\n\nProvide the revised email body text only.`
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
          .setText('Insert into Email')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('insertDraftIntoCompose')
            .setParameters({'draft': revisedDraft})))
        .addWidget(CardService.newTextButton()
          .setText('Revise Again')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('reviseComposeDraft')
            .setParameters({'originalDraft': revisedDraft})))
        .addWidget(CardService.newTextButton()
          .setText('Start Over')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('draftWithChatGPT'))))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
      
  } catch (error) {
    console.error('Error revising compose draft:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Error revising draft: ' + error.message))
      .build();
  }
}

/**
 * Show draft card (helper function)
 * @param {Object} e - Event object
 * @return {ActionResponse} Card showing draft
 */
function showDraft(e) {
  const draft = e.parameters.draft;
  
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Draft'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(draft)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText('Insert into Email')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('insertDraftIntoCompose')
          .setParameters({'draft': draft})))
      .addWidget(CardService.newTextButton()
        .setText('Revise')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('reviseComposeDraft')
          .setParameters({'originalDraft': draft})))
      .addWidget(CardService.newTextButton()
        .setText('Start Over')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('draftWithChatGPT'))))
    .build();
    
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}