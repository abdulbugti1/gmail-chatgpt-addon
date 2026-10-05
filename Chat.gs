// Chat with the open email thread, keeping conversation history per thread

const CHAT_SUGGESTIONS = [
  'What are the action items?',
  'Who is waiting on a reply?',
  'Summarize the latest message'
];
const CHAT_HISTORY_TTL_SECONDS = 6 * 60 * 60;
const CHAT_HISTORY_MAX_TURNS = 10;

/**
 * Show chat screen
 * @param {Object} e - Event object
 * @return {ActionResponse} Chat card
 */
function showChatScreen(e) {
  try {
    const context = getEmailThreadContext(e);
    return push_(buildChatCard_(context, loadChatHistory_(context.threadId)));
  } catch (error) {
    return errorResponse_('Error opening chat', error);
  }
}

/**
 * Ask a question about the thread, from the text box or a suggestion button
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated chat card
 */
function askQuestion(e) {
  const question = ((e.parameters && e.parameters.question) ||
    (e.formInput && e.formInput.chatQuery) || '').trim();
  if (!question) {
    return notify_('Type a question first.');
  }

  try {
    const context = getEmailThreadContext(e);
    const history = loadChatHistory_(context.threadId);

    const answer = callChatGPT([
      {
        role: 'system',
        content: 'You answer questions about an email thread. ' + UNTRUSTED_EMAIL_RULE +
          ' Keep answers concise and specific.'
      },
      { role: 'user', content: formatThreadForPrompt_(context) },
      ...history,
      { role: 'user', content: question }
    ]);

    history.push({ role: 'user', content: question }, { role: 'assistant', content: answer });
    saveChatHistory_(context.threadId, history);
    return update_(buildChatCard_(context, history));
  } catch (error) {
    return errorResponse_('Error asking ChatGPT', error);
  }
}

/**
 * Clear the conversation for this thread
 * @param {Object} e - Event object
 * @return {ActionResponse} Updated chat card
 */
function clearChat(e) {
  try {
    const context = getEmailThreadContext(e);
    CacheService.getUserCache().remove(chatCacheKey_(context.threadId));
    return update_(buildChatCard_(context, []));
  } catch (error) {
    return errorResponse_('Error clearing chat', error);
  }
}

/**
 * @param {Object} context - Email thread context
 * @param {Array} history - Previous chat messages
 * @return {Card}
 */
function buildChatCard_(context, history) {
  const card = CardService.newCardBuilder()
    .setHeader(header_('Ask about this thread', context.subject));

  if (history.length > 0) {
    const conversation = CardService.newCardSection().setHeader('Conversation');
    history.forEach(turn => {
      const isUser = turn.role === 'user';
      conversation.addWidget(CardService.newDecoratedText()
        .setStartIcon(icon_(isUser ? 'person' : 'auto_awesome'))
        .setTopLabel(isUser ? 'You' : 'ChatGPT')
        .setText(escapeHtml_(turn.content).replace(/\n/g, '<br>'))
        .setWrapText(true));
    });
    card.addSection(conversation);
  }

  const suggestions = CardService.newButtonSet();
  CHAT_SUGGESTIONS.forEach(question =>
    suggestions.addButton(secondaryButton_(question, 'askQuestion', { question: question })));

  card.addSection(CardService.newCardSection()
    .setHeader(history.length > 0 ? 'Ask a follow-up' : 'Ask a question')
    .addWidget(CardService.newTextInput()
      .setFieldName('chatQuery')
      .setTitle('Your question')
      .setHint('e.g. "What did they agree to?"')
      .setMultiline(true))
    .addWidget(suggestions));

  const secondary = history.length > 0
    ? secondaryButton_('Clear chat', 'clearChat')
    : secondaryButton_('Back', 'goBack');

  return card
    .setFixedFooter(footer_(primaryButton_('Ask', 'askQuestion'), secondary))
    .build();
}

function chatCacheKey_(threadId) {
  return `chat_${threadId}`;
}

function loadChatHistory_(threadId) {
  const saved = CacheService.getUserCache().get(chatCacheKey_(threadId));
  return saved ? JSON.parse(saved) : [];
}

function saveChatHistory_(threadId, history) {
  const recent = history.slice(-CHAT_HISTORY_MAX_TURNS * 2);
  let serialized = JSON.stringify(recent);
  // The user cache holds at most 100 KB per key; drop the oldest turns until it fits
  while (serialized.length > 90000 && recent.length > 2) {
    recent.splice(0, 2);
    serialized = JSON.stringify(recent);
  }
  CacheService.getUserCache().put(chatCacheKey_(threadId), serialized, CHAT_HISTORY_TTL_SECONDS);
}
