import React from "react";
import { useFetchLiveChat } from "../hooks/useFetchLiveChat";
import LiveChatList from "./LiveChatList";

const LiveChat: React.FC<{ videoId: string }> = ({ videoId }) => {
    const liveChatData = useFetchLiveChat(videoId);

    return (
        <div>
            <h2>Live Chat</h2>
            <LiveChatList chatData={liveChatData} />
        </div>
    );
};

export default LiveChat;

// Add this line
export {};
