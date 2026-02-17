import { LitElement, html, css } from 'lit';

export class MyElement extends LitElement {
  static properties = {
    name: { type: String },
    count: { type: Number },
  };

  static styles = css`
    :host {
      display: block;
      color: #000;
    }
    
    .card {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-box {
      background: var(--yellow-color, #ffcc00);
      border: 4px solid #000;
      padding: 10px;
      margin-bottom: 10px;
      transform: rotate(1deg);
    }

    h1 {
      margin: 0;
      font-size: 2.8rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.04em;
      line-height: 0.9;
      -webkit-text-stroke: 1.5px #000;
      color: #fff;
      text-shadow: 4px 4px 0px #000;
    }

    .status-area {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
    }

    .badge {
      background: #fff;
      border: 4px solid #000;
      padding: 8px 16px;
      font-weight: 900;
      font-size: 1.2rem;
      transform: rotate(-2deg);
      box-shadow: 4px 4px 0px #000;
    }

    .count-display {
      font-size: 3rem;
      font-weight: 900;
      color: var(--secondary-color, #ff4d4d);
      text-shadow: 3px 3px 0px #000;
      font-style: italic;
    }

    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    button {
      background: var(--accent-color, #008f39);
      color: white;
      border: 4px solid #000;
      padding: 16px 32px;
      font-size: 1.4rem;
      font-weight: 900;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 8px 8px 0px 0px #000;
      transition: all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    button:hover {
      transform: translate(-4px, -4px);
      box-shadow: 12px 12px 0px 0px #000;
      background: #00a843;
    }

    button:active {
      transform: translate(4px, 4px);
      box-shadow: 0px 0px 0px 0px #000;
    }

    .reset-btn {
      background: var(--secondary-color, #ff4d4d);
      font-size: 1rem;
      padding: 10px;
      box-shadow: 4px 4px 0px #000;
    }

    .reset-btn:hover {
      background: #ff6666;
      box-shadow: 6px 6px 0px #000;
    }
  `;

  constructor() {
    super();
    this.name = 'lit-html';
    this.count = 0;
  }

  render() {
    return html`
      <div class="card">
        <div class="header-box">
          <h1>${this.name}</h1>
        </div>
        
        <div class="status-area">
          <div class="badge">SCORE</div>
          <div class="count-display">${this.count}</div>
        </div>

        <div class="btn-group">
          <button @click=${this._onClick}>Increment</button>
          <button class="reset-btn" @click=${() => this.count = 0}>Reset</button>
        </div>
      </div>
    `;
  }

  _onClick() {
    this.count++;
  }
}

customElements.define('my-element', MyElement);
