import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Home.css";
import { FaGithubAlt, FaRobot, FaLinux, FaUsers, FaMicrochip, FaArrowRight, FaStar, FaGamepad } from "react-icons/fa";
import geekbenchLogo from "../assets/geekbench.png";
import techpowerupLogo from "../assets/techpowerup.png";

const Home = ({ onLoginClick }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State for database stats
  const [modelAccuracy, setModelAccuracy] = useState(0);
  const [uniqueGames, setUniqueGames] = useState(0);
  const [totalBenchmarks, setTotalBenchmarks] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch model stats on component mount
  useEffect(() => {
    const fetchModelStats = async () => {
      try {
        setLoadingStats(true);
        
        // Fetch from API instead of Firebase
        const response = await fetch(`${import.meta.env.VITE_API_URL}/model-stats`);
        const result = await response.json();
        
        if (result.success) {
          const data = result.data;
          
          setModelAccuracy(data.model_accuracy_percentage || 0);
          setUniqueGames(data.unique_games || 0);
          setTotalBenchmarks(data.total_benchmarks || 0);

          console.log("Model stats loaded from API:", data);
        } else {
          console.log("No model stats found in API");
          // Set default values if no stats found
          setModelAccuracy(87.32);
          setUniqueGames(25);
          setTotalBenchmarks(3757);
        }

      } catch (error) {
        console.error("Error fetching model stats from API:", error);
        // Set fallback values on error
        setModelAccuracy(87.32);
        setUniqueGames(25);
        setTotalBenchmarks(3757);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchModelStats();
  }, []);

  const handleGetStarted = () => {
    if (currentUser) {
      navigate('/fps');
    } else {
      onLoginClick();
    }
  };

  // Format numbers with commas for better readability
  const formatNumber = (num) => {
    if (!num && num !== 0) return "...";
    return num.toLocaleString();
  };

  const features = [
    {
      icon: <FaRobot />,
      title: "AI-Powered Predictions",
      description: "Our advanced AI analyzes massive benchmark datasets to predict FPS and performance tailored specifically to your hardware configuration.",
      highlight: "Accuracy"
    },
    {
      icon: <FaMicrochip />,
      title: "Comprehensive Database",
      description: "Access performance data from multiple trusted sources with real-world benchmarks from thousands of gaming configurations.",
      highlight: "Benchmarks",
      logos: [geekbenchLogo, techpowerupLogo]
    },
    {
      icon: <FaLinux />,
      title: "Cross-Platform Support",
      description: "Full compatibility ranking with Linux gaming through ProtonDB integration.",
      highlight: "Multi-Platform"
    },
    {
      icon: <FaUsers />,
      title: "Gaming Community",
      description: "Connect with gamers worldwide, share performance tips, contribute benchmarks, and help improve our prediction model.",
      highlight: "Community"
    }
  ];

  // Dynamic stats using real data from Firebase
  const stats = [
    { 
      number: loadingStats ? "..." : `${formatNumber(uniqueGames)}`, 
      label: "Games Available" 
    },
    { 
      number: loadingStats ? "..." : `${formatNumber(totalBenchmarks)}`, 
      label: "Total Benchmarks" 
    },
    { 
      number: loadingStats ? "..." : `${modelAccuracy}%`, 
      label: "Model Accuracy" 
    },
    { 
      number: "24/7", 
      label: "Available" 
    }
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
            </div>
            
            {/* Stats Preview - Now showing real data */}
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

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>G2G</h3>
              <p>From Gamers to Gamers</p>
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
