import React, { useState, useEffect, useMemo } from "react";
import { FaTimes } from "react-icons/fa";
import "../styles/moderator-home.css";

// =========================================================
// Post Modal Component (moved from ModeratorHome)
// =========================================================
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
  category,
  setCategory,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setImages([]);
    onClose();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handlePost();
    onClose();
  };

  return (
    <div className="post-modal-overlay" onClick={handleClose}>
      <div
        className="post-modal-content post-form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Create New Announcement</h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <input
            type="text"
            placeholder="Add a title (Optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Write something for the residents..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></textarea>
          <div className="setting-item-column">
            <label htmlFor="post-category">Category:</label>
            <select
              id="post-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="General">General</option>
              <option value="Event">Event</option>
              <option value="Health Advisory">Health Advisory</option>
              <option value="Safety Alert">Safety Alert</option>
              <option value="Community Program">Community Program</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <label htmlFor="file-upload" className="file-upload-label">
            <FaTimes style={{ visibility: "hidden" }} />
            <span style={{ flexGrow: 1, textAlign: "center" }}>
              Upload Image(s)
            </span>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <FaTimes style={{ transform: "rotate(45deg)" }} />
          </label>

          {images.length > 0 && renderPreviewImages(images)}

          <button type="submit" disabled={!description.trim()}>
            Post Announcement
          </button>
        </form>
      </div>
    </div>
  );
};

// =========================================================
// MAnnouncement Page
// =========================================================
function MAnnouncement() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [allPosts, setAllPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [postCategory, setPostCategory] = useState("General");

  const fetchAnnouncements = async () => {
    const userProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (!userProfile || !userProfile.barangay_id) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/announcements/barangay/${userProfile.barangay_id}`
      );
      if (res.ok) {
        const data = await res.json();
        setAllPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const fetchCategories = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/announcement-categories"
        );
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Handle image upload
  const handleImageChange = (e) => {
    if (e.target.files) {
      // For now, we are not handling file objects for upload, just previews.
      // This part needs to be connected to a file upload service.
      const filePreviews = Array.from(e.target.files).map((file) =>
        URL.createObjectURL(file)
      );
      setImages(filePreviews);
    }
  };

  // Handle posting an announcement
  const handlePost = async () => {
    // This should be connected to the POST /api/announcements endpoint
    console.log("Posting:", { title, description, category: postCategory });
    await fetchAnnouncements(); // Re-fetch after posting
  };

  // Image preview rendering
  const renderPreviewImages = (previewImages) => {
    const totalImages = previewImages.length;
    return (
      <div
        className={`preview-images preview-images-${Math.min(totalImages, 4)}`}
      >
        {previewImages.slice(0, 4).map((img, index) => (
          <img src={img} alt={`preview ${index}`} key={index} />
        ))}
        {previewImages.length > 4 && (
          <div className="preview-count-overlay">
            <span>+{previewImages.length - 4}</span>
          </div>
        )}
      </div>
    );
  };

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All") {
      return allPosts;
    }
    return allPosts.filter((post) => post.category === selectedCategory);
  }, [allPosts, selectedCategory]);

  return (
    <div className="announcement-page">
      <button
        className="create-announcement-btn"
        onClick={() => setIsPostModalOpen(true)}
      >
        + Create Announcement
      </button>

      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        images={images}
        setImages={setImages}
        handlePost={handlePost}
        handleImageChange={handleImageChange}
        renderPreviewImages={renderPreviewImages}
        category={postCategory}
        setCategory={setPostCategory}
      />

      <div className="announcement-controls">
        <h3>Filter Announcements</h3>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="announcements-feed">
        {filteredPosts.length === 0 ? (
          <p>No announcements yet.</p>
        ) : (
          filteredPosts.map((post) => (
            <div className="announcement-card" key={post.id}>
              {post.title && <h3>{post.title}</h3>}
              <p>{post.description}</p>
              {post.images && post.images.length > 0 && (
                <div className="announcement-images">
                  {post.images.map((img, idx) => (
                    <img key={idx} src={img} alt="announcement" />
                  ))}
                </div>
              )}
              <small>
                {post.author} • {new Date(post.created_at).toLocaleString()}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MAnnouncement;
