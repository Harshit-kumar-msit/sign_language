import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import LandingPage from './pages/LandingPage.jsx'
import About from './pages/About.jsx'
function App() {

  return (
    <div style={{background:'linear-gradient(to right, #78a1f7ff, #b2def9ff)', height:'100vh'}}>
      <Navbar />
      <LandingPage />
      <About />
      <Footer />
    </div>
  )
}

export default App
