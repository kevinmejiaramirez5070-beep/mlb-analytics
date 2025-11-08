import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import BackgroundManager from './components/BackgroundManager';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import Summary from './pages/Summary';
import './components/BasicUI.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <BackgroundManager />
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/summary" element={<Summary />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

