import React from "react";
import VideoInterview from "./components/VideoInterview"; // Import your VideoInterview component

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 >Video Interview Analysis</h1>
      </header>
      <VideoInterview /> {/* Render the VideoInterview component */}
    </div>
  );
}

export default App;
