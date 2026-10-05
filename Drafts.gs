// Drafting replies to the open thread and new emails in the compose window

const QUICK_REVISIONS = ['Shorter', 'More formal', 'Friendlier'];

const MODE_REPLY = 'reply';
const MODE_COMPOSE = 'compose';

/**
 * Reply form for the open thread
 * @param {Object} e - Event object; parameters.instructions optionally pre-fills the form
 * @return {ActionResponse} Draft form card
 */
function showDraftScreen(e) {
  try {
    const context = getEmailThreadContext(e);
    const instructions = (e.parameters && e.parameters.instructions) || '';

    const card = CardService.newCardBuilder()
      .setHeader(header_('Draft a reply', context.subject))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextInput()
          .setFieldName('draftInstructions')
          .setTitle('What should the reply say?')
          .setHint('e.g. "Accept the meeting and suggest Thursday instead"')
          .setValue(instructions)
          .setMultiline(true))
        .addWidget(toneInput_('draftTone')))
      .setFixedFooter(footer_(
        primaryButton_('Generate draft', 'generateEmailDraft'),
        secondaryButton_('Back', 'goBack')))
      .build();

    return push_(card);
  } catch (error) {
    return errorResponse_('Error opening draft screen', error);
  }
}

/**
 * Compose trigger: drafting assistant for a new email
 * @param {Object} e - Event object from Gmail compose
 * @return {Card} Compose form card
 */
function draftWithChatGPT(e) {
  return CardService.newCardBuilder()
    .setHeader(header_('Write with ChatGPT', 'Describe the email and get a draft'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextInput()
        .setFieldName('emailPurpose')
        .setTitle('Purpose')
        .setHint('e.g. "Schedule a team meeting"'))
      .addWidget(CardService.newTextInput()
        .setFieldName('keyPoints')
        .setTitle('Key points')
        .setHint('Details to include, one per line')
        .setMultiline(true))
      .addWidget(toneInput_('emailTone')))
    .setFixedFooter(footer_(primaryButton_('Generate draft', 'generateComposeDraft')))
    .build();
}

/**
 * Generate a reply to the open thread
 * @param {Object} e - Event object from form submission
 * @return {ActionResponse} Draft card
 */
function generateEmailDraft(e) {
  const instructions = (e.formInput.draftInstructions || '').trim();
  const tone = e.formInput.draftTone || 'professional';
  if (!instructions) {
    return notify_('Describe what the reply should say.');
  }

  try {
    const context = getEmailThreadContext(e);
    const draft = callChatGPT([
      {
        role: 'system',
        content: `You draft email replies in a ${tone} tone. ${UNTRUSTED_EMAIL_RULE} ` +
          'Return only the email body: no subject line and no signature.'
      },
      { role: 'user', content: formatThreadForPrompt_(context) },
      { role: 'user', content: `Write my reply to this thread. Instructions: ${instructions}` }
    ]);

    return push_(buildDraftCard_({ mode: MODE_REPLY, tone: tone, instructions: instructions }, draft));
  } catch (error) {
    return errorResponse_('Error generating draft', error);
  }
}

/**
 * Generate a new email from the compose form
 * @param {Object} e - Event object from form submission
 * @return {ActionResponse} Draft card
 */
function generateComposeDraft(e) {
  const purpose = (e.formInput.emailPurpose || '').trim();
  const keyPoints = (e.formInput.keyPoints || '').trim();
  const tone = e.formInput.emailTone || 'professional';
  if (!purpose && !keyPoints) {
    return notify_('Add a purpose or some key points.');
  }

  const instructions = `Purpose: ${purpose || 'not specified'}\nKey points:\n${keyPoints || 'none'}`;

  try {
    const draft = callChatGPT([
      {
        role: 'system',
        content: `You draft emails in a ${tone} tone. Return only the email body: no subject line and no signature.`
      },
      { role: 'user', content: `Write an email.\n\n${instructions}` }
    ]);

    return push_(buildDraftCard_({ mode: MODE_COMPOSE, tone: tone, instructions: instructions }, draft));
  } catch (error) {
    return errorResponse_('Error generating draft', error);
  }
}

