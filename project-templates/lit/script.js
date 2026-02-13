import { LitElement, html, css } from 'lit';

export class MyElement extends LitElement {
  static properties = {
    name: { type: String },
    count: { type: Number },
  };

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--accent-color, #325cff);
    }
    button {
      background: var(--accent-color, #325cff);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
  `;

  constructor() {
    super();
    this.name = 'World';
    this.count = 0;
  }

  render() {
    return html`
      <h1>Hello, ${this.name}!</h1>
      <p>Count: ${this.count}</p>
      <button @click=${this._onClick}>Increment</button>
    `;
  }

  _onClick() {
    this.count++;
  }
}

customElements.define('my-element', MyElement);
