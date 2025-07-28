import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Home.css";
import { FaGithubAlt, FaRobot, FaLinux, FaUsers, FaMicrochip, FaArrowRight, FaStar, FaGamepad } from "react-icons/fa";
import geekbenchLogo from "../assets/geekbench.png";
import techpowerupLogo from "../assets/techpowerup.png";

const Home = ({ onLoginClick }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (currentUser) {
      navigate('/fps');
    } else {
      onLoginClick();
    }
  };

  const features = [
    {
      icon: <FaRobot />,
      title: "AI-Powered Predictions",
      description: "Our advanced AI analyzes massive benchmark datasets to predict FPS and performance tailored specifically to your hardware configuration.",
      highlight: "99% Accuracy"
    },
    {
      icon: <FaMicrochip />,
      title: "Comprehensive Database",
      description: "Access performance data from multiple trusted sources with real-world benchmarks from thousands of gaming configurations.",
      highlight: "10K+ Benchmarks",
      logos: [geekbenchLogo, techpowerupLogo]
    },
    {
      icon: <FaLinux />,
      title: "Cross-Platform Support",
      description: "Full compatibility with Windows and Linux gaming through ProtonDB integration, ensuring accurate predictions across platforms.",
      highlight: "Multi-Platform"
    },
    {
      icon: <FaUsers />,
      title: "Gaming Community",
      description: "Connect with gamers worldwide, share performance tips, contribute benchmarks, and help improve our prediction model.",
      highlight: "Active Community"
    }
  ];

  const stats = [
    { number: "50K+", label: "Games Analyzed" },
    { number: "1M+", label: "Predictions Made" },
    { number: "99%", label: "Accuracy Rate" },
    { number: "24/7", label: "Available" }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-background">
          <div className="hero-shape hero-shape-1"></div>
          <div className="hero-shape hero-shape-2"></div>
          <div className="hero-shape hero-shape-3"></div>
          <div className="hero-gradient"></div>
        </div>
        
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <FaGamepad />
              <span>From Gamers to Gamers</span>
            </div>
            
            <h1 className="hero-title">
              <span className="title-main">G2G</span>
              <span className="title-subtitle">Gaming Performance Predictor</span>
            </h1>
            
            <p className="hero-description">
              Planning to buy a new game? Test how well it will perform on your PC with our 
              <strong> AI-powered prediction tool</strong>. Get accurate FPS predictions before you purchase.
            </p>
            
            <div className="hero-actions">
              <button className="cta-primary" onClick={handleGetStarted}>
                <span>Get Started</span>
                <FaArrowRight />
              </button>
              <button className="cta-secondary" onClick={() => navigate('/fps')}>
                <FaGamepad />
                <span>Try Demo</span>
              </button>
            </div>
            
            {/* Stats Preview */}
            <div className="hero-stats">
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-container">
          <div className="section-header">
            <div className="section-badge">
              <FaStar />
              <span>Why Choose G2G?</span>
            </div>
            <h2 className="section-title">
              Powerful Features for<br />
              <span className="title-highlight">Smarter Gaming Decisions</span>
            </h2>
            <p className="section-description">
              Everything you need to make informed gaming purchases and optimize your PC performance.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-card-inner">
                  <div className="feature-header">
                    <div className="feature-icon">
                      {feature.icon}
                    </div>
                    <div className="feature-highlight">
                      {feature.highlight}
                    </div>
                  </div>
                  
                  <div className="feature-content">
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                    
                    {feature.logos && (
                      <div className="feature-logos">
                        {feature.logos.map((logo, logoIndex) => (
                          <div key={logoIndex} className="logo-container">
                            <img src={logo} alt={`Source ${logoIndex + 1}`} className="source-logo" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="feature-glow"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <div className="cta-icon">
              <FaGamepad />
            </div>
            <h2 className="cta-title">Ready to Optimize Your Gaming?</h2>
            <p className="cta-description">
              Join thousands of gamers who trust G2G for accurate performance predictions. 
              Start making smarter gaming decisions today.
            </p>
            <div className="cta-actions">
              <button className="cta-main-btn" onClick={handleGetStarted}>
                <span>Start Predicting FPS</span>
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>G2G</h3>
              <p>From Gamers to Gamers</p>
            </div>
            
            <div className="footer-links">
              <div className="footer-section">
                <h4>Product</h4>
                <a href="/fps">FPS Predictor</a>
                <a href="/profile">Profile</a>
              </div>
              
              <div className="footer-section">
                <h4>Community</h4>
                <a href="#">Benchmarkers</a>
                <a href="#">Contributors</a>
              </div>
            </div>
            
            <div className="footer-social">
              <a
                href="https://github.com/nubsuki"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <FaGithubAlt />
                <span>Built by nubsuki</span>
              </a>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 G2G - From Gamers to Gamers. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
