import { SourceMapGenerator, SourceMapConsumer } from 'source-map-js';

/**
 * Utility to incrementally build a file with a corresponding source map.
 * Supports adding code chunks with identity mapping or re-mapping existing source maps.
 */
export class SourceMapBuilder {
  /**
   * @param {string} outputFilename The name of the generated file
   */
  constructor(outputFilename) {
    this.outputFilename = outputFilename;
    this.generator = new SourceMapGenerator({ file: outputFilename });
    this.code = '';
    this.currentLine = 1; // 1-based
    this.currentColumn = 0;
  }

  /**
   * Adds a chunk of code.
   * If filename is provided, generates identity mappings (line-by-line) pointing to that file.
   * If sourceContent is provided, it is embedded in the source map.
   * 
   * @param {string} content Code content to add
   * @param {string} [filename] Original filename (if mapping is desired)
   * @param {string} [sourceContent] Original source content (for embedding)
   */
  add(content, filename, sourceContent) {
    if (filename && sourceContent) {
      this.generator.setSourceContent(filename, sourceContent);
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (filename) {
        // Generate identity mapping for this line
        // Mapping generated line -> original line (1-based index from content)
        this.generator.addMapping({
          generated: { line: this.currentLine + i, column: 0 },
          original: { line: i + 1, column: 0 },
          source: filename
        });
      }
      // If no filename, we add code but no mapping (it's generated glue code)
    }

    this._appendCode(content);
  }

  /**
   * Adds a chunk of code that is "generated" (no source mapping).
   * @param {string} content 
   */
  addRaw(content) {
    this._appendCode(content);
  }

  /**
   * Adds code that already has a source map, re-mapping it to the new position.
   * 
   * @param {string} content The transpiled code
   * @param {Object|string} inputMap The existing source map (JSON object or string)
   * @param {string} forceFilename Optional: override the source filename in the map
   * @param {string} [sourceContent] Optional: original source content to ensure it's embedded
   */
  addWithMap(content, inputMap, forceFilename, sourceContent) {
    if (!inputMap) {
      this.add(content, forceFilename, sourceContent);
      return;
    }

    // Ensure we have a valid consumer
    const rawMap = typeof inputMap === 'string' ? JSON.parse(inputMap) : inputMap;
    const consumer = new SourceMapConsumer(rawMap);
    
    // Set source content if provided and we're forcing a filename
    if (forceFilename && sourceContent) {
       this.generator.setSourceContent(forceFilename, sourceContent);
    } else if (forceFilename && rawMap.sourcesContent && rawMap.sourcesContent.length > 0) {
       // If we are forcing filename, we should move the content over if it exists in the old map
       // We assume 1 source for simplicity in this context, or we iterate sources
       this.generator.setSourceContent(forceFilename, rawMap.sourcesContent[0]);
    }


    // Iterate over all mappings in the input map
    consumer.eachMapping((mapping) => {
      // Re-map to the new location
      // mapping.generatedLine is 1-based relative to the *chunk* we are adding.
      // We need to offset it by (this.currentLine - 1).
      
      const newGeneratedLine = mapping.generatedLine + (this.currentLine - 1);
      
      // If mapping.source exists, we map it. If forceFilename is set, we use that.
      const source = forceFilename || mapping.source;

      if (source && mapping.originalLine != null) {
        this.generator.addMapping({
          generated: { line: newGeneratedLine, column: mapping.generatedColumn },
          original: { line: mapping.originalLine, column: mapping.originalColumn },
          source: source,
          name: mapping.name
        });
      }
    });

    this._appendCode(content);
  }

  _appendCode(content) {
    this.code += content;
    // Update currentLine count based on newlines in content
    // Use split to count lines accurately
    const lines = content.split('\n');
    // If content ends with newline, split gives empty string at end, so length is lines + 1 
    // e.g. "a\n" -> ["a", ""]. Length 2. We added 1 line.
    // e.g. "a" -> ["a"]. Length 1. We added 0 new lines (stay on same line? No, typically we write blocks)
    // Actually, usually we append blocks that might not end in newline, but subsequent add starts there.
    // For simplicity, let's assume we care about line counts.
    this.currentLine += (lines.length - 1);
    
    // Determine column of last line for more precise mapping if we ever need to support mid-line concatenation
    const lastLine = lines[lines.length - 1];
    this.currentColumn = lastLine.length; 
  }

  toString() {
    return this.code;
  }

  toDataURL() {
    const json = this.generator.toString();
    const base64 = typeof btoa === 'function' 
        ? btoa(unescape(encodeURIComponent(json))) 
        : Buffer.from(json).toString('base64');
    return `data:application/json;charset=utf-8;base64,${base64}`;
  }
  
  getInlineUrl() {
     return this.toDataURL();
  }
}
