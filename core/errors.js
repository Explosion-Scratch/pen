export class CompileError extends Error {
  constructor(message, { adapterId, filename, title, line, column, originalError } = {}) {
    super(message)
    this.name = 'CompileError'
    this.adapterId = adapterId
    this.filename = filename
    this.title = title || 'Compilation Error'
    this.line = line
    this.column = column
    this.originalError = originalError
  }

  toJSON() {
    return {
      message: this.message,
      name: this.name,
      adapterId: this.adapterId,
      filename: this.filename,
      title: this.title,
      line: this.line,
      column: this.column
    }
  }
}
