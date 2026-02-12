import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function Counter() {
  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);

  return (
    <div class="container">
      <h1>Solid.js + Pen</h1>
      <p>A declarative, efficient, and flexible JavaScript library for building user interfaces.</p>
      <button type="button" onClick={increment}>
        Count: {count}
      </button>
    </div>
  );
}

render(() => <Counter />, document.getElementById("app"));
