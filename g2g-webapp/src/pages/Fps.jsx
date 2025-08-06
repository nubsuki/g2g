import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import "./Fps.css";
import { FaExternalLinkAlt } from "react-icons/fa";

const Fps = () => {
  const { currentUser } = useAuth();
  
  // State for game input and autocomplete
  const [gameName, setGameName] = useState("");
  const [gamesList, setGamesList] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  
  // State for selected game requirements
  const [gameRequirements, setGameRequirements] = useState(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

  // State for FPS prediction
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [userSpecs, setUserSpecs] = useState(null);

  // State for ProtonDB compatibility
  const [protonDBData, setProtonDBData] = useState(null);
  const [loadingProtonDB, setLoadingProtonDB] = useState(false);

  // Ref for click outside detection
  const gameInputRef = useRef(null);

  // Fetch games list and user specs on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch games list from local API
        const response = await fetch(`${import.meta.env.VITE_API_URL}/games`);
        const data = await response.json();
        const games = data.games;
        games.sort();
        setGamesList(games);

        // Fetch user specs if logged in
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.specs) {
              setUserSpecs(userData.specs);
            }
          }
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [currentUser]);

  // Handle game name input change
  const handleGameChange = (value) => {
    setGameName(value);

    setProtonDBData(null);

    if (value.length > 0) {
      const filtered = gamesList
        .filter((game) => game.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10); // Limit to 10 results
      setFilteredGames(filtered);
      setShowGameDropdown(true);
    } else {
      setShowGameDropdown(false);
      // Clear requirements and prediction if input is cleared
      if (value === "") {
        setGameRequirements(null);
        setPrediction(null);
        setProtonDBData(null);
      }
    }
  };

  // Fetch game requirements from local API
  const fetchGameRequirements = async (selectedGameName) => {
    setLoadingRequirements(true);
    try {
      const reqResponse = await fetch(`${import.meta.env.VITE_API_URL}/games/${encodeURIComponent(selectedGameName)}/req`);
      const reqData = await reqResponse.json();
      
      if (reqData.success) {
        // Transform the API response to match the expected format
        const requirements = {
          CPU: reqData.requirements.cpu,
          GPU: reqData.requirements.gpu,
          RAM: reqData.requirements.ram.replace(' GB', ''), 
          OS: reqData.requirements.os,
          File_size: reqData.requirements.storage.replace(' GB', ''),
          Steam_AppID: reqData.requirements.appid
        };
        setGameRequirements(requirements);
      } else {
        console.log("No requirements found for:", selectedGameName);
        setGameRequirements(null);
      }
    } catch (error) {
      console.error("Error fetching game requirements:", error);
      setGameRequirements(null);
    } finally {
      setLoadingRequirements(false);
    }
  };

  // Fetch ProtonDB compatibility data
  const fetchProtonDBCompatibility = async (gameName, requirements = null) => {
    setLoadingProtonDB(true);
    try {
      console.log(`Fetching ProtonDB data for: ${gameName}`);
      
      // Use the passed requirements or fall back to state
      const gameReqs = requirements || gameRequirements;
      const steamAppId = gameReqs?.Steam_AppID || gameReqs?.appid || 'null';
      
      console.log(`Using Steam AppID: ${steamAppId}`);
      console.log('Game requirements data:', gameReqs);
      
      // Use the endpoint with AppID
      const endpoint = `${import.meta.env.VITE_API_URL}/protondb/${encodeURIComponent(gameName)}/${encodeURIComponent(steamAppId)}`;
      
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log('ProtonDB API response:', data);
      
      if (data.success) {
        setProtonDBData(data.data);
      } else {
        console.error('ProtonDB API error:', data.error);
        setProtonDBData({
          tier: 'error',
          message: data.error || 'Failed to fetch compatibility data'
        });
      }
    } catch (error) {
      console.error("Error fetching ProtonDB data:", error);
      setProtonDBData({
        tier: 'error',
        message: 'Unable to connect to ProtonDB service'
      });
    } finally {
      setLoadingProtonDB(false);
    }
  };

  // Handle game selection from dropdown
  const selectGame = async (selectedGame) => {
    setGameName(selectedGame);
    setShowGameDropdown(false);
    setPrediction(null); // Clear previous prediction
    setProtonDBData(null); // Clear previous ProtonDB data
    
    try {
      // Fetch requirements for the selected game
      const reqResponse = await fetch(`${import.meta.env.VITE_API_URL}/games/${encodeURIComponent(selectedGame)}/req`);
      const reqData = await reqResponse.json();
      
      if (reqData.success) {
        // Transform the API response to match the expected format
        const requirements = {
          CPU: reqData.requirements.cpu,
          GPU: reqData.requirements.gpu,
          RAM: reqData.requirements.ram.replace(' GB', ''),
          OS: reqData.requirements.os,
          File_size: reqData.requirements.storage.replace(' GB', ''),
          Steam_AppID: reqData.requirements.appid
        };
        
        // Set the state
        setGameRequirements(requirements);
        
        // Pass the fetched requirements directly to ProtonDB function
        await fetchProtonDBCompatibility(selectedGame, requirements);
      } else {
        console.log("No requirements found for:", selectedGame);
        setGameRequirements(null);
        // Still try ProtonDB without AppID
        await fetchProtonDBCompatibility(selectedGame, null);
      }
    } catch (error) {
      console.error("Error in selectGame:", error);
      setGameRequirements(null);
      await fetchProtonDBCompatibility(selectedGame, null);
    }
  };

  // Handle calculate FPS button click
  const handleCalculateFPS = async () => {
    if (!gameName.trim()) {
      alert("Please enter a game name");
      return;
    }

    if (!currentUser) {
      alert("Please log in to calculate FPS");
      return;
    }

    if (!userSpecs || !userSpecs.cpu || !userSpecs.gpu || !userSpecs.ram || !userSpecs.resolution) {
      alert("Please complete your system specifications in your profile first");
      return;
    }
    
    // If requirements aren't loaded yet, fetch them
    if (!gameRequirements) {
      await fetchGameRequirements(gameName);
    }
    
    setPredicting(true);
    try {
      const requestData = {
        game_name: gameName,
        cpu_name: userSpecs.cpu,
        gpu_name: userSpecs.gpu,
        ram_gb: userSpecs.ram,
        resolution: userSpecs.resolution
      };

      console.log("Sending prediction request:", requestData);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        setPrediction(data.prediction);
        console.log("Prediction received:", data.prediction);
      } else {
        alert(`Prediction failed: ${data.error}`);
      }

    } catch (error) {
      console.error("Error calling prediction API:", error);
      alert("Failed to get FPS prediction. Make sure the API server is running.");
    } finally {
      setPredicting(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (gameInputRef.current && !gameInputRef.current.contains(event.target)) {
        setShowGameDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format file size for display
  const formatFileSize = (sizeInGB) => {
    if (!sizeInGB) return "-";
    return `${sizeInGB} GB`;
  };

  // Format ProtonDB tier for display
  const formatProtonDBTier = (tier) => {
    if (!tier) return { label: "-", className: "" };
    
    const tierLabels = {
      platinum: "Platinum",
      gold: "Gold", 
      silver: "Silver",
      bronze: "Bronze",
      borked: "Borked",
      native: "Native",
      unknown: "Unknown",
      error: "Error"
    };

    return {
      label: tierLabels[tier.toLowerCase()] || tier,
      className: `protondb-tier-${tier.toLowerCase()}`
    };
  };

  return (
    <div className="fps-page">
      <div className="fps-container">
        <div className="fps-header">
          <h1>Calculate FPS</h1>
          <p>Enter a game name to predict your FPS performance</p>
          {!currentUser && (
            <div className="login-prompt">
              <p>⚠️ Please log in and complete your system specs in your profile to use FPS prediction</p>
            </div>
          )}
          {currentUser && !userSpecs && (
            <div className="specs-prompt">
              <p>⚠️ Please complete your system specifications in your profile first</p>
            </div>
          )}
        </div>
        
        <div className="fps-content">
          {/* Input Section */}
          <div className="input-section">
            <div className="game-input-container" ref={gameInputRef}>
              <input 
                type="text" 
                placeholder="Start typing game name" 
                className="game-input"
                value={gameName}
                onChange={(e) => handleGameChange(e.target.value)}
              />
              {showGameDropdown && filteredGames.length > 0 && (
                <div className="game-dropdown">
                  {filteredGames.map((game, index) => (
                    <div
                      key={index}
                      className="dropdown-item"
                      onClick={() => selectGame(game)}
                    >
                      {game}
                    </div>
                  ))}
                </div>
              )}
              <button 
                className="calculate-btn" 
                onClick={handleCalculateFPS}
                disabled={predicting || !currentUser || !userSpecs}
              >
                {predicting ? (
                  <>
                    <div className="spinner"></div>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <span>Calculate FPS</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.3 17.275q-.3.3-.725.3t-.725-.3L8.7 14.125q-.3-.3-.3-.713t.3-.712q.3-.3.725-.3t.725.3L12 14.55l5.85-5.85q.3-.3.725-.3t.725.3q.3.3.3.713t-.3.712L13.3 17.275Z"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="results-grid">
            {/* Game Information Card */}
            <div className="info-card game-info-card">
              <div className="card-header">
                <h3>Game Information</h3>
                {loadingRequirements && (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <div className="card-content">
                <div className="info-item">
                  <span className="label">Game Name:</span>
                  <span className="value">{gameName || "-"}</span>
                </div>
                <div className="info-section">
                  <h4>System Requirements</h4>
                  <div className="requirements-grid">
                    <div className="req-item">
                      <span className="req-label">CPU:</span>
                      <span className="req-value">
                        {gameRequirements?.CPU || "-"}
                      </span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">GPU:</span>
                      <span className="req-value">
                        {gameRequirements?.GPU || "-"}
                      </span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">RAM:</span>
                      <span className="req-value">
                        {gameRequirements?.RAM ? `${gameRequirements.RAM} GB` : "-"}
                      </span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">OS:</span>
                      <span className="req-value">
                        {gameRequirements?.OS || "-"}
                      </span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">Storage:</span>
                      <span className="req-value">
                        {formatFileSize(gameRequirements?.File_size)}
                      </span>
                    </div>
                    {/* Update the ProtonDB display section */}
                    <div className="req-item">
                      <span className="req-label">ProtonDB Compatibility:</span>
                      <span className="req-value">
                        {loadingProtonDB ? (
                          <div className="protondb-loading">
                            <div className="spinner"></div>
                            <span>Loading...</span>
                          </div>
                        ) : protonDBData ? (
                          <div className="protondb-info">
                            <div className="protondb-main">
                              <span className={`protondb-tier-badge ${formatProtonDBTier(protonDBData.tier).className}`}>
                                {formatProtonDBTier(protonDBData.tier).label}
                              </span>
                              {protonDBData.total && (
                                <span className="protondb-reports-count">
                                  {protonDBData.total} reports
                                </span>
                              )}
                              {/* Add ProtonDB link icon */}
                              {protonDBData.appId && protonDBData.appId !== 'null' && (
                                <a 
                                  href={`https://www.protondb.com/app/${protonDBData.appId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="protondb-link"
                                  title="View on ProtonDB"
                                >
                                  <FaExternalLinkAlt />
                                </a>
                              )}
                            </div>
                            
                            {protonDBData.breakdown && (
                              <div className="protondb-breakdown">
                                <span className="breakdown-label">Top ratings:</span>
                                <div className="breakdown-values">
                                  {Object.entries(protonDBData.breakdown)
                                    .sort((a, b) => b[1].count - a[1].count)
                                    .slice(0, 2)
                                    .map(([rating, data], index) => (
                                      <span key={rating} className="breakdown-item">
                                        <span className="rating-name">{rating.charAt(0).toUpperCase() + rating.slice(1)}</span>
                                        <span className="rating-percentage">{data.percentage}%</span>
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                            
                            {protonDBData.message && (
                              <div className="protondb-message">
                                {protonDBData.message}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Your System Specs */}
                {userSpecs && (
                  <div className="info-section">
                    <h4>Your System</h4>
                    <div className="requirements-grid">
                      <div className="req-item">
                        <span className="req-label">CPU:</span>
                        <span className="req-value">{userSpecs.cpu}</span>
                      </div>
                      <div className="req-item">
                        <span className="req-label">GPU:</span>
                        <span className="req-value">{userSpecs.gpu}</span>
                      </div>
                      <div className="req-item">
                        <span className="req-label">RAM:</span>
                        <span className="req-value">{userSpecs.ram}</span>
                      </div>
                      <div className="req-item">
                        <span className="req-label">Resolution:</span>
                        <span className="req-value">{userSpecs.resolution}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FPS Prediction Card */}
            <div className="info-card fps-prediction-card">
              <div className="card-header">
                <h3>FPS Prediction</h3>
              </div>
              <div className="card-content">
                <div className="fps-display">
                  <div className="fps-number">
                    <span className="fps-value">
                      {prediction ? prediction.fps : "--"}
                    </span>
                    <span className="fps-unit">FPS</span>
                  </div>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill"
                      style={{ width: prediction ? `${prediction.confidence}%` : '0%' }}
                    ></div>
                  </div>
                  <span className="confidence-text">
                    Model Confidence: {prediction ? `${prediction.confidence}%` : '--%'}
                  </span>
                </div>
                
                <div className="performance-details">
                  <div className="detail-item">
                    <span className="detail-label">Performance Mode:</span>
                    <span className="detail-value">
                      {prediction ? prediction.performance_rating : "-"}
                    </span>
                  </div>
                  
                  {/* Combined CPU and GPU Score row */}
                  <div className="detail-item dual-score">
                    <div className="score-pair">
                      <span className="score-item">
                        <span className="detail-label">CPU Score:</span>
                        <span className="detail-value">
                          {prediction ? Math.round(prediction.cpu_score) : "-"}
                        </span>
                      </span>
                      <span className="score-item">
                        <span className="detail-label">GPU Score:</span>
                        <span className="detail-value">
                          {prediction ? Math.round(prediction.gpu_score) : "-"}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  {prediction && (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Matched CPU:</span>
                        <span className="detail-value">{prediction.matched_cpu}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Matched GPU:</span>
                        <span className="detail-value">
                          {prediction.matched_gpu} ({prediction.vram_gb}GB VRAM)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fps;

