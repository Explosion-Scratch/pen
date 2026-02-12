import { render } from "solid-js/web";
import { createSignal } from "solid-js";

/**
 * Solid.js Starter
 */
function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="container">
      <div class="logo-wrapper">
        <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
          <path fill="#335eea" d="M128 29.683S85.333-1.713 52.327 5.532l-2.415.805c-4.83 1.61-8.855 4.025-11.27 7.245l-1.61 2.415l-12.076 20.931l20.93 4.025c8.856 5.636 20.127 8.05 30.592 5.636l37.031 7.245z"/>
          <path fill="#4b7df3" d="m38.642 29.683l-3.22.805C21.735 34.513 17.71 47.394 24.955 58.664c8.05 10.465 24.956 16.1 38.641 12.076l49.912-16.906S70.843 22.438 38.642 29.683"/>
          <path fill="#2546a1" d="M104.654 65.91a36.23 36.23 0 0 0-38.641-12.076L16.1 69.934L0 98.111l90.164 15.295l16.1-28.981c3.22-5.635 2.415-12.075-1.61-18.516z"/>
          <path fill="#1a3273" d="M88.553 94.085A36.23 36.23 0 0 0 49.912 82.01L0 98.11s42.667 32.202 75.673 24.152l2.415-.806c13.686-4.025 18.516-16.905 10.465-27.37z"/>
        </svg>
        <h1>Solid Starter</h1>
      </div>
      
      <p>A simple foundation for reactive applications.</p>

      <div class="action-bar">
        <button type="button" onClick={() => setCount(c => c + 1)}>
          Count: {count()}
        </button>
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("app"));
