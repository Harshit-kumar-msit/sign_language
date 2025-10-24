import React from 'react'
import { useRef, useEffect } from 'react';
import './LandingPage.css';
const LandingPage = () => {
      const landingPageRef = useRef(null);
  const ballRef1 = useRef(null);
  const ballRef2 = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (landingPageRef.current && ballRef1.current && ballRef2.current) {
        const { width, height } = landingPageRef.current.getBoundingClientRect();
        const x = e.clientX / width - 0.5;
        const y = e.clientY / height - 0.5;
        
        ballRef1.current.style.transform = `translate(${-x * 500}px, ${-y * 500}px)`;
        ballRef2.current.style.transform = `translate(${-x * 700}px, ${-y * 700}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  return (
    <div ref={landingPageRef} className='landingPage'>
        <div className="content">
            <h1 className='word'>Welcome to SignAI</h1>
            <p className='word'>Your AI-powered sign language translator</p>
            <button className='word'>Try it</button>
        </div>
      <div className="ball1" ref={ballRef1}></div>
      <div className="ball2" ref={ballRef2}></div>
    </div>
  )
}

export default LandingPage