/**
 * Revise the (possibly hand-edited) draft, from the text box or a quick-revision button
 * @param {Object} e - Event object; parameters hold mode, tone, instructions and optional revision
 * @return {ActionResponse} Updated draft card
 */
function reviseDraft(e) {
  const state = {
    mode: e.parameters.mode,
    tone: e.parameters.tone,
    instructions: e.parameters.instructions
  };
  const currentDraft = (e.formInput.draftText || '').trim();
  const revision = (e.parameters.revision || e.formInput.revisionInstructions || '').trim();
  if (!revision) {
    return notify_('Describe how to change the draft.');
  }

  try {
    const messages = [{
      role: 'system',
      content: `You revise email drafts in a ${state.tone} tone. ${UNTRUSTED_EMAIL_RULE} ` +
        'Apply the requested change and return only the revised email body: no subject line and no signature.'
    }];
    if (state.mode === MODE_REPLY) {
      messages.push({ role: 'user', content: formatThreadForPrompt_(getEmailThreadContext(e)) });
    }
    messages.push({
      role: 'user',
      content: `Original instructions:\n${state.instructions}\n\nCurrent draft:\n${currentDraft}\n\nRequested change: ${revision}`
    });

    return update_(buildDraftCard_(state, callChatGPT(messages)));
  } catch (error) {
    return errorResponse_('Error revising draft', error);
  }
}

/**
 * Draft result screen shared by replies and new emails. The draft is editable before inserting.
 * @param {Object} state - { mode, tone, instructions }
 * @param {string} draft - Generated email body
 * @return {Card}
 */
function buildDraftCard_(state, draft) {
  const quickRevisions = CardService.newButtonSet();
  QUICK_REVISIONS.forEach(revision => quickRevisions.addButton(
    secondaryButton_(revision, 'reviseDraft', Object.assign({ revision: revision }, state))));
  quickRevisions.addButton(secondaryButton_('Apply', 'reviseDraft', state));

  let insertButton;
  if (state.mode === MODE_REPLY) {
    insertButton = CardService.newTextButton()
      .setText('Create reply')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setComposeAction(action_('insertReplyDraft'), CardService.ComposedEmailType.REPLY_AS_DRAFT);
  } else {
    insertButton = primaryButton_('Insert into email', 'insertDraftIntoCompose');
  }

  return CardService.newCardBuilder()
    .setHeader(header_('Your draft', state.mode === MODE_REPLY ? 'Edit freely, then create the reply' : 'Edit freely, then insert'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextInput()
        .setFieldName('draftText')
        .setTitle('Draft')
        .setValue(draft)
        .setMultiline(true)))
    .addSection(CardService.newCardSection()
      .setHeader('Refine')
      .addWidget(CardService.newTextInput()
        .setFieldName('revisionInstructions')
        .setTitle('How should it change?')
        .setHint('e.g. "Mention the budget deadline"'))
      .addWidget(quickRevisions))
    .setFixedFooter(footer_(insertButton, secondaryButton_('Start over', 'goBack')))
    .build();
}

/**
 * Compose action: create a reply draft to the open message with the draft text
 * @param {Object} e - Event object
 * @return {ComposeActionResponse}
 */
function insertReplyDraft(e) {
  const body = (e.formInput.draftText || '').trim();
  const message = getCurrentMessage_(e);
  const draft = message.createReplyDraft(body);
  return CardService.newComposeActionResponseBuilder()
    .setGmailDraft(draft)
    .build();
}

/**
 * Insert the draft text at the cursor in the open compose window
 * @param {Object} e - Event object
 * @return {UpdateDraftActionResponse|ActionResponse}
 */
function insertDraftIntoCompose(e) {
  const body = (e.formInput.draftText || '').trim();
  if (!body) {
    return notify_('The draft is empty.');
  }

  return CardService.newUpdateDraftActionResponseBuilder()
    .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
      .addUpdateContent(escapeHtml_(body).replace(/\n/g, '<br>'), CardService.ContentType.MUTABLE_HTML)
      .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
    .build();
}
