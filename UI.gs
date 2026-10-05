// Shared card-building helpers so every screen looks and behaves the same

const TONES = [
  ['Professional', 'professional'],
  ['Friendly', 'friendly'],
  ['Formal', 'formal'],
  ['Brief', 'brief'],
  ['Urgent', 'urgent']
];

/**
 * Material Symbols icon (https://fonts.google.com/icons)
 * @param {string} name - Icon name, e.g. "summarize"
 * @return {IconImage}
 */
function icon_(name) {
  return CardService.newIconImage()
    .setMaterialIcon(CardService.newMaterialIcon().setName(name));
}

/**
 * Action that shows a spinner while the handler runs
 * @param {string} functionName - Handler to call
 * @param {Object=} params - String-valued parameters passed to the handler
 * @return {Action}
 */
function action_(functionName, params) {
  const action = CardService.newAction()
    .setFunctionName(functionName)
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);
  if (params) action.setParameters(params);
  return action;
}

function primaryButton_(text, functionName, params) {
  return CardService.newTextButton()
    .setText(text)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(action_(functionName, params));
}

function secondaryButton_(text, functionName, params) {
  return CardService.newTextButton()
    .setText(text)
    .setTextButtonStyle(CardService.TextButtonStyle.OUTLINED)
    .setOnClickAction(action_(functionName, params));
}

function header_(title, subtitle) {
  const header = CardService.newCardHeader().setTitle(title);
  if (subtitle) header.setSubtitle(subtitle);
  return header;
}

function footer_(primary, secondary) {
  const footer = CardService.newFixedFooter().setPrimaryButton(primary);
  if (secondary) footer.setSecondaryButton(secondary);
  return footer;
}

/**
 * Plain text rendered safely inside a card (cards interpret basic HTML)
 * @param {string} text
 * @return {TextParagraph}
 */
function paragraph_(text) {
  return CardService.newTextParagraph().setText(escapeHtml_(text).replace(/\n/g, '<br>'));
}

function escapeHtml_(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toneInput_(fieldName, selectedTone) {
  const input = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('Tone')
    .setFieldName(fieldName);
  TONES.forEach(([label, value]) => input.addItem(label, value, value === (selectedTone || 'professional')));
  return input;
}

// Navigation responses

function push_(card) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function update_(card) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

function notify_(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}

function errorResponse_(context, error) {
  console.error(`${context}:`, error);
  return notify_(`${context}: ${error.message}`);
}

/** Button handler: return to the previous screen */
function goBack(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

/** Button handler: return to the main menu */
function goHome(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot())
    .build();
}
