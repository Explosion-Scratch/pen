import { parseHTML } from 'linkedom';

const { document } = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>');

document.body.innerHTML = '<div class="foo">Hello</div>';

const script = document.createElement('script');
script.id = 'test-script';
script.innerHTML = 'console.log("world")';
document.body.appendChild(script);

console.log(document.documentElement.outerHTML);
