// Gmail ChatGPT Assistant Add-on
// Main entry point, home menu and thread analysis

/**
 * Contextual trigger: builds the sidebar when an email is opened
 * @param {Object} e - Event object from Gmail
 * @return {Card} The card to display in Gmail sidebar
 */
function buildGmailCard(e) {
  try {
    return buildHomeCard_(getEmailThreadContext(e));
  } catch (error) {
    console.error('Error building Gmail card:', error);
    return CardService.newCardBuilder()
      .setHeader(header_('Email Assistant'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newDecoratedText()
          .setStartIcon(icon_('error'))
          .setTopLabel('Something went wrong')
          .setText(escapeHtml_(error.message))
          .setWrapText(true)))
      .build();
  }
}

/**
 * Main menu for the open thread
 * @param {Object} context - Email thread context
 * @return {Card}
 */
function buildHomeCard_(context) {
  const messageLabel = `${context.messageCount} message${context.messageCount === 1 ? '' : 's'}`;
  const peopleLabel = `${context.participants.length} participant${context.participants.length === 1 ? '' : 's'}`;

  const threadSection = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setStartIcon(icon_('mail'))
      .setTopLabel('Current thread')
      .setText(`<b>${escapeHtml_(context.subject)}</b>`)
      .setBottomLabel(`${messageLabel} · ${peopleLabel}`)
      .setWrapText(true));

  const actionsSection = CardService.newCardSection()
    .setHeader('What would you like to do?')
    .addWidget(menuItem_('summarize', 'Analyze thread', 'Summary, action items and key dates', 'analyzeEmailWithChatGPT'))
    .addWidget(menuItem_('forum', 'Ask about this thread', 'Chat with the conversation', 'showChatScreen'))
    .addWidget(menuItem_('edit_note', 'Draft a reply', 'Write a response in the tone you choose', 'showDraftScreen'))
    .addWidget(menuItem_('content_copy', 'Copy thread', 'Formatted to paste into ChatGPT', 'copyThreadToClipboard'));

  return CardService.newCardBuilder()
    .setHeader(header_('Email Assistant', 'Powered by ChatGPT'))
    .addSection(threadSection)
    .addSection(actionsSection)
    .build();
}

function menuItem_(iconName, title, description, functionName) {
  return CardService.newDecoratedText()
    .setStartIcon(icon_(iconName))
    .setText(`<b>${title}</b>`)
    .setBottomLabel(description)
    .setWrapText(true)
    .setEndIcon(icon_('chevron_right'))
    .setOnClickAction(action_(functionName));
}

/**
 * Analyze email thread with ChatGPT
 * @param {Object} e - Event object
 * @return {ActionResponse} Analysis card
 */
function analyzeEmailWithChatGPT(e) {
  try {
    const context = getEmailThreadContext(e);
    const response = callChatGPT([
      {
        role: 'system',
        content: 'You analyze email threads. ' + UNTRUSTED_EMAIL_RULE + ' ' +
          'Respond with a JSON object: {"summary": string (2-4 sentences), "actionItems": [string], ' +
          '"keyDates": [string], "tone": string (one or two words), "nextStep": string (one sentence)}. ' +
          'Use empty arrays when nothing applies.'
      },
      { role: 'user', content: formatThreadForPrompt_(context) }
    ], { json: true });

    return push_(buildAnalysisCard_(context, parseAnalysis_(response)));
  } catch (error) {
    return errorResponse_('Error analyzing email', error);
  }
}

function parseAnalysis_(response) {
  try {
    return JSON.parse(response);
  } catch (error) {
    return { summary: response };
  }
}

/**
 * @param {Object} context - Email thread context
 * @param {Object} analysis - Parsed analysis from the model
 * @return {Card}
 */
function buildAnalysisCard_(context, analysis) {
  const card = CardService.newCardBuilder()
    .setHeader(header_('Thread analysis', context.subject));

  const summarySection = CardService.newCardSection()
    .setHeader('Summary')
    .addWidget(paragraph_(analysis.summary || 'No summary available.'));
  if (analysis.tone) {
    summarySection.addWidget(CardService.newDecoratedText()
      .setStartIcon(icon_('mood'))
      .setTopLabel('Tone')
      .setText(escapeHtml_(analysis.tone)));
  }
  card.addSection(summarySection);

  addListSection_(card, 'Action items', 'task_alt', analysis.actionItems);
  addListSection_(card, 'Key dates', 'event', analysis.keyDates);

  if (analysis.nextStep) {
    card.addSection(CardService.newCardSection()
      .setHeader('Suggested next step')
      .addWidget(CardService.newDecoratedText()
        .setStartIcon(icon_('lightbulb'))
        .setText(escapeHtml_(analysis.nextStep))
        .setWrapText(true)));
  }

  return card
    .setFixedFooter(footer_(
      primaryButton_('Draft a reply', 'showDraftScreen', { instructions: analysis.nextStep || '' }),
      secondaryButton_('Back', 'goBack')))
    .build();
}

function addListSection_(card, title, iconName, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const section = CardService.newCardSection().setHeader(title);
  items.forEach(item => section.addWidget(CardService.newDecoratedText()
    .setStartIcon(icon_(iconName))
    .setText(escapeHtml_(item))
    .setWrapText(true)));
  card.addSection(section);
}

/**
 * Show the whole thread formatted as a prompt to paste into ChatGPT
 * (add-ons cannot write to the clipboard, so the text is shown ready to select)
 * @param {Object} e - Event object
 * @return {ActionResponse} Card with the formatted thread
 */
function copyThreadToClipboard(e) {
  try {
    const context = getEmailThreadContext(e);
    const card = CardService.newCardBuilder()
      .setHeader(header_('Copy thread', 'Select all in the box, copy, then paste into ChatGPT'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextInput()
          .setFieldName('threadText')
          .setTitle(`${context.messageCount} message${context.messageCount === 1 ? '' : 's'}`)
          .setValue(buildThreadPrompt_(context))
          .setMultiline(true)))
      .setFixedFooter(footer_(
        CardService.newTextButton()
          .setText('Open ChatGPT')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOpenLink(CardService.newOpenLink()
            .setUrl('https://chatgpt.com/')
            .setOpenAs(CardService.OpenAs.FULL_SIZE)
            .setOnClose(CardService.OnClose.NOTHING)),
        secondaryButton_('Back', 'goBack')))
      .build();
    return push_(card);
  } catch (error) {
    return errorResponse_('Error copying thread', error);
  }
}

function buildThreadPrompt_(context) {
  const messages = context.messages.map((msg, index) =>
    `Message ${index + 1}:\nFrom: ${msg.from}\nTo: ${msg.to}\nDate: ${msg.date}\n\n${msg.body}`
  ).join('\n\n---\n\n');

  return `I have an email thread that I'd like to discuss. Here are the details:\n\n` +
    `Subject: ${context.subject}\n` +
    `Number of messages: ${context.messageCount}\n` +
    `Participants: ${context.participants.join(', ')}\n\n` +
    `Email Thread:\n${messages}\n\n` +
    `Please help me understand this email thread and answer any questions I have about it.`;
}
