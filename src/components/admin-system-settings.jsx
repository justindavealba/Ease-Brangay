import React, { useState, useEffect } from "react";
import { FaCog, FaDatabase, FaPlug, FaPlus, FaTrash } from "react-icons/fa";
import { logAuditAction } from "../utils/auditLogger";
import "../styles/system-settings-modal.css";

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content system-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="admin-close-btn">
            &times;
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
};

const EditableList = ({
  title,
  items,
  onAdd,
  onRemove,
  onSelectItem,

  selectedItem,
}) => {
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAdd(newItem.trim());
    setNewItem("");
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    handleAdd();
  };

  return (
    <div className="editable-list-section">
      <h4>{title}</h4>
      <ul className="editable-list">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={selectedItem?.id === item.id ? "selected" : ""}
            onClick={() => onSelectItem && onSelectItem(item)}
          >
            <span className="item-name">{item.name}</span>

            <button onClick={() => onRemove(item)}>
              <FaTrash />
            </button>
          </li>
        ))}
      </ul>
      <form className="add-item-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`New ${title.slice(0, -1)}...`}
        />
        <button type="submit">
          <FaPlus /> Add
        </button>
      </form>
    </div>
  );
};

const SystemSettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("general");

  // State for location management
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [captainNameInput, setCaptainNameInput] = useState("");

  // State for category management
  const [announcementCategories, setAnnouncementCategories] = useState([]);
  const [reportCategories, setReportCategories] = useState([]);

  // State for content management
  const [termsContent, setTermsContent] = useState("");

  const fetchData = async () => {
    try {
      const [munRes, annCatRes, repCatRes] = await Promise.all([
        fetch("http://localhost:5000/api/municipalities"),
        fetch("http://localhost:5000/api/announcement-categories"),
        fetch("http://localhost:5000/api/report-categories"),
      ]);
      const munData = await munRes.json();
      const annCatData = await annCatRes.json();
      const repCatData = await repCatRes.json();

      setMunicipalities(munData);
      setAnnouncementCategories(annCatData);
      setReportCategories(repCatData);
    } catch (error) {
      console.error("Failed to fetch initial settings:", error);
      alert("Could not load system settings from the database.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset selections when modal opens
      setSelectedMunicipality(null);
      setSelectedBarangay(null);
      setBarangays([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchBarangays = async () => {
      if (selectedMunicipality) {
        try {
          const response = await fetch(
            `http://localhost:5000/api/barangays/${selectedMunicipality.id}`
          );
          const data = await response.json();
          setBarangays(data);
        } catch (error) {
          console.error("Failed to fetch barangays:", error);
          setBarangays([]);
        }
      } else {
        setSelectedBarangay(null);
        setBarangays([]);
      }
    };
    fetchBarangays();
  }, [selectedMunicipality]);
  // Effect to update the captain name input when a new barangay is selected
  useEffect(() => {
    if (selectedBarangay) {
      setCaptainNameInput(selectedBarangay.captain_name || "");
    }
  }, [selectedBarangay]);
  const handleAdd = async (endpoint, body, onSuccess) => {
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to add item.");
      const newItem = await response.json();
      onSuccess(newItem);
      logAuditAction(
        "System Setting Added",
        { type: endpoint, name: body.name },
        "admin"
      );
    } catch (error) {
      console.error(error);
      alert("Error adding item.");
    }
  };

  const handleRemove = async (endpoint, id, onSuccess) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    try {
      const response = await fetch(`http://localhost:5000${endpoint}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove item.");
      onSuccess(id);
      logAuditAction("System Setting Removed", { type: endpoint, id }, "admin");
    } catch (error) {
      console.error(error);
      alert("Error removing item.");
    }
  };

  const handleAddMunicipality = (municipality) => {
    handleAdd("/api/municipalities", { name: municipality }, (newItem) => {
      setMunicipalities((prev) => [...prev, newItem]);
    });
  };

  const handleRemoveMunicipality = (municipality) => {
    handleRemove("/api/municipalities", municipality.id, (removedId) => {
      setMunicipalities((prev) => prev.filter((m) => m.id !== removedId));
      if (selectedMunicipality?.id === removedId) {
        setSelectedMunicipality(null);
        setSelectedBarangay(null);
      }
    });
  };

  const handleAddBarangay = (barangay) => {
    if (!selectedMunicipality) return;
    handleAdd(
      "/api/barangays",
      { name: barangay, municipality_id: selectedMunicipality.id },
      (newItem) => {
        setBarangays((prev) => [...prev, newItem]);
      }
    );
  };

  const handleRemoveBarangay = (barangay) => {
    handleRemove("/api/barangays", barangay.id, (removedId) => {
      setBarangays((prev) => prev.filter((b) => b.id !== removedId));
    });
  };

  const handleAddAnnCategory = (name) => {
    handleAdd("/api/announcement-categories", { name }, (newItem) => {
      setAnnouncementCategories((prev) => [...prev, newItem]);
    });
  };
  const handleUpdateBarangayCaptain = async (barangay, newCaptainName) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/barangays/${barangay.id}/captain`,

        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ captainName: newCaptainName }),
        }
      );
      if (!response.ok) throw new Error("Failed to update captain name.");
      // Optimistically update local state
      setBarangays((prev) =>
        prev.map((b) =>
          b.id === barangay.id ? { ...b, captain_name: newCaptainName } : b
        )
      );
      // Also update the selected barangay to reflect the change immediately in the input
      setSelectedBarangay((prev) => ({
        ...prev,
        captain_name: newCaptainName,
      }));
      alert("Barangay captain's name saved successfully!"); // Provide user feedback
    } catch (error) {
      console.error(error);
      alert("Error updating captain name.");
    }
  };

  const handleRemoveAnnCategory = (category) => {
    handleRemove("/api/announcement-categories", category.id, (removedId) => {
      setAnnouncementCategories((prev) =>
        prev.filter((c) => c.id !== removedId)
      );
    });
  };

  const handleAddRepCategory = (name) => {
    handleAdd("/api/report-categories", { name }, (newItem) => {
      setReportCategories((prev) => [...prev, newItem]);
    });
  };

  const handleRemoveRepCategory = (category) => {
    handleRemove("/api/report-categories", category.id, (removedId) => {
      setReportCategories((prev) => prev.filter((c) => c.id !== removedId));
    });
  };

  const handleSaveTerms = () => {
    // This part would require a new endpoint to save large text content.
    // For now, we'll just log it and show an alert.
    logAuditAction("Updated Terms and Conditions", {}, "admin");
    alert("Terms and Conditions have been updated.");
  };

  const handlePurgeAnnouncements = () => {
    if (
      window.confirm(
        "Are you sure you want to delete all announcements older than one year? This action cannot be undone."
      )
    ) {
      // This would be a backend endpoint, e.g., POST /api/announcements/purge
      logAuditAction("Purged Old Announcements", {}, "admin");
      alert(`This would purge old announcements in a real database setup.`);
    }
  };

  const handlePurgeArchivedReports = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all archived reports? This action cannot be undone."
      )
    ) {
      // This would be a backend endpoint, e.g., POST /api/reports/purge-archived
      logAuditAction("Purged Archived Reports", {}, "admin");
      alert(`This would purge archived reports in a real database setup.`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Configuration & Settings"
    >
      <div className="system-settings-tabs">
        <button
          onClick={() => setActiveTab("general")}
          className={activeTab === "general" ? "active" : ""}
        >
          <FaCog /> General Settings
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={activeTab === "content" ? "active" : ""}
        >
          <FaDatabase /> Content & Data
        </button>
      </div>

      <div className="system-settings-tab-content">
        {activeTab === "general" && (
          <div className="general-settings-grid">
            <div className="location-manager three-column">
              <EditableList
                title="Municipalities"
                items={municipalities}
                onAdd={handleAddMunicipality}
                onRemove={(item) => handleRemoveMunicipality(item)}
                onSelectItem={(item) => {
                  setSelectedMunicipality(item);
                  setSelectedBarangay(null); // Reset barangay selection
                }}
                selectedItem={selectedMunicipality}
              />
              <div className="barangay-column">
                {selectedMunicipality ? (
                  <EditableList
                    title={`Barangays in ${selectedMunicipality.name}`}
                    items={barangays}
                    onAdd={handleAddBarangay}
                    onRemove={handleRemoveBarangay}
                    onSelectItem={setSelectedBarangay}
                    selectedItem={selectedBarangay}
                  />
                ) : (
                  <div className="placeholder-section">
                    Select a municipality to view its barangays.
                  </div>
                )}
              </div>
              <div className="captain-column">
                {selectedBarangay ? (
                  <div className="editable-list-section captain-editor-section">
                    <h4>Captain for {selectedBarangay.name}</h4>
                    {selectedBarangay.captain_name ? (
                      <ul className="editable-list">
                        <li>
                          <span className="item-name">
                            {selectedBarangay.captain_name}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdateBarangayCaptain(selectedBarangay, "")
                            }
                          >
                            <FaTrash />
                          </button>
                        </li>
                      </ul>
                    ) : (
                      <form
                        className="add-item-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleUpdateBarangayCaptain(
                            selectedBarangay,
                            captainNameInput
                          );
                        }}
                      >
                        <input
                          type="text"
                          className="captain-name-input"
                          placeholder="Enter Captain's Name"
                          value={captainNameInput}
                          onChange={(e) => setCaptainNameInput(e.target.value)}
                        />
                        <button type="submit">
                          <FaPlus /> Add
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="placeholder-section">
                    Select a barangay to edit its captain's name.
                  </div>
                )}
              </div>
            </div>
            <EditableList
              title="Announcement Categories"
              items={announcementCategories}
              onAdd={handleAddAnnCategory}
              onRemove={handleRemoveAnnCategory}
            />
            <EditableList
              title="Report Categories"
              items={reportCategories}
              onAdd={handleAddRepCategory}
              onRemove={handleRemoveRepCategory}
            />
          </div>
        )}

        {activeTab === "content" && (
          <div className="content-management-container">
            <div className="data-purge-section">
              <h4>Data Management</h4>
              <div className="purge-action">
                <p>Delete all announcements older than one year.</p>
                <button
                  className="purge-btn"
                  onClick={handlePurgeAnnouncements}
                >
                  Purge Old Announcements
                </button>
              </div>
              <div className="purge-action">
                <p>Permanently delete all reports marked as 'archived'.</p>
                <button
                  className="purge-btn"
                  onClick={handlePurgeArchivedReports}
                >
                  Purge Archived Reports
                </button>
              </div>
            </div>

            <div className="terms-editor-section">
              <h4>Terms and Conditions</h4>
              <textarea
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                placeholder="Enter the content for your Terms and Conditions..."
              />
              <button className="save-terms-btn" onClick={handleSaveTerms}>
                Save Terms
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SystemSettingsModal;
