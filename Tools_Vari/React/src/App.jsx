import FlowDiagram from './FlowDiagram'; // Import our diagram component
// import './App.css'; // We might not need default App.css anymore

function App() {
  return (
    // Ensure this div takes full viewport height and width
    <div style={{ width: '100vw', height: '100vh' }}>
      <FlowDiagram />
    </div>
  );
}

export default App;
