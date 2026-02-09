import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const penLightColors = {
  background: '#FDFCFB',
  foreground: '#1A1A1A',
  selection: 'rgba(194, 65, 12, 0.15)',
  cursor: '#C2410C',
  activeLine: 'rgba(194, 65, 12, 0.04)',
  gutterBackground: '#F8F6F4',
  gutterForeground: '#9CA3AF',
  gutterBorder: '#F0EDEA',

  keyword: '#C2410C',
  string: '#047857',
  number: '#7C3AED',
  comment: '#6B7280',
  function: '#2563EB',
  variable: '#0891B2',
  type: '#9333EA',
  operator: '#64748B',
  property: '#B45309',
  tag: '#C2410C',
  attribute: '#0891B2',
  punctuation: '#6B7280'
}

const penLightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: penLightColors.keyword, fontWeight: '500' },
  { tag: tags.controlKeyword, color: penLightColors.keyword, fontWeight: '500' },
  { tag: tags.definitionKeyword, color: penLightColors.keyword, fontWeight: '500' },
  { tag: tags.moduleKeyword, color: penLightColors.keyword, fontWeight: '500' },
  { tag: tags.operatorKeyword, color: penLightColors.keyword },

  { tag: tags.string, color: penLightColors.string },
  { tag: tags.special(tags.string), color: penLightColors.string },
  { tag: tags.regexp, color: penLightColors.string },

  { tag: tags.number, color: penLightColors.number },
  { tag: tags.bool, color: penLightColors.number },
  { tag: tags.null, color: penLightColors.number },

  { tag: tags.comment, color: penLightColors.comment, fontStyle: 'italic' },
  { tag: tags.lineComment, color: penLightColors.comment, fontStyle: 'italic' },
  { tag: tags.blockComment, color: penLightColors.comment, fontStyle: 'italic' },
  { tag: tags.docComment, color: penLightColors.comment, fontStyle: 'italic' },

  { tag: tags.function(tags.variableName), color: penLightColors.function },
  { tag: tags.function(tags.definition(tags.variableName)), color: penLightColors.function },

  { tag: tags.variableName, color: penLightColors.foreground },
  { tag: tags.definition(tags.variableName), color: penLightColors.variable },
  { tag: tags.local(tags.variableName), color: penLightColors.foreground },
  { tag: tags.special(tags.variableName), color: penLightColors.variable },

  { tag: tags.typeName, color: penLightColors.type },
  { tag: tags.className, color: penLightColors.type },
  { tag: tags.namespace, color: penLightColors.type },

  { tag: tags.propertyName, color: penLightColors.property },
  { tag: tags.definition(tags.propertyName), color: penLightColors.property },

  { tag: tags.tagName, color: penLightColors.tag },
  { tag: tags.attributeName, color: penLightColors.attribute },
  { tag: tags.attributeValue, color: penLightColors.string },

  { tag: tags.operator, color: penLightColors.operator },
  { tag: tags.compareOperator, color: penLightColors.operator },
  { tag: tags.arithmeticOperator, color: penLightColors.operator },
  { tag: tags.logicOperator, color: penLightColors.operator },

  { tag: tags.punctuation, color: penLightColors.punctuation },
  { tag: tags.bracket, color: penLightColors.punctuation },
  { tag: tags.paren, color: penLightColors.punctuation },
  { tag: tags.brace, color: penLightColors.punctuation },
  { tag: tags.squareBracket, color: penLightColors.punctuation },

  { tag: tags.meta, color: penLightColors.comment },
  { tag: tags.heading, color: penLightColors.keyword, fontWeight: '600' },
  { tag: tags.link, color: penLightColors.function, textDecoration: 'underline' },
  { tag: tags.url, color: penLightColors.function },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '600' }
])

const penLightEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: penLightColors.background,
    color: penLightColors.foreground
  },
  '.cm-content': {
    caretColor: penLightColors.cursor,
    fontFamily: "'Maple Mono', 'Fira Code', 'JetBrains Mono', monospace",
    fontSize: '14px',
    lineHeight: '1.6'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: penLightColors.cursor,
    borderLeftWidth: '2px'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: penLightColors.selection
  },
  '.cm-activeLine': {
    backgroundColor: penLightColors.activeLine
  },
  '.cm-gutters': {
    backgroundColor: penLightColors.gutterBackground,
    color: penLightColors.gutterForeground,
    borderRight: `1px solid ${penLightColors.gutterBorder}`
  },
  '.cm-activeLineGutter': {
    backgroundColor: penLightColors.gutterBorder
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 12px',
    minWidth: '40px'
  },
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 4px'
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(194, 65, 12, 0.2)',
    outline: '1px solid rgba(194, 65, 12, 0.4)'
  },
  '.cm-nonmatchingBracket': {
    backgroundColor: 'rgba(220, 38, 38, 0.2)'
  },
  '.cm-tooltip': {
    backgroundColor: penLightColors.background,
    border: `1px solid ${penLightColors.gutterBorder}`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    '& > ul': {
      fontFamily: "'Maple Mono', monospace",
      fontSize: '13px'
    }
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: penLightColors.selection
  },
  '.cm-panels': {
    backgroundColor: penLightColors.gutterBackground,
    borderColor: penLightColors.gutterBorder
  },
  '.cm-panel.cm-search': {
    padding: '8px 12px'
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(250, 204, 21, 0.3)',
    outline: '1px solid rgba(250, 204, 21, 0.6)'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(250, 204, 21, 0.5)'
  }
}, { dark: false })

export const penLightTheme = [
  penLightEditorTheme,
  syntaxHighlighting(penLightHighlightStyle)
]

export { penLightColors, penLightHighlightStyle, penLightEditorTheme }
