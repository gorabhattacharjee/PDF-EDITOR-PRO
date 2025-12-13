import React from "react";
import { useUIStore } from "@/stores/useUIStore";

const CommentsPanel: React.FC = () => {
  const { isCommentsPanelOpen, toggleCommentsPanel } = useUIStore();

  if (!isCommentsPanelOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "50px",
        right: 0,
        width: "300px",
        height: "calc(100% - 50px)",
        backgroundColor: "#f0f0f0",
        borderLeft: "1px solid #ccc",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3>Comments</h3>
        <button onClick={toggleCommentsPanel}>Close</button>
      </div>
      <div>
        <p>No comments yet.</p>
      </div>
    </div>
  );
};

export default CommentsPanel;