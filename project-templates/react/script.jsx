const App = () => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    document.title = `You clicked ${count} times`;
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>React + Pen</h1>
        <p>A lightweight React starter using JSX</p>
      </header>
      
      <main className="counter-card">
        <h2>Interactive Counter</h2>
        <div className="display">{count}</div>
        <div className="controls">
          <button onClick={() => setCount(count - 1)}>Decrease</button>
          <button className="primary" onClick={() => setCount(count + 1)}>Increase</button>
        </div>
      </main>

      <footer className="info">
        <p>Edit <code>script.jsx</code> to see changes live!</p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
