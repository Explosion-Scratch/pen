import chalk from "chalk";
import stripAnsi from "strip-ansi";

/**
 * Creates a chalk-styled box around multiline text, retaining internal
 * chalk formatting while aligning text correctly.
 * 
 * @param {string} text - Multiline string, optionally with chalk formatting
 * @param {number} [padding=1] - Horizontal padding spaces inside the box
 * @returns {string} The formatted boxed string
 */
export function createBox(text, padding = 1) {
  const rawLines = text.split("\n");
  
  // Calculate max visible length (ignoring ANSI escape codes)
  let maxLength = 0;

  const linesInfo = rawLines.map(line => {
    const visibleLength = stripAnsi(line).length;
    if (visibleLength > maxLength) {
      maxLength = visibleLength;
    }
    return { raw: line, visibleLength };
  });

  const width = maxLength + (padding * 2);
  const horizontalLine = "─".repeat(width);

  let output = chalk.dim(`╭${horizontalLine}╮\n`);

  for (const { raw, visibleLength } of linesInfo) {
    const padStr = " ".repeat(padding);
    // Pad the right side so the right border lines up
    const gap = " ".repeat(maxLength - visibleLength);
    output += chalk.dim("│") + padStr + raw + gap + padStr + chalk.dim("│\n");
  }

  output += chalk.dim(`╰${horizontalLine}╯`);

  return output;
}
