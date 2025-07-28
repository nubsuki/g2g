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
  query,
  where,
} from "firebase/firestore";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Tab navigation
  const [activeTab, setActiveTab] = useState("profile");

  // Benchmarker status
  const [isBenchmarker, setIsBenchmarker] = useState(false);
  const [applyingBenchmarker, setApplyingBenchmarker] = useState(false);

  // User submissions
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [hasCheckedSubmissions, setHasCheckedSubmissions] = useState(false);

  // Games data
  const [gamesList, setGamesList] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Benchmark form autocomplete
  const [filteredBenchmarkCpus, setFilteredBenchmarkCpus] = useState([]);
  const [filteredBenchmarkGpus, setFilteredBenchmarkGpus] = useState([]);
  const [showBenchmarkCpuDropdown, setShowBenchmarkCpuDropdown] =
    useState(false);
  const [showBenchmarkGpuDropdown, setShowBenchmarkGpuDropdown] =
    useState(false);

  // Benchmark form data
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

  // User specs
  const [specs, setSpecs] = useState({
    cpu: "",
    gpu: "",
    ram: "",
    resolution: "",
  });

  // Hardware data from Firebase
  const [cpuList, setCpuList] = useState([]);
  const [gpuList, setGpuList] = useState([]);
  const [filteredCpus, setFilteredCpus] = useState([]);
  const [filteredGpus, setFilteredGpus] = useState([]);

  // Profile specs dropdowns
  const [showCpuDropdown, setShowCpuDropdown] = useState(false);
  const [showGpuDropdown, setShowGpuDropdown] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [hasSpecs, setHasSpecs] = useState(false);
  const [saving, setSaving] = useState(false);

  // Input refs for click-outside detection
  const cpuInputRef = useRef(null);
  const gpuInputRef = useRef(null);
  const gameInputRef = useRef(null);
  const benchmarkCpuInputRef = useRef(null);
  const benchmarkGpuInputRef = useRef(null);

  // Dropdown options
  const ramOptions = ["8GB", "16GB", "32GB", "64GB"];
  const resolutionOptions = ["1920x1080", "2560x1440", "3840x2160 (4K)"];
  const gameModeOptions = ["Low", "Medium", "High", "Ultra"];

  // Initialize data on component mount
  useEffect(() => {
    const fetchSpecsData = async () => {
      try {
        const cpuDoc = await getDoc(doc(db, "cpu_names", "all_cpus"));
        if (cpuDoc.exists()) {
          setCpuList(cpuDoc.data().names || []);
        }

        const gpuDoc = await getDoc(doc(db, "gpu_names", "all_gpus"));
        if (gpuDoc.exists()) {
          setGpuList(gpuDoc.data().gpus || []);
        }

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
        games.sort();
        setGamesList(games);

        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (userData.specs) {
              setSpecs(userData.specs);
              setHasSpecs(true);
            }

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

  // Check if user has submissions
  const checkUserSubmissions = async () => {
    if (!currentUser || !isBenchmarker) return;

    try {
      const submissionsQuery = query(
        collection(db, "users_benchmarks"),
        where("userId", "==", currentUser.uid)
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      setHasCheckedSubmissions(true);

      if (!submissionsSnapshot.empty) {
        const submissions = [];
        submissionsSnapshot.forEach((doc) => {
          submissions.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        submissions.sort((a, b) => {
          const dateA = a.submittedAt?.toDate
            ? a.submittedAt.toDate()
            : new Date(a.submittedAt);
          const dateB = b.submittedAt?.toDate
            ? b.submittedAt.toDate()
            : new Date(b.submittedAt);
          return dateB - dateA;
        });

        setUserSubmissions(submissions);
      }
    } catch (error) {
      console.error("Error checking user submissions:", error);
      setHasCheckedSubmissions(true);
    }
  };

  useEffect(() => {
    if (isBenchmarker && currentUser && !hasCheckedSubmissions) {
      checkUserSubmissions();
    }
  }, [isBenchmarker, currentUser, hasCheckedSubmissions]);

  useEffect(() => {
    if (
      activeTab === "submits" &&
      isBenchmarker &&
      userSubmissions.length === 0
    ) {
      fetchUserSubmissions();
    }
  }, [activeTab, isBenchmarker]);

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
      VRAM: gpu.vram.toString(),
    }));
    setShowBenchmarkGpuDropdown(false);
  };

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

  const handleBenchmarkChange = (field, value) => {
    setBenchmarkData((prev) => ({ ...prev, [field]: value }));
  };

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
      const benchmarkDoc = {
        ...benchmarkData,
        FPS: parseFloat(benchmarkData.FPS),
        RAM: parseInt(benchmarkData.RAM),
        VRAM: parseInt(benchmarkData.VRAM),
        userName: userProfile?.username || currentUser?.email,
        userId: currentUser.uid,
        submittedAt: new Date(),
        status: "pending",
      };

      const benchmarksRef = collection(db, "users_benchmarks");
      await addDoc(benchmarksRef, benchmarkDoc);

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

      // Refresh submissions
      setHasCheckedSubmissions(false);
      setUserSubmissions([]);

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

  const fetchUserSubmissions = async () => {
    if (!currentUser) return;

    setLoadingSubmissions(true);
    try {
      const submissionsQuery = query(
        collection(db, "users_benchmarks"),
        where("userId", "==", currentUser.uid)
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissions = [];

      submissionsSnapshot.forEach((doc) => {
        submissions.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      submissions.sort((a, b) => {
        const dateA = a.submittedAt?.toDate
          ? a.submittedAt.toDate()
          : new Date(a.submittedAt);
        const dateB = b.submittedAt?.toDate
          ? b.submittedAt.toDate()
          : new Date(b.submittedAt);
        return dateB - dateA;
      });

      setUserSubmissions(submissions);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      alert("Failed to load submissions. Please try again.");
    } finally {
      setLoadingSubmissions(false);
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

  // Close dropdowns when clicking outside
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

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusBadge = (status) => {
    const baseClass = "status-badge";
    switch (status) {
      case "pending":
        return `${baseClass} status-pending`;
      case "approved":
        return `${baseClass} status-approved`;
      case "rejected":
        return `${baseClass} status-rejected`;
      default:
        return `${baseClass} status-unknown`;
    }
  };

  if (!currentUser) {
    navigate("/");
    return null;
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile Dashboard</h1>
          <p>Manage your gaming profile and benchmark contributions</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => handleTabChange("profile")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Profile
          </button>
          <button
            className={`tab-btn ${activeTab === "options" ? "active" : ""}`}
            onClick={() => handleTabChange("options")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            Options
          </button>
          {isBenchmarker && userSubmissions.length > 0 && (
            <button
              className={`tab-btn ${activeTab === "submits" ? "active" : ""}`}
              onClick={() => handleTabChange("submits")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              Submissions
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Logout
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "profile" && (
            <div className="profile-content">
              {/* User Info Card */}
              <div className="info-card user-card">
                <div className="card-header">
                  <h3>User Information</h3>
                  <div className="user-avatar">
                    {userProfile?.username?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="card-content">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Username</span>
                      <span className="value">{userProfile?.username || "N/A"}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Email</span>
                      <span className="value">{currentUser?.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Member Since</span>
                      <span className="value">
                        {userProfile?.createdAt
                          ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    {isBenchmarker && (
                      <div className="info-item">
                        <span className="label">Benchmarker Status</span>
                        <span className="value benchmarker-badge">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          Bronze Benchmarker
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Specs Card */}
              <div className="info-card specs-card">
                <div className="card-header">
                  <h3>System Specifications</h3>
                  <div className="specs-status">
                    {hasSpecs ? (
                      <span className="status-complete">Complete</span>
                    ) : (
                      <span className="status-incomplete">Incomplete</span>
                    )}
                  </div>
                </div>
                <div className="card-content">
                  <div className="specs-form">
                    <div className="form-row">
                      <div className="form-group" ref={cpuInputRef}>
                        <label>CPU Processor</label>
                        <input
                          type="text"
                          placeholder="Start typing CPU name..."
                          value={specs.cpu}
                          onChange={(e) => handleCpuChange(e.target.value)}
                          className="modern-input"
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
                      <div className="form-group" ref={gpuInputRef}>
                        <label>Graphics Card</label>
                        <input
                          type="text"
                          placeholder="Start typing GPU name..."
                          value={specs.gpu}
                          onChange={(e) => handleGpuChange(e.target.value)}
                          className="modern-input"
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
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Memory (RAM)</label>
                        <select
                          value={specs.ram}
                          onChange={(e) => setSpecs((prev) => ({ ...prev, ram: e.target.value }))}
                          className="modern-select"
                        >
                          <option value="">Select RAM</option>
                          {ramOptions.map((ram) => (
                            <option key={ram} value={ram}>{ram}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Display Resolution</label>
                        <select
                          value={specs.resolution}
                          onChange={(e) => setSpecs((prev) => ({ ...prev, resolution: e.target.value }))}
                          className="modern-select"
                        >
                          <option value="">Select Resolution</option>
                          {resolutionOptions.map((resolution) => (
                            <option key={resolution} value={resolution}>{resolution}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      className="save-specs-btn"
                      onClick={handleSaveSpecs}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="spinner"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                          </svg>
                          {hasSpecs ? "Update Specs" : "Save Specs"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "options" && (
            <div className="options-content">
              {!isBenchmarker ? (
                <div className="info-card benchmarker-application-card">
                  <div className="card-header">
                    <h3>Become a Game Benchmarker</h3>
                    <div className="rank-badge bronze">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Bronze Rank
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="application-info">
                      <div className="benefits-grid">
                        <div className="benefit-item">
                          <div className="benefit-icon">📊</div>
                          <h4>Contribute Data</h4>
                          <p>Help improve our AI model with your benchmark results</p>
                        </div>
                        <div className="benefit-item">
                          <div className="benefit-icon">🏆</div>
                          <h4>Earn Rankings</h4>
                          <p>Get recognized for your contributions with rank badges</p>
                        </div>
                        <div className="benefit-item">
                          <div className="benefit-icon">🎮</div>
                          <h4>Gaming Community</h4>
                          <p>Join a community of gaming enthusiasts and testers</p>
                        </div>
                      </div>
                      <div className="application-description">
                        <p>
                          Join our community of game enthusiasts who help test and improve our AI-powered FPS prediction tool. 
                          Your submitted benchmark data will be reviewed for accuracy and used to enhance the model's predictions.
                        </p>
                      </div>
                      <button
                        className="apply-benchmarker-btn"
                        onClick={handleApplyBenchmarker}
                        disabled={applyingBenchmarker}
                      >
                        {applyingBenchmarker ? (
                          <>
                            <div className="spinner"></div>
                            Applying...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                            Apply Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="info-card benchmark-submission-card">
                  <div className="card-header">
                    <h3>Submit Benchmark Data</h3>
                  </div>
                  <div className="card-content">
                    <div className="benchmark-form">
                      <div className="form-row">
                        <div className="form-group" ref={gameInputRef}>
                          <label>Game Name</label>
                          <input
                            type="text"
                            placeholder="Start typing game name..."
                            value={benchmarkData.Game_Name}
                            onChange={(e) => handleGameChange(e.target.value)}
                            className="modern-input"
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
                        <div className="form-group">
                          <label>Average FPS</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="e.g., 60.5"
                            value={benchmarkData.FPS}
                            onChange={(e) => handleBenchmarkChange("FPS", e.target.value)}
                            className="modern-input"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group" ref={benchmarkCpuInputRef}>
                          <label>CPU</label>
                          <input
                            type="text"
                            placeholder="Start typing CPU name..."
                            value={benchmarkData.CPU}
                            onChange={(e) => handleBenchmarkCpuChange(e.target.value)}
                            className="modern-input"
                          />
                          {showBenchmarkCpuDropdown && filteredBenchmarkCpus.length > 0 && (
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
                        <div className="form-group" ref={benchmarkGpuInputRef}>
                          <label>GPU</label>
                          <input
                            type="text"
                            placeholder="Start typing GPU name..."
                            value={benchmarkData.GPU}
                            onChange={(e) => handleBenchmarkGpuChange(e.target.value)}
                            className="modern-input"
                          />
                          {showBenchmarkGpuDropdown && filteredBenchmarkGpus.length > 0 && (
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

                      <div className="form-row">
                        <div className="form-group">
                          <label>RAM (GB)</label>
                          <input
                            type="number"
                            placeholder="e.g., 16"
                            value={benchmarkData.RAM}
                            onChange={(e) => handleBenchmarkChange("RAM", e.target.value)}
                            className="modern-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>VRAM (GB)</label>
                          <input
                            type="number"
                            placeholder="Auto-filled from GPU"
                            value={benchmarkData.VRAM}
                            readOnly
                            disabled
                            className="modern-input disabled"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Resolution</label>
                          <select
                            value={benchmarkData.Resolution}
                            onChange={(e) => handleBenchmarkChange("Resolution", e.target.value)}
                            className="modern-select"
                          >
                            <option value="">Select Resolution</option>
                            <option value="1920x1080">1920x1080</option>
                            <option value="2560x1440">2560x1440</option>
                            <option value="3840x2160">3840x2160 (4K)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Graphics Mode</label>
                          <select
                            value={benchmarkData.Mode}
                            onChange={(e) => handleBenchmarkChange("Mode", e.target.value)}
                            className="modern-select"
                          >
                            <option value="">Select Mode</option>
                            {gameModeOptions.map((mode) => (
                              <option key={mode} value={mode}>{mode}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        className="submit-benchmark-btn"
                        onClick={handleSubmitBenchmark}
                        disabled={submittingBenchmark}
                      >
                        {submittingBenchmark ? (
                          <>
                            <div className="spinner"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                            Submit Benchmark
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "submits" && (
            <div className="submissions-content">
              <div className="info-card submissions-card">
                <div className="card-header">
                  <h3>Your Benchmark Submissions</h3>
                  <div className="submission-summary">
                    <span className="total-submissions">{userSubmissions.length} Total</span>
                  </div>
                </div>
                <div className="card-content">
                  {loadingSubmissions ? (
                    <div className="loading-submissions">
                      <Loading />
                    </div>
                  ) : userSubmissions.length === 0 ? (
                    <div className="no-submissions">
                      <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                        <h4>No Submissions Yet</h4>
                        <p>You haven't submitted any benchmarks yet. Start contributing to help improve our model!</p>
                        <button
                          className="create-submission-btn"
                          onClick={() => handleTabChange("options")}
                        >
                          Create Your First Submission
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="submissions-grid">
                      {userSubmissions.map((submission) => (
                        <div key={submission.id} className="submission-card">
                          <div className="submission-header">
                            <div className="game-info">
                              <h4>{submission.Game_Name}</h4>
                              <span className="fps-display">{submission.FPS} FPS</span>
                            </div>
                            <span className={`status-badge ${submission.status || 'pending'}`}>
                              {submission.status || 'pending'}
                            </span>
                          </div>

                          <div className="submission-details">
                            <div className="detail-grid">
                              <div className="detail-item">
                                <span className="detail-label">Graphics</span>
                                <span className="detail-value">{submission.Mode}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Resolution</span>
                                <span className="detail-value">{submission.Resolution}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">CPU</span>
                                <span className="detail-value">{submission.CPU}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">GPU</span>
                                <span className="detail-value">{submission.GPU}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">RAM</span>
                                <span className="detail-value">{submission.RAM}GB</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Submitted</span>
                                <span className="detail-value">{formatDate(submission.submittedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
