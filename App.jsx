import React, { useState, useEffect } from "react";
import ModeratorHome from "./ModeratorHome";
import UserHome from "./UserHome";
import "./App.css";

function App() {
  const [posts, setPosts] = useState([]);

  // Load saved posts from localStorage
  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    setPosts(savedPosts);
  }, []);

  // Save posts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("posts", JSON.stringify(posts));
  }, [posts]);

  const handleNewPost = (post) => {
    setPosts([post, ...posts]); // add new post on top
  };

  return (
    <div className="app">
      {/* Moderator Side */}
      <ModeratorHome onPost={handleNewPost} />

      {/* User Side */}
      <UserHome posts={posts} />
    </div>
  );
}

export default App;
