import * as sass from 'sass';
import fs from 'fs';

const scss = fs.readFileSync('/Users/tjs/Documents/.coding/pen2/test-pen/style.scss', 'utf-8');

try {
  console.log('Compiling SCSS...');
  const result = sass.compileString(scss, {
    style: 'expanded'
  });
  console.log('Success!');
  console.log(result.css.substring(0, 100) + '...');
} catch (err) {
  console.error('Error caught:');
  console.error(err);
}
