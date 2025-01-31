import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainPage from './components/MainPage';
import QrCodeGenerator from './components/QrcodeGenerator';
import QrCodeScanner from './components/QrCodeScanner';
import RegisterMember from './components/RegisterMember';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/qr-code-generator" element={<QrCodeGenerator />} />
          <Route path="/qr-code-scanner" element={<QrCodeScanner />} />
          <Route path="/register-member" element={<RegisterMember />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;