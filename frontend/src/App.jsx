import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import About from "./pages/About.jsx";
import Instructions from "./pages/Instructions.jsx";
import Compare from "./pages/Compare.jsx";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-linear-to-r from-blue-200 to-blue-100">
        <Navbar />
        <main className="flex-1 ">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/instructions" element={<Instructions />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;