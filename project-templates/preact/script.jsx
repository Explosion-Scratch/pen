import { h, render, Fragment } from 'preact';
import { useState } from 'preact/hooks';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Preact App</h1>
      <p>A lightweight React alternative.</p>
      <div className="counter-display">{count}</div>
      <button className="accent-btn" onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

render(<App />, document.getElementById('app'));
