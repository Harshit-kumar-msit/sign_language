import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Compare", path: "/compare" },
  { name: "Instructions", path: "/instructions" },
  { name: "About", path: "/about" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] md:w-auto transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-md"
          : "bg-white/60 backdrop-blur-md border border-gray-200/60"
      } rounded-full px-5 py-3`}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-lg md:text-xl font-bold text-gray-800"
        >
          SignAI
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
              end
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-gray-100"
          onClick={() => setIsOpen((s) => !s)}
        >
          {isOpen ? <X className="w-6 h-6 text-gray-800" /> : <Menu className="w-6 h-6 text-gray-800" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-full bg-white/90 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg md:hidden transition-all duration-300">
          <nav className="flex flex-col p-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
                end
              >
                {link.name}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
