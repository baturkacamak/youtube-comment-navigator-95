import React from 'react';
import CopyToClipboardButton from "../../../shared/components/CopyToClipboardButton";

interface CopyButtonProps {
    textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
    return (
        <CopyToClipboardButton textToCopy={textToCopy} />
    );
};

export default CopyButton;
