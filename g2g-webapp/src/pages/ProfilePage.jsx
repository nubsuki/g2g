import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Loading from "../Components/Loading";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, collection } from "firebase/firestore";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  // State for form inputs
  const [specs, setSpecs] = useState({
    cpu: "",
    gpu: "",
    ram: "",
    resolution: ""
  });
  
  // State for autocomplete data
  const [cpuList, setCpuList] = useState([]);
  const [gpuList, setGpuList] = useState([]);
  const [filteredCpus, setFilteredCpus] = useState([]);
  const [filteredGpus, setFilteredGpus] = useState([]);
  
  // State for dropdown visibility
  const [showCpuDropdown, setShowCpuDropdown] = useState(false);
  const [showGpuDropdown, setShowGpuDropdown] = useState(false);
  
  // State for loading and specs existence
  const [loading, setLoading] = useState(true);
  const [hasSpecs, setHasSpecs] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Refs for input fields
  const cpuInputRef = useRef(null);
  const gpuInputRef = useRef(null);
  
  // RAM options (8GB to 64GB)
  const ramOptions = ["8GB", "16GB", "32GB", "64GB"];
  
  // Resolution options
  const resolutionOptions = [
    "1920x1080",
    "2560x1440", 
    "3840x2160 (4K)"
  ];

  // Fetch CPU and GPU data from Firebase
  useEffect(() => {
    const fetchSpecsData = async () => {
      try {
        // Fetch CPU data
        const cpuDoc = await getDoc(doc(db, "cpu_names", "all_cpus"));
        if (cpuDoc.exists()) {
          setCpuList(cpuDoc.data().names || []);
        }
        
        // Fetch GPU data
        const gpuDoc = await getDoc(doc(db, "gpu_names", "all_gpus"));
        if (gpuDoc.exists()) {
          setGpuList(gpuDoc.data().gpus || []);
        }
        
        // Check if user already has specs
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists() && userDoc.data().specs) {
            const userSpecs = userDoc.data().specs;
            setSpecs(userSpecs);
            setHasSpecs(true);
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

  // Handle CPU input change and filtering
  const handleCpuChange = (value) => {
    setSpecs(prev => ({ ...prev, cpu: value }));
    
    if (value.length > 0) {
      const filtered = cpuList.filter(cpu =>
        cpu.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 results
      setFilteredCpus(filtered);
      setShowCpuDropdown(true);
    } else {
      setShowCpuDropdown(false);
    }
  };

  // Handle GPU input change and filtering
  const handleGpuChange = (value) => {
    setSpecs(prev => ({ ...prev, gpu: value }));
    
    if (value.length > 0) {
      const filtered = gpuList.filter(gpu =>
        gpu.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 results
      setFilteredGpus(filtered);
      setShowGpuDropdown(true);
    } else {
      setShowGpuDropdown(false);
    }
  };

  // Handle CPU selection from dropdown
  const selectCpu = (cpu) => {
    setSpecs(prev => ({ ...prev, cpu }));
    setShowCpuDropdown(false);
  };

  // Handle GPU selection from dropdown
  const selectGpu = (gpu) => {
    setSpecs(prev => ({ ...prev, gpu: `${gpu.name} (${gpu.vram}GB VRAM)` }));
    setShowGpuDropdown(false);
  };

  // Save or update user specs
  const handleSaveSpecs = async () => {
    if (!specs.cpu || !specs.gpu || !specs.ram || !specs.resolution) {
      alert("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      
      if (hasSpecs) {
        // Update existing specs
        await updateDoc(userRef, {
          specs: specs,
          specsUpdatedAt: new Date()
        });
      } else {
        // Add new specs
        await updateDoc(userRef, {
          specs: specs,
          specsCreatedAt: new Date()
        });
        setHasSpecs(true);
      }
      
      alert(hasSpecs ? "Specs updated successfully!" : "Specs added successfully!");
    } catch (error) {
      console.error("Error saving specs:", error);
      alert("Failed to save specs. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.log("Failed to logout:", error);
    }
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Redirect if not logged in
  if (!currentUser) {
    navigate("/");
    return null;
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
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
      <div className="button-container">
        <button className="btn">Profile</button>
        <button className="btn-red" onClick={handleLogout}>
          Logout
        </button>
      </div>
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
              {/* CPU Input with Autocomplete */}
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

              {/* GPU Input with Autocomplete */}
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

              {/* RAM Dropdown */}
              <div className="specs-item">
                <label>RAM:</label>
                <select
                  value={specs.ram}
                  onChange={(e) => setSpecs(prev => ({ ...prev, ram: e.target.value }))}
                >
                  <option value="">Select RAM</option>
                  {ramOptions.map((ram) => (
                    <option key={ram} value={ram}>
                      {ram}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolution Dropdown */}
              <div className="specs-item">
                <label>Resolution:</label>
                <select
                  value={specs.resolution}
                  onChange={(e) => setSpecs(prev => ({ ...prev, resolution: e.target.value }))}
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
      </div>
    </div>
  );
};

export default ProfilePage;
