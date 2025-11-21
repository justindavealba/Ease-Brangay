import React, { useState } from "react";
import {
  FaEdit,
  FaTrash,
  FaEllipsisH,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../styles/comment-section.css";
import defaultAvatar from "../assets/default-avatar.png";
const CommentSection = ({
  postId,
  comments,
  handleAddComment,
  onEditComment,
  onDeleteComment,
  onReportComment,
  currentUser, // Expecting the full user profile object now
}) => {
  const [newComment, setNewComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      handleAddComment(postId, currentUser.id, newComment);
      setNewComment("");
    }
  };

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState(null);
  const [editedText, setEditedText] = useState("");

  const handleEditClick = (comment) => {
    setEditingCommentId(comment.id);
    setEditedText(comment.text);
  };

  const handleCancelEdit = () => {
    setOpenMenuCommentId(null);
    setEditingCommentId(null);
    setEditedText("");
  };

  const handleSaveEdit = () => {
    onEditComment(editingCommentId, editedText, currentUser.id);
    handleCancelEdit();
    setOpenMenuCommentId(null);
  };

  const commentsToDisplay = showAllComments ? comments : comments.slice(-3);
  const hasMoreComments = comments.length > 3;

  return (
    <div className="comment-section">
      <h5 className="comment-section-header">Comments ({comments.length})</h5>

      {hasMoreComments && !showAllComments && (
        <button
          onClick={() => setShowAllComments(true)}
          className="view-more-comments-btn show"
        >
          View more {comments.length - 3} comments...
        </button>
      )}

      <div className="comments-list">
        {commentsToDisplay.map((comment, index) => (
          <div key={comment.id || index} className="comment">
            <img
              src={
                comment.authorAvatar
                  ? `http://localhost:5000${comment.authorAvatar}`
                  : defaultAvatar
              }
              alt="comment author avatar"
              className="comment-avatar"
            />
            {editingCommentId === comment.id ? (
              <div className="comment-edit-form">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
                <div className="comment-edit-actions">
                  <button onClick={handleSaveEdit}>Save</button>
                  <button onClick={handleCancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="comment-body">
                <div className="comment-text-content">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-date">
                    {new Date(comment.date).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <p className="comment-text">{comment.text}</p>
                </div>
                <div className="comment-options-container">
                  <button
                    className="comment-options-btn"
                    onClick={() =>
                      setOpenMenuCommentId(
                        openMenuCommentId === comment.id ? null : comment.id
                      )
                    }
                  >
                    <FaEllipsisH />
                  </button>
                  {openMenuCommentId === comment.id &&
                    (comment.authorId === currentUser.id ? (
                      <div className="comment-actions-menu">
                        <button
                          onClick={() => {
                            handleEditClick(comment);
                            setOpenMenuCommentId(null);
                          }}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => {
                            onDeleteComment(comment.id);
                            setOpenMenuCommentId(null);
                          }}
                          className="delete"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    ) : (
                      <div className="comment-actions-menu">
                        <button
                          onClick={() => {
                            onReportComment(comment);
                            setOpenMenuCommentId(null);
                          }}
                          className="report"
                        >
                          <FaExclamationTriangle /> Report
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMoreComments && showAllComments && (
        <button
          onClick={() => setShowAllComments(false)}
          className="view-more-comments-btn hide"
        >
          Hide comments
        </button>
      )}

      <form onSubmit={handleSubmit} className="comment-form">
        <input
          type="text"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button type="submit" disabled={!newComment.trim()}>
          Post
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
