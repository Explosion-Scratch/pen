import { TypeScriptAdapter } from './adapters/script/typescript_adapter.js';

const code = 'const x: number = 42; console.log(x);';
const adapter = new TypeScriptAdapter();
adapter.setSettings({ target: 'ES2022', strict: true });

try {
  console.log('Compiling TypeScript...');
  const result = await adapter.render(code, {});
  console.log('Success!');
  console.log(result.js);
} catch (err) {
  console.error('Error caught:');
  console.error(err);
}
