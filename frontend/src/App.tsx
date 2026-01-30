import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PersonalHealth from './pages/PersonalHealth';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/personal" element={<PersonalHealth />} />
    </Routes>
  );
};

export default App;