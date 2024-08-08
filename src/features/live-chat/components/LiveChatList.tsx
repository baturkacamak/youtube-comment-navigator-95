import React from "react";

const LiveChatItem: React.FC<{ time: string, user: string, message: string }> = ({ time, user, message }) => {
    return (
        <div>
            <strong>{user}</strong>: {message} <span>{time}</span>
        </div>
    );
};

export default LiveChatItem;

// Add this line
export {};
