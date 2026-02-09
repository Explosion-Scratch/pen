import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language'
import { closeBrackets, autocompletion } from '@codemirror/autocomplete'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'

export const penExtensions = [
  lineNumbers(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  bracketMatching(),
  foldGutter(),
  indentOnInput(),
  closeBrackets(),
  autocompletion(),
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap])
]

export function createBasicExtensions(options = {}) {
  const extensions = []

  if (options.lineNumbers !== false) {
    extensions.push(lineNumbers())
  }

  if (options.highlightActiveLine !== false) {
    extensions.push(highlightActiveLine())
    extensions.push(highlightActiveLineGutter())
  }

  if (options.bracketMatching !== false) {
    extensions.push(bracketMatching())
  }

  if (options.foldGutter !== false) {
    extensions.push(foldGutter())
  }

  if (options.closeBrackets !== false) {
    extensions.push(closeBrackets())
  }

  if (options.autocompletion !== false) {
    extensions.push(autocompletion())
  }

  if (options.indentOnInput !== false) {
    extensions.push(indentOnInput())
  }

  if (options.history !== false) {
    extensions.push(history())
    extensions.push(keymap.of(historyKeymap))
  }

  extensions.push(keymap.of(defaultKeymap))

  return extensions
}
