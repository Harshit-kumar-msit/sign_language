import React, { useState, useEffect } from 'react';
import { Link } from 'react-scroll';
import './Navbar.css';

const Navbar = () => {
  const [navmod, setNavmod] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
 
  useEffect(() => {
    const handleBack = () => {
      if (window.scrollY >= 112) {
        setNavmod(true);
      } else {
        setNavmod(false);
      }
    };
   
    window.addEventListener('scroll', handleBack);
    return () => window.removeEventListener('scroll', handleBack);
  }, []);
 
  const handleClick = () => {
    setIsNavOpen(!isNavOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isNavOpen && !event.target.closest('.navbar-container')) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNavOpen]);
 
  return (
    <>
      <div className={`navbar-container ${navmod ? 'bg-gray-700' : 'bg-white'}`}>
        <div className="navbar-content">
          <h3 className="navbar-logo">
            Sign<span style={{ color: '#b2f583ff' }}>Bridge</span>
          </h3>
          
          {/* Desktop Navigation */}
          <nav className="navbar-desktop">
            <ul type='none'>
              <li>
                <Link
                  activeClass="active"
                  to="home"
                  spy={true}
                  smooth={true}
                  offset={50}
                  duration={500}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  activeClass="active"
                  to="about"
                  spy={true}
                  smooth={true}
                  offset={50}
                  duration={500}
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  activeClass="active"
                  to="exp"
                  spy={true}
                  smooth={true}
                  offset={50}
                  duration={500}
                >
                  Experience
                </Link>
              </li>
              <li>
                <Link
                  activeClass="active"
                  to="contact"
                  spy={true}
                  smooth={true}
                  offset={50}
                  duration={500}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
          

          <button 
            className="hamburger-button" 
            onClick={handleClick}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line top ${isNavOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line middle ${isNavOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line bottom ${isNavOpen ? 'open' : ''}`}></span>
          </button>
        </div>
        
        {/* Mobile Navigation Menu */}
        <div className={`mobile-nav ${isNavOpen ? 'open' : 'closed'}`}>
          <ul>
            <li>
              <Link
                activeClass="active"
                to="home"
                spy={true}
                smooth={true}
                offset={50}
                duration={500}
                onClick={() => setIsNavOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                activeClass="active"
                to="about"
                spy={true}
                smooth={true}
                offset={50}
                duration={500}
                onClick={() => setIsNavOpen(false)}
              >
                About me
              </Link>
            </li>
            <li>
              <Link
                activeClass="active"
                to="contact"
                spy={true}
                smooth={true}
                offset={50}
                duration={500}
                onClick={() => setIsNavOpen(false)}
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navbar;
