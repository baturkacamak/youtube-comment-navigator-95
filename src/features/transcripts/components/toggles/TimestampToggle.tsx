import React from 'react';
import ToggleButton from "../../../shared/components/ToggleButton";

interface TimestampToggleProps {
    includeTimestamps: boolean;
    setIncludeTimestamps: (value: boolean) => void;
}

const TimestampToggle: React.FC<TimestampToggleProps> = ({ includeTimestamps, setIncludeTimestamps }) => {
    return (
        <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 select-none">
                {includeTimestamps ? 'Include timestamps' : 'Exclude timestamps'}
            </label>
            <ToggleButton
                isChecked={includeTimestamps}
                onToggle={() => setIncludeTimestamps(!includeTimestamps)}
            />
        </div>
    );
};

export default TimestampToggle;
