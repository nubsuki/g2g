import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc, addDoc, query, orderBy, where, getDoc } from "firebase/firestore";
import "./Admin.css";
import { FaUsers, FaGamepad, FaMicrochip, FaPlus, FaTrash, FaEdit, FaSearch, FaFilter, FaLock, FaCheck, FaClock } from "react-icons/fa";

const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(false);
  
  // Check if user is admin
  const isAdmin = currentUser && userProfile?.role === 'admin';

  // If user is not admin, show access denied
  if (!currentUser) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="access-denied">
            <div className="access-denied-icon">
              <FaLock />
            </div>
            <h2>Access Denied</h2>
            <p>You must be logged in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="access-denied">
            <div className="access-denied-icon">
              <FaLock />
            </div>
            <h2>Access Denied</h2>
            <p>You don't have permission to access the admin panel.</p>
            <p>Contact an administrator if you believe this is an error.</p>
          </div>
        </div>
      </div>
    );
  }

  // Users data
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  
  // Games data
  const [games, setGames] = useState([]);
  const [gameFormData, setGameFormData] = useState({
    Game_Name: "",
    CPU: "",
    GPU: "",
    RAM: "",
    OS: "",
    File_size: ""
  });
  
  // CPU and GPU autocomplete - store full GPU objects for VRAM display
  const [cpuSuggestions, setCpuSuggestions] = useState([]);
  const [filteredCpus, setFilteredCpus] = useState([]);
  const [showCpuDropdown, setShowCpuDropdown] = useState(false);
  const [gpuSuggestions, setGpuSuggestions] = useState([]); // Now stores full GPU objects
  const [filteredGpus, setFilteredGpus] = useState([]);
  const [showGpuDropdown, setShowGpuDropdown] = useState(false);
  
  // Refs for click outside detection
  const cpuInputRef = useRef(null);
  const gpuInputRef = useRef(null);
  
  // CPU data
  const [cpus, setCpus] = useState([]);
  const [cpuFormData, setCpuFormData] = useState({
    CPU_Name: "",
    CPU_Cores: "",
    CPU_GHz: "",
    Benchmark_Score: "",
    Test_type: ""
  });
  
  // GPU data
  const [gpus, setGpus] = useState([]);
  const [gpuFormData, setGpuFormData] = useState({
    GPU_Name: "",
    API: "",
    GPU_VRAM: "",
    Benchmark_Score: ""
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (userSearchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [users, userSearchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cpuInputRef.current && !cpuInputRef.current.contains(event.target)) {
        setShowCpuDropdown(false);
      }
      if (gpuInputRef.current && !gpuInputRef.current.contains(event.target)) {
        setShowGpuDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchGames(),
        fetchCPUs(),
        fetchGPUs(),
        fetchCpuNames(), // Fetch CPU names for autocomplete
        fetchGpuNames()  // Fetch GPU names for autocomplete
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch CPU names from the correct collection
  const fetchCpuNames = async () => {
    try {
      const cpuDoc = await getDoc(doc(db, "cpu_names", "all_cpus"));
      if (cpuDoc.exists()) {
        const cpuNames = cpuDoc.data().names || [];
        setCpuSuggestions(cpuNames);
        console.log("CPU names loaded:", cpuNames.length);
      } else {
        console.log("No CPU names document found");
        setCpuSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching CPU names:", error);
      setCpuSuggestions([]);
    }
  };

  // Fetch GPU names from the correct collection - Store full objects with VRAM
  const fetchGpuNames = async () => {
    try {
      const gpuDoc = await getDoc(doc(db, "gpu_names", "all_gpus"));
      if (gpuDoc.exists()) {
        const gpuData = gpuDoc.data().gpus || [];
        // Store the full GPU objects (with name and vram)
        const validGpus = gpuData.filter(gpu => gpu.name);
        setGpuSuggestions(validGpus);
        console.log("GPU data loaded:", validGpus.length, validGpus);
      } else {
        console.log("No GPU names document found");
        setGpuSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching GPU names:", error);
      setGpuSuggestions([]);
    }
  };

  // Fetch benchmark submissions for a specific user
  const fetchUserBenchmarkStats = async (userId) => {
    try {
      const benchmarkQuery = query(
        collection(db, "user_benchmarks"),
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(benchmarkQuery);
      let totalSubmissions = 0;
      let approvedSubmissions = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalSubmissions++;
        if (data.status === "approved") {
          approvedSubmissions++;
        }
      });

      return {
        totalSubmissions,
        approvedSubmissions
      };
    } catch (error) {
      console.log(`No benchmark data found for user ${userId}`);
      return {
        totalSubmissions: 0,
        approvedSubmissions: 0
      };
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = [];
      
      for (const docRef of querySnapshot.docs) {
        const userData = { id: docRef.id, ...docRef.data() };
        const benchmarkStats = await fetchUserBenchmarkStats(docRef.id);
        userData.benchmarkStats = benchmarkStats;
        usersData.push(userData);
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchGames = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, "game_requirements"), orderBy("Game_Name")));
      const gamesData = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() });
      });
      setGames(gamesData);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };

  const fetchCPUs = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, "cpu_benchmarks"), orderBy("CPU_Name")));
      const cpusData = [];
      querySnapshot.forEach((doc) => {
        cpusData.push({ id: doc.id, ...doc.data() });
      });
      setCpus(cpusData);
    } catch (error) {
      console.error("Error fetching CPUs:", error);
    }
  };

  const fetchGPUs = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, "gpu_benchmarks"), orderBy("GPU_Name")));
      const gpusData = [];
      querySnapshot.forEach((doc) => {
        gpusData.push({ id: doc.id, ...doc.data() });
      });
      setGpus(gpusData);
    } catch (error) {
      console.error("Error fetching GPUs:", error);
    }
  };

  // Handle CPU input change with autocomplete
  const handleCpuInputChange = (value) => {
    setGameFormData({...gameFormData, CPU: value});

    console.log("CPU input changed:", value);
    console.log("Available CPU suggestions:", cpuSuggestions.length);

    if (value.length > 0) {
      const filtered = cpuSuggestions
        .filter((cpu) => cpu.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      console.log("Filtered CPUs:", filtered);
      setFilteredCpus(filtered);
      setShowCpuDropdown(true);
    } else {
      setShowCpuDropdown(false);
    }
  };

  // Handle GPU input change with autocomplete - Updated for VRAM display
  const handleGpuInputChange = (value) => {
    setGameFormData({...gameFormData, GPU: value});

    console.log("GPU input changed:", value);
    console.log("Available GPU suggestions:", gpuSuggestions.length);

    if (value.length > 0) {
      const filtered = gpuSuggestions
        .filter((gpu) => gpu.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      console.log("Filtered GPUs:", filtered);
      setFilteredGpus(filtered);
      setShowGpuDropdown(true);
    } else {
      setShowGpuDropdown(false);
    }
  };

  // Select CPU from dropdown
  const selectCpu = (selectedCpu) => {
    setGameFormData({...gameFormData, CPU: selectedCpu});
    setShowCpuDropdown(false);
  };

  // Select GPU from dropdown - Updated to use GPU object
  const selectGpu = (selectedGpu) => {
    setGameFormData({...gameFormData, GPU: selectedGpu.name});
    setShowGpuDropdown(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleGameSubmit = async (e) => {
    e.preventDefault();
    if (!gameFormData.Game_Name) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "game_requirements"), {
        ...gameFormData,
        RAM: parseInt(gameFormData.RAM) || 0,
        File_size: parseFloat(gameFormData.File_size) || 0,
        createdAt: new Date()
      });
      
      setGameFormData({
        Game_Name: "",
        CPU: "",
        GPU: "",
        RAM: "",
        OS: "",
        File_size: ""
      });
      
      await fetchGames();
      alert("Game added successfully!");
    } catch (error) {
      console.error("Error adding game:", error);
      alert("Error adding game: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCpuSubmit = async (e) => {
    e.preventDefault();
    if (!cpuFormData.CPU_Name) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "cpu_benchmarks"), {
        ...cpuFormData,
        CPU_Cores: parseInt(cpuFormData.CPU_Cores) || 0,
        CPU_GHz: parseFloat(cpuFormData.CPU_GHz) || 0,
        Benchmark_Score: parseInt(cpuFormData.Benchmark_Score) || 0,
        createdAt: new Date()
      });
      
      setCpuFormData({
        CPU_Name: "",
        CPU_Cores: "",
        CPU_GHz: "",
        Benchmark_Score: "",
        Test_type: ""
      });
      
      await fetchCPUs();
      alert("CPU added successfully!");
    } catch (error) {
      console.error("Error adding CPU:", error);
      alert("Error adding CPU: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGpuSubmit = async (e) => {
    e.preventDefault();
    if (!gpuFormData.GPU_Name) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "gpu_benchmarks"), {
        ...gpuFormData,
        GPU_VRAM: parseInt(gpuFormData.GPU_VRAM) || 0,
        Benchmark_Score: parseInt(gpuFormData.Benchmark_Score) || 0,
        createdAt: new Date()
      });
      
      setGpuFormData({
        GPU_Name: "",
        API: "",
        GPU_VRAM: "",
        Benchmark_Score: ""
      });
      
      await fetchGPUs();
      alert("GPU added successfully!");
    } catch (error) {
      console.error("Error adding GPU:", error);
      alert("Error adding GPU: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (collection_name, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, collection_name, id));
      
      switch (collection_name) {
        case "game_requirements":
          await fetchGames();
          break;
        case "cpu_benchmarks":
          await fetchCPUs();
          break;
        case "gpu_benchmarks":
          await fetchGPUs();
          break;
        default:
          break;
      }
      
      alert("Item deleted successfully!");
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error deleting item: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "users", label: "Users", icon: <FaUsers /> },
    { id: "games", label: "Add Games", icon: <FaGamepad /> },
    { id: "cpu", label: "Add CPU", icon: <FaMicrochip /> },
    { id: "gpu", label: "Add GPU", icon: <FaMicrochip /> }
  ];

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, games, and hardware specifications</p>
        </div>

        <div className="admin-content">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="users-section">
                <div className="section-header">
                  <h2>User Management</h2>
                  <div className="search-container">
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
                
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Join Date</th>
                        <th>Specs Status</th>
                        <th>Benchmarks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.username || "N/A"}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-badge ${user.role}`}>
                              {user.role || "user"}
                            </span>
                          </td>
                          <td>{user.createdAt?.toDate().toLocaleDateString() || "N/A"}</td>
                          <td>
                            <span className={`status-badge ${user.specs ? 'complete' : 'incomplete'}`}>
                              {user.specs ? "Complete" : "Incomplete"}
                            </span>
                          </td>
                          <td>
                            <div className="benchmark-stats">
                              <div className="benchmark-stat">
                                <span className="stat-icon">
                                  <FaClock />
                                </span>
                                <span className="stat-number">
                                  {user.benchmarkStats?.totalSubmissions || 0}
                                </span>
                                <span className="stat-label">Submitted</span>
                              </div>
                              <div className="benchmark-stat">
                                <span className="stat-icon approved">
                                  <FaCheck />
                                </span>
                                <span className="stat-number">
                                  {user.benchmarkStats?.approvedSubmissions || 0}
                                </span>
                                <span className="stat-label">Approved</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-edit" title="Edit User">
                                <FaEdit />
                              </button>
                              <button className="btn-delete" title="Delete User">
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="no-data">No users found</div>
                  )}
                </div>
              </div>
            )}

            {/* Games Tab */}
            {activeTab === "games" && (
              <div className="games-section">
                <div className="section-split">
                  <div className="form-section">
                    <h2>Add New Game</h2>
                    <form onSubmit={handleGameSubmit} className="admin-form">
                      <div className="form-group">
                        <label>Game Name</label>
                        <input
                          type="text"
                          value={gameFormData.Game_Name}
                          onChange={(e) => setGameFormData({...gameFormData, Game_Name: e.target.value})}
                          placeholder="Enter game name"
                          required
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>CPU Requirement</label>
                          <div className="autocomplete-container" ref={cpuInputRef}>
                            <input
                              type="text"
                              value={gameFormData.CPU}
                              onChange={(e) => handleCpuInputChange(e.target.value)}
                              placeholder="Start typing CPU name..."
                            />
                            {showCpuDropdown && filteredCpus.length > 0 && (
                              <div className="autocomplete-dropdown">
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
                        </div>
                        <div className="form-group">
                          <label>GPU Requirement</label>
                          <div className="autocomplete-container" ref={gpuInputRef}>
                            <input
                              type="text"
                              value={gameFormData.GPU}
                              onChange={(e) => handleGpuInputChange(e.target.value)}
                              placeholder="Start typing GPU name..."
                            />
                            {showGpuDropdown && filteredGpus.length > 0 && (
                              <div className="autocomplete-dropdown">
                                {filteredGpus.map((gpu, index) => (
                                  <div
                                    key={index}
                                    className="dropdown-item gpu-item"
                                    onClick={() => selectGpu(gpu)}
                                  >
                                    <span className="gpu-name">{gpu.name}</span>
                                    <span className="gpu-vram">({gpu.vram}GB)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>RAM (GB)</label>
                          <input
                            type="number"
                            value={gameFormData.RAM}
                            onChange={(e) => setGameFormData({...gameFormData, RAM: e.target.value})}
                            placeholder="8"
                          />
                        </div>
                        <div className="form-group">
                          <label>File Size (GB)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={gameFormData.File_size}
                            onChange={(e) => setGameFormData({...gameFormData, File_size: e.target.value})}
                            placeholder="50.5"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Operating System</label>
                        <input
                          type="text"
                          value={gameFormData.OS}
                          onChange={(e) => setGameFormData({...gameFormData, OS: e.target.value})}
                          placeholder="Windows 10"
                        />
                      </div>
                      <button type="submit" className="submit-btn" disabled={loading}>
                        <FaPlus />
                        <span>{loading ? "Adding..." : "Add Game"}</span>
                      </button>
                    </form>
                  </div>

                  <div className="data-section">
                    <h3>Existing Games ({games.length})</h3>
                    <div className="data-list">
                      {games.slice(0, 10).map((game) => (
                        <div key={game.id} className="data-item">
                          <div className="item-info">
                            <h4>{game.Game_Name}</h4>
                            <span>{game.CPU} • {game.GPU} • {game.RAM}GB RAM</span>
                          </div>
                          <button 
                            onClick={() => deleteItem("game_requirements", game.id)}
                            className="btn-delete"
                            title="Delete Game"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CPU Tab */}
            {activeTab === "cpu" && (
              <div className="cpu-section">
                <div className="section-split">
                  <div className="form-section">
                    <h2>Add New CPU</h2>
                    <form onSubmit={handleCpuSubmit} className="admin-form">
                      <div className="form-group">
                        <label>CPU Name</label>
                        <input
                          type="text"
                          value={cpuFormData.CPU_Name}
                          onChange={(e) => setCpuFormData({...cpuFormData, CPU_Name: e.target.value})}
                          placeholder="e.g. Intel Core i7-12700K"
                          required
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Cores</label>
                          <input
                            type="number"
                            value={cpuFormData.CPU_Cores}
                            onChange={(e) => setCpuFormData({...cpuFormData, CPU_Cores: e.target.value})}
                            placeholder="8"
                          />
                        </div>
                        <div className="form-group">
                          <label>Base Clock (GHz)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={cpuFormData.CPU_GHz}
                            onChange={(e) => setCpuFormData({...cpuFormData, CPU_GHz: e.target.value})}
                            placeholder="3.6"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Benchmark Score</label>
                          <input
                            type="number"
                            value={cpuFormData.Benchmark_Score}
                            onChange={(e) => setCpuFormData({...cpuFormData, Benchmark_Score: e.target.value})}
                            placeholder="25000"
                          />
                        </div>
                        <div className="form-group">
                          <label>Test Type</label>
                          <input
                            type="text"
                            value={cpuFormData.Test_type}
                            onChange={(e) => setCpuFormData({...cpuFormData, Test_type: e.target.value})}
                            placeholder="e.g. Cinebench R23"
                          />
                        </div>
                      </div>
                      <button type="submit" className="submit-btn" disabled={loading}>
                        <FaPlus />
                        <span>{loading ? "Adding..." : "Add CPU"}</span>
                      </button>
                    </form>
                  </div>

                  <div className="data-section">
                    <h3>Existing CPUs ({cpus.length})</h3>
                    <div className="data-list">
                      {cpus.slice(0, 10).map((cpu) => (
                        <div key={cpu.id} className="data-item">
                          <div className="item-info">
                            <h4>{cpu.CPU_Name}</h4>
                            <span>{cpu.CPU_Cores} cores • {cpu.CPU_GHz}GHz • Score: {cpu.Benchmark_Score}</span>
                          </div>
                          <button 
                            onClick={() => deleteItem("cpu_benchmarks", cpu.id)}
                            className="btn-delete"
                            title="Delete CPU"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GPU Tab */}
            {activeTab === "gpu" && (
              <div className="gpu-section">
                <div className="section-split">
                  <div className="form-section">
                    <h2>Add New GPU</h2>
                    <form onSubmit={handleGpuSubmit} className="admin-form">
                      <div className="form-group">
                        <label>GPU Name</label>
                        <input
                          type="text"
                          value={gpuFormData.GPU_Name}
                          onChange={(e) => setGpuFormData({...gpuFormData, GPU_Name: e.target.value})}
                          placeholder="e.g. NVIDIA GeForce RTX 4070"
                          required
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>API</label>
                          <input
                            type="text"
                            value={gpuFormData.API}
                            onChange={(e) => setGpuFormData({...gpuFormData, API: e.target.value})}
                            placeholder="e.g. DirectX 12"
                          />
                        </div>
                        <div className="form-group">
                          <label>VRAM (GB)</label>
                          <input
                            type="number"
                            value={gpuFormData.GPU_VRAM}
                            onChange={(e) => setGpuFormData({...gpuFormData, GPU_VRAM: e.target.value})}
                            placeholder="12"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Benchmark Score</label>
                        <input
                          type="number"
                          value={gpuFormData.Benchmark_Score}
                          onChange={(e) => setGpuFormData({...gpuFormData, Benchmark_Score: e.target.value})}
                          placeholder="15000"
                        />
                      </div>
                      <button type="submit" className="submit-btn" disabled={loading}>
                        <FaPlus />
                        <span>{loading ? "Adding..." : "Add GPU"}</span>
                      </button>
                    </form>
                  </div>

                  <div className="data-section">
                    <h3>Existing GPUs ({gpus.length})</h3>
                    <div className="data-list">
                      {gpus.slice(0, 10).map((gpu) => (
                        <div key={gpu.id} className="data-item">
                          <div className="item-info">
                            <h4>{gpu.GPU_Name}</h4>
                            <span>{gpu.GPU_VRAM}GB VRAM • {gpu.API} • Score: {gpu.Benchmark_Score}</span>
                          </div>
                          <button 
                            onClick={() => deleteItem("gpu_benchmarks", gpu.id)}
                            className="btn-delete"
                            title="Delete GPU"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
