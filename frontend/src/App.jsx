import React from 'react';
import BankingDashboard from './components/BankingDashboard';
import './App.css';
import UploadCSV from "./components/uploadCSV";

function App() {
  return (
    <div className="App">
      <BankingDashboard />
      <UploadCSV />
    </div>
  );
}

export default App;