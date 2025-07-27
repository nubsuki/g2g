import React from "react";
import "./Home.css";
import { FaGithubAlt, FaRobot, FaLinux, FaUsers, FaMicrochip } from "react-icons/fa";
import logo from "../assets/g2glogo.png";

const Home = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="main-title">G2G</h1>
          <p className="tagline">From Gamers to Gamers</p>
          <p className="subtitle">
            Planning to buy a game? Test how well it will perform on your PC
            with our AI-powered tool.
          </p>
          <button className="cta-button">Get Started</button>
        </div>
        <div className="hero-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      <div className="features-container">
        <h2 className="section-title">Why G2G?</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FaRobot />
            </div>
            <h3>
              AI Trained on benchmarks We use massive benchmark datasets to
              predict FPS and performance tailored to your hardware
            </h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaLinux />
            </div>
            <h3>Linux Compatibility via ProtonDB compatibility layers</h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <h3>
              Community Support - Ask questions and share tips with gamers from
              around the world.
            </h3>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <FaMicrochip />
            </div>
            <h3>Comprehensive benchmark database with performance data from multiple sources.</h3>
          </div>
        </div>
      </div>
      <footer className="footer">
        <div className="footer-content">
          <p>&copy;2025 G2G - From Gamers to Gamers</p>
          <a
            href="https://github.com/nubsuki"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <FaGithubAlt className="github-icon" /> Built by nubsuki
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
