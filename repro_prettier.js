import { BaseAdapter } from './adapters/base_adapter.js';

class TestAdapter extends BaseAdapter {}

const code = 'function   test() { console.log("hello") }';
const adapter = new TestAdapter();

try {
  console.log('Formatting code...');
  const formatted = await adapter.beautify(code, 'babel');
  console.log('Success!');
  console.log(formatted);
} catch (err) {
  console.error('Error caught:');
  console.error(err);
}
