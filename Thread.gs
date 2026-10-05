// Reading the open email thread and preparing it for the model

const MAX_THREAD_CHARS = 12000;

/**
 * The message currently open in Gmail, using the add-on's per-message access token
 * @param {Object} e - Event object from Gmail
 * @return {GmailMessage}
 */
function getCurrentMessage_(e) {
  const meta = e.gmail || e.messageMetadata;
  if (!meta || !meta.messageId) {
    throw new Error('Open an email to use this feature.');
  }
  GmailApp.setCurrentMessageAccessToken(meta.accessToken);
  return GmailApp.getMessageById(meta.messageId);
}

/**
 * Get email thread context for the open message
 * @param {Object} e - Event object from Gmail
 * @return {Object} Email thread context
 */
function getEmailThreadContext(e) {
  const message = getCurrentMessage_(e);
  const thread = message.getThread();
  const messages = thread.getMessages();
  const timeZone = Session.getScriptTimeZone();

  return {
    threadId: thread.getId(),
    subject: thread.getFirstMessageSubject() || '(no subject)',
    messageCount: messages.length,
    participants: extractParticipants_(messages),
    messages: messages.map(msg => ({
      from: msg.getFrom(),
      to: msg.getTo(),
      date: Utilities.formatDate(msg.getDate(), timeZone, 'yyyy-MM-dd HH:mm'),
      body: stripQuotedText_(msg.getPlainBody() || '')
    }))
  };
}

/**
 * Unique senders and recipients across the thread
 * @param {GmailMessage[]} messages
 * @return {string[]}
 */
function extractParticipants_(messages) {
  const participants = new Set();
  messages.forEach(msg => {
    [msg.getFrom(), msg.getTo(), msg.getCc()]
      .filter(Boolean)
      .forEach(field => field.split(',').forEach(address => participants.add(address.trim())));
  });
  return Array.from(participants);
}

/**
 * Remove quoted earlier replies so each message only contributes its new text
 * @param {string} body - Plain-text message body
 * @return {string}
 */
function stripQuotedText_(body) {
  const kept = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^On .+wrote:$/.test(trimmed) || /^-+\s*Original Message\s*-+$/i.test(trimmed)) break;
    if (trimmed.startsWith('>')) continue;
    kept.push(line);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Format the thread for a prompt, keeping the most recent messages within MAX_THREAD_CHARS.
 * The thread is wrapped in tags so the model can treat it as untrusted data.
 * @param {Object} context - Result of getEmailThreadContext
 * @return {string}
 */
function formatThreadForPrompt_(context) {
  const blocks = [];
  let used = 0;
  let omitted = 0;

  for (let i = context.messages.length - 1; i >= 0; i--) {
    const msg = context.messages[i];
    const remaining = MAX_THREAD_CHARS - used;
    if (remaining < 200) {
      omitted = i + 1;
      break;
    }
    let block = `From: ${msg.from}\nDate: ${msg.date}\n\n${msg.body}`;
    if (block.length > remaining) block = block.slice(0, remaining) + '…';
    blocks.unshift(block);
    used += block.length;
  }

  const note = omitted ? `(${omitted} earlier message(s) omitted for length)\n` : '';
  return `<email_thread>\nSubject: ${context.subject}\n${note}\n${blocks.join('\n\n---\n\n')}\n</email_thread>`;
}
