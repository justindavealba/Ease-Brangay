import React, { useState, useEffect } from "react";
import { FaTimes, FaUpload, FaChevronDown } from "react-icons/fa";
import "../styles/moderator-home.css";
import "../styles/m-create-post.css";

const PostModal = ({
  isOpen,
  onClose,
  title,
  setTitle,
  description,
  setDescription,
  images,
  setImages,
  handlePost,
  handleImageChange,
  renderPreviewImages,
  editingPost,
  category,
  setCategory,
}) => {
  const [postCategories, setPostCategories] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const fetchAnnouncementCategories = async () => {
        try {
          const response = await fetch(
            "http://localhost:5000/api/announcement-categories"
          );
          if (!response.ok) {
            throw new Error("Failed to fetch announcement categories");
          }
          const data = await response.json();
          setPostCategories(data.map((cat) => cat.name)); // We only need the names for the dropdown
        } catch (error) {
          console.error("Error fetching announcement categories:", error);
          // Fallback to default categories if fetch fails
          const defaultCategories = [
            "General",
            "Event",
            "Health Advisory",
            "Safety Alert",
            "Community Program",
            "Traffic Update",
            "Weather Alert",
            "Maintenance Notice",
            "Other",
          ];
          setPostCategories(defaultCategories);
        }
      };
      fetchAnnouncementCategories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // This function resets the form fields and closes the modal.
  const handleClose = () => {
    setTitle("");
    setDescription("");
    setImages([]);
    setCategory("General"); // Reset to default
    onClose();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handlePost(); // This now handles both create and update
    // onClose is called inside handlePost after logic is complete
  };

  return (
    <div className="post-modal-overlay" onClick={handleClose}>
      <div
        className="post-modal-content post-form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            {editingPost ? "Edit Announcement" : "Create new Announcement"}
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="form-group category-group">
            <label htmlFor="post-category">Category</label>
            <div className="select-wrapper">
              <select
                id="post-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {postCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <FaChevronDown className="select-arrow-icon" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="post-title">Title (Optional)</label>
            <input
              id="post-title"
              type="text"
              placeholder="Add a title (Optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-description">Description</label>
            <textarea
              id="post-description"
              placeholder="Write something for the residents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Attachments</label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload" className="file-upload-label">
              <FaUpload />
              <span>Upload Image(s)</span>
            </label>
          </div>

          {images.length > 0 && renderPreviewImages(images)}

          <div className="modal-footer">
            <button type="submit" disabled={!description.trim()}>
              {editingPost ? "Save Changes" : "Post Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
