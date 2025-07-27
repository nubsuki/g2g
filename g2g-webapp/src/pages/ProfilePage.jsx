import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../Components/Loading";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState("profile");

  // Benchmarker status and application state
  const [isBenchmarker, setIsBenchmarker] = useState(false);
  const [applyingBenchmarker, setApplyingBenchmarker] = useState(false);

  // Games autocomplete data and state
  const [gamesList, setGamesList] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Benchmark form autocomplete states
  const [filteredBenchmarkCpus, setFilteredBenchmarkCpus] = useState([]);
  const [filteredBenchmarkGpus, setFilteredBenchmarkGpus] = useState([]);
  const [showBenchmarkCpuDropdown, setShowBenchmarkCpuDropdown] =
    useState(false);
  const [showBenchmarkGpuDropdown, setShowBenchmarkGpuDropdown] =
    useState(false);

  // Benchmark data form state - matches Firebase schema
  const [benchmarkData, setBenchmarkData] = useState({
    CPU: "",
    FPS: "",
    GPU: "",
    Game_Name: "",
    Mode: "",
    RAM: "",
    Resolution: "",
    VRAM: "",
  });
  const [submittingBenchmark, setSubmittingBenchmark] = useState(false);

  // User specs form state
  const [specs, setSpecs] = useState({
    cpu: "",
    gpu: "",
    ram: "",
    resolution: "",
  });

  // Hardware autocomplete data from Firebase
  const [cpuList, setCpuList] = useState([]);
  const [gpuList, setGpuList] = useState([]);
  const [filteredCpus, setFilteredCpus] = useState([]);
  const [filteredGpus, setFilteredGpus] = useState([]);

  // Profile specs dropdown visibility
  const [showCpuDropdown, setShowCpuDropdown] = useState(false);
  const [showGpuDropdown, setShowGpuDropdown] = useState(false);

  // Loading and specs existence state
  const [loading, setLoading] = useState(true);
  const [hasSpecs, setHasSpecs] = useState(false);
  const [saving, setSaving] = useState(false);

  // Input field refs for click-outside detection
  const cpuInputRef = useRef(null);
  const gpuInputRef = useRef(null);
  const gameInputRef = useRef(null);
  const benchmarkCpuInputRef = useRef(null);
  const benchmarkGpuInputRef = useRef(null);

  // Dropdown options
  const ramOptions = ["8GB", "16GB", "32GB", "64GB"];
  const resolutionOptions = ["1920x1080", "2560x1440", "3840x2160 (4K)"];
  const gameModeOptions = ["Low", "Medium", "High", "Ultra"];

  // Initialize data on component mount - fetch hardware specs, games, and user data
  useEffect(() => {
    const fetchSpecsData = async () => {
      try {
        // Fetch available CPUs from Firebase
        const cpuDoc = await getDoc(doc(db, "cpu_names", "all_cpus"));
        if (cpuDoc.exists()) {
          setCpuList(cpuDoc.data().names || []);
        }

        // Fetch available GPUs with VRAM data from Firebase
        const gpuDoc = await getDoc(doc(db, "gpu_names", "all_gpus"));
        if (gpuDoc.exists()) {
          setGpuList(gpuDoc.data().gpus || []);
        }

        // Fetch games from requirements collection for benchmarking
        const gameRequirementsSnapshot = await getDocs(
          collection(db, "game_requirements")
        );
        const games = [];
        gameRequirementsSnapshot.forEach((doc) => {
          const gameData = doc.data();
          if (gameData.Game_Name) {
            games.push(gameData.Game_Name);
          }
        });
        games.sort(); // Alphabetical order for better UX
        setGamesList(games);

        // Load user's existing data if available
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Load existing specs
            if (userData.specs) {
              setSpecs(userData.specs);
              setHasSpecs(true);
            }

            // Check benchmarker status
            if (userData.benchmarker === "yes") {
              setIsBenchmarker(true);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching specs data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchSpecsData();
    }
  }, [currentUser]);

  // Profile specs autocomplete handlers
  const handleCpuChange = (value) => {
    setSpecs((prev) => ({ ...prev, cpu: value }));

    if (value.length > 0) {
      const filtered = cpuList
        .filter((cpu) => cpu.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredCpus(filtered);
      setShowCpuDropdown(true);
    } else {
      setShowCpuDropdown(false);
    }
  };

  const handleGpuChange = (value) => {
    setSpecs((prev) => ({ ...prev, gpu: value }));

    if (value.length > 0) {
      const filtered = gpuList
        .filter((gpu) => gpu.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredGpus(filtered);
      setShowGpuDropdown(true);
    } else {
      setShowGpuDropdown(false);
    }
  };

  const selectCpu = (cpu) => {
    setSpecs((prev) => ({ ...prev, cpu }));
    setShowCpuDropdown(false);
  };

  const selectGpu = (gpu) => {
    setSpecs((prev) => ({ ...prev, gpu: `${gpu.name} (${gpu.vram}GB VRAM)` }));
    setShowGpuDropdown(false);
  };

  // Benchmark form autocomplete handlers
  const handleGameChange = (value) => {
    setBenchmarkData((prev) => ({ ...prev, Game_Name: value }));

    if (value.length > 0) {
      const filtered = gamesList
        .filter((game) => game.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredGames(filtered);
      setShowGameDropdown(true);
    } else {
      setShowGameDropdown(false);
    }
  };

  const handleBenchmarkCpuChange = (value) => {
    setBenchmarkData((prev) => ({ ...prev, CPU: value }));

    if (value.length > 0) {
      const filtered = cpuList
        .filter((cpu) => cpu.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredBenchmarkCpus(filtered);
      setShowBenchmarkCpuDropdown(true);
    } else {
      setShowBenchmarkCpuDropdown(false);
    }
  };

  const handleBenchmarkGpuChange = (value) => {
    setBenchmarkData((prev) => ({ ...prev, GPU: value }));

    if (value.length > 0) {
      const filtered = gpuList
        .filter((gpu) => gpu.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      setFilteredBenchmarkGpus(filtered);
      setShowBenchmarkGpuDropdown(true);
    } else {
      setShowBenchmarkGpuDropdown(false);
    }
  };

  const selectGame = (gameName) => {
    setBenchmarkData((prev) => ({ ...prev, Game_Name: gameName }));
    setShowGameDropdown(false);
  };

  const selectBenchmarkCpu = (cpu) => {
    setBenchmarkData((prev) => ({ ...prev, CPU: cpu }));
    setShowBenchmarkCpuDropdown(false);
  };

  const selectBenchmarkGpu = (gpu) => {
    setBenchmarkData((prev) => ({
      ...prev,
      GPU: gpu.name,
      VRAM: gpu.vram.toString(), // Auto-populate VRAM from GPU data
    }));
    setShowBenchmarkGpuDropdown(false);
  };

  // Save user's hardware specs to Firebase
  const handleSaveSpecs = async () => {
    if (!specs.cpu || !specs.gpu || !specs.ram || !specs.resolution) {
      alert("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);

      if (hasSpecs) {
        await updateDoc(userRef, {
          specs: specs,
          specsUpdatedAt: new Date(),
        });
      } else {
        await updateDoc(userRef, {
          specs: specs,
          specsCreatedAt: new Date(),
        });
        setHasSpecs(true);
      }

      alert(
        hasSpecs ? "Specs updated successfully!" : "Specs added successfully!"
      );
    } catch (error) {
      console.error("Error saving specs:", error);
      alert("Failed to save specs. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Apply to become a game benchmarker
  const handleApplyBenchmarker = async () => {
    if (isBenchmarker) return;

    setApplyingBenchmarker(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);

      await updateDoc(userRef, {
        benchmarker: "yes",
        rank: "bronze",
        benchmarkerAppliedAt: new Date(),
      });

      setIsBenchmarker(true);
      alert(
        "Successfully applied to be a game benchmarker! You now have Bronze rank."
      );
    } catch (error) {
      console.error("Error applying for benchmarker:", error);
      alert("Failed to apply. Please try again.");
    } finally {
      setApplyingBenchmarker(false);
    }
  };

  // Handle form input changes for benchmark data
  const handleBenchmarkChange = (field, value) => {
    setBenchmarkData((prev) => ({ ...prev, [field]: value }));
  };

  // Submit benchmark data to users_benchmarks collection
  const handleSubmitBenchmark = async () => {
    const requiredFields = [
      "CPU",
      "FPS",
      "GPU",
      "Game_Name",
      "Mode",
      "RAM",
      "Resolution",
      "VRAM",
    ];
    const missingFields = requiredFields.filter(
      (field) => !benchmarkData[field]
    );

    if (missingFields.length > 0) {
      alert(`Please fill in all fields: ${missingFields.join(", ")}`);
      return;
    }

    setSubmittingBenchmark(true);
    try {
      // Create benchmark document with proper data types and metadata
      const benchmarkDoc = {
        ...benchmarkData,
        FPS: parseFloat(benchmarkData.FPS), // Convert to number
        RAM: parseInt(benchmarkData.RAM), // Convert to number
        VRAM: parseInt(benchmarkData.VRAM), // Convert to number
        userName: userProfile?.username || currentUser?.email,
        userId: currentUser.uid,
        submittedAt: new Date(),
        status: "pending", // For review process
      };

      const benchmarksRef = collection(db, "users_benchmarks");
      await addDoc(benchmarksRef, benchmarkDoc);

      // Reset form after successful submission
      setBenchmarkData({
        CPU: "",
        FPS: "",
        GPU: "",
        Game_Name: "",
        Mode: "",
        RAM: "",
        Resolution: "",
        VRAM: "",
      });

      alert(
        "Benchmark data submitted successfully! It will be reviewed before being added to the database."
      );
    } catch (error) {
      console.error("Error submitting benchmark:", error);
      alert("Failed to submit benchmark data. Please try again.");
    } finally {
      setSubmittingBenchmark(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.log("Failed to logout:", error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cpuInputRef.current && !cpuInputRef.current.contains(event.target)) {
        setShowCpuDropdown(false);
      }
      if (gpuInputRef.current && !gpuInputRef.current.contains(event.target)) {
        setShowGpuDropdown(false);
      }
      if (
        gameInputRef.current &&
        !gameInputRef.current.contains(event.target)
      ) {
        setShowGameDropdown(false);
      }
      if (
        benchmarkCpuInputRef.current &&
        !benchmarkCpuInputRef.current.contains(event.target)
      ) {
        setShowBenchmarkCpuDropdown(false);
      }
      if (
        benchmarkGpuInputRef.current &&
        !benchmarkGpuInputRef.current.contains(event.target)
      ) {
        setShowBenchmarkGpuDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Redirect to home if not authenticated
  if (!currentUser) {
    navigate("/");
    return null;
  }

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="profile-page">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="hero-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      <div className="container">
        {/* Tab navigation buttons */}
        <div className="button-container">
          <button
            className={`btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => handleTabChange("profile")}
          >
            Profile
          </button>
          <button
            className={`btn ${activeTab === "options" ? "active" : ""}`}
            onClick={() => handleTabChange("options")}
          >
            Options
          </button>
          <button className="btn-red" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Profile tab: user info and hardware specs */}
        {activeTab === "profile" && (
          <div className="profile-info">
            <div className="user-info">
              <div className="info-item">
                <label>Username:</label>
                <span>{userProfile?.username || "N/A"}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{currentUser?.email}</span>
              </div>
              <div className="info-item">
                <label>Member Since:</label>
                <span>
                  {userProfile?.createdAt
                    ? new Date(
                        userProfile.createdAt.seconds * 1000
                      ).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="specs-container">
              <div className="specs-info">
                <div className="specs-item" ref={cpuInputRef}>
                  <label>CPU:</label>
                  <input
                    type="text"
                    placeholder="Start typing CPU name..."
                    value={specs.cpu}
                    onChange={(e) => handleCpuChange(e.target.value)}
                  />
                  {showCpuDropdown && filteredCpus.length > 0 && (
                    <div className="dropdown">
                      {filteredCpus.map((cpu, index) => (
                        <div
                          key={index}
                          className="dropdown-item"
                          onClick={() => selectCpu(cpu)}
                        >
                          {cpu}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="specs-item" ref={gpuInputRef}>
                  <label>GPU:</label>
                  <input
                    type="text"
                    placeholder="Start typing GPU name..."
                    value={specs.gpu}
                    onChange={(e) => handleGpuChange(e.target.value)}
                  />
                  {showGpuDropdown && filteredGpus.length > 0 && (
                    <div className="dropdown">
                      {filteredGpus.map((gpu, index) => (
                        <div
                          key={index}
                          className="dropdown-item"
                          onClick={() => selectGpu(gpu)}
                        >
                          {gpu.name} ({gpu.vram}GB VRAM)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="specs-item">
                  <label>RAM:</label>
                  <select
                    value={specs.ram}
                    onChange={(e) =>
                      setSpecs((prev) => ({ ...prev, ram: e.target.value }))
                    }
                  >
                    <option value="">Select RAM</option>
                    {ramOptions.map((ram) => (
                      <option key={ram} value={ram}>
                        {ram}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="specs-item">
                  <label>Resolution:</label>
                  <select
                    value={specs.resolution}
                    onChange={(e) =>
                      setSpecs((prev) => ({
                        ...prev,
                        resolution: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select Resolution</option>
                    {resolutionOptions.map((resolution) => (
                      <option key={resolution} value={resolution}>
                        {resolution}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className="btn-specs"
                onClick={handleSaveSpecs}
                disabled={saving}
              >
                {saving ? "Saving..." : hasSpecs ? "Edit Specs" : "Add Specs"}
              </button>
            </div>
          </div>
        )}

        {/* Options tab: benchmarker application or benchmark submission */}
        {activeTab === "options" && (
          <div className="options-container">
            {/* Benchmarker application - shown only to non-benchmarkers */}
            {!isBenchmarker && (
              <div className="options-item">
                <label>Join as a Game Benchmarker</label>
                <p>
                  Join our community of game enthusiasts who help us test and
                  improve our AI-powered tool. By applying to be a game
                  benchmarker, your submitted data will be used to improve the
                  tool and you will be rewarded with a rank among users. Your
                  rank will be based on the number of games you have benchmarked
                  and the accuracy of your benchmarks. All user-submitted
                  benchmarks will be publicly available and will be reviewed for
                  accuracy before being added to the database.
                </p>
                <button
                  className="btn-specs"
                  onClick={handleApplyBenchmarker}
                  disabled={applyingBenchmarker}
                >
                  {applyingBenchmarker ? "Applying..." : "Apply"}
                </button>
              </div>
            )}

            {/* Benchmark submission form - shown only to approved benchmarkers */}
            {isBenchmarker && (
              <div className="options-item">
                <div className="benchmark-form">
                  <label>Submit Benchmark Data</label>
                  <div className="benchmark-row">
                    <div className="benchmark-field" ref={gameInputRef}>
                      <label>Game Name:</label>
                      <input
                        type="text"
                        placeholder="Start typing game name..."
                        value={benchmarkData.Game_Name}
                        onChange={(e) => handleGameChange(e.target.value)}
                      />
                      {showGameDropdown && filteredGames.length > 0 && (
                        <div className="dropdown">
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
                    </div>
                    <div className="benchmark-field">
                      <label>AVG FPS:</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 40.9"
                        value={benchmarkData.FPS}
                        onChange={(e) =>
                          handleBenchmarkChange("FPS", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="benchmark-row">
                    <div className="benchmark-field" ref={benchmarkCpuInputRef}>
                      <label>CPU:</label>
                      <input
                        type="text"
                        placeholder="Start typing CPU name..."
                        value={benchmarkData.CPU}
                        onChange={(e) =>
                          handleBenchmarkCpuChange(e.target.value)
                        }
                      />
                      {showBenchmarkCpuDropdown &&
                        filteredBenchmarkCpus.length > 0 && (
                          <div className="dropdown">
                            {filteredBenchmarkCpus.map((cpu, index) => (
                              <div
                                key={index}
                                className="dropdown-item"
                                onClick={() => selectBenchmarkCpu(cpu)}
                              >
                                {cpu}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className="benchmark-field" ref={benchmarkGpuInputRef}>
                      <label>GPU:</label>
                      <input
                        type="text"
                        placeholder="Start typing GPU name..."
                        value={benchmarkData.GPU}
                        onChange={(e) =>
                          handleBenchmarkGpuChange(e.target.value)
                        }
                      />
                      {showBenchmarkGpuDropdown &&
                        filteredBenchmarkGpus.length > 0 && (
                          <div className="dropdown">
                            {filteredBenchmarkGpus.map((gpu, index) => (
                              <div
                                key={index}
                                className="dropdown-item"
                                onClick={() => selectBenchmarkGpu(gpu)}
                              >
                                {gpu.name} ({gpu.vram}GB VRAM)
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="benchmark-row">
                    <div className="benchmark-field">
                      <label>RAM (GB):</label>
                      <input
                        type="number"
                        placeholder="e.g., 32"
                        value={benchmarkData.RAM}
                        onChange={(e) =>
                          handleBenchmarkChange("RAM", e.target.value)
                        }
                      />
                    </div>
                    <div className="benchmark-field">
                      <label>VRAM (GB):</label>
                      <input
                        type="number"
                        placeholder="Auto-filled from GPU"
                        value={benchmarkData.VRAM}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: "#f5f5f5",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                  </div>

                  <div className="benchmark-row">
                    <div className="benchmark-field">
                      <label>Resolution:</label>
                      <select
                        value={benchmarkData.Resolution}
                        onChange={(e) =>
                          handleBenchmarkChange("Resolution", e.target.value)
                        }
                      >
                        <option value="">Select Resolution</option>
                        <option value="1920x1080">1920x1080</option>
                        <option value="2560x1440">2560x1440</option>
                        <option value="3840x2160">3840x2160 (4K)</option>
                      </select>
                    </div>
                    <div className="benchmark-field">
                      <label>Graphics Mode:</label>
                      <select
                        value={benchmarkData.Mode}
                        onChange={(e) =>
                          handleBenchmarkChange("Mode", e.target.value)
                        }
                      >
                        <option value="">Select Mode</option>
                        {gameModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    className="btn-specs"
                    onClick={handleSubmitBenchmark}
                    disabled={submittingBenchmark}
                  >
                    {submittingBenchmark ? "Submitting..." : "Add Data"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
