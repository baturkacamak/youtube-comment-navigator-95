import React from 'react';
import Button from '../../shared/components/Button';
import { MdDriveFileRenameOutline, MdLogout, MdLogin } from 'react-icons/md'; // Importing Material Design icons
import { useTranslation } from 'react-i18next';

interface GoogleDriveButtonsProps {
    isSignedIn: boolean;
    signIn: () => void;
    signOut: () => void;
    handleSaveSettings: () => void;
    handleLoadSettings: () => void;
}

const GoogleDriveButtons: React.FC<GoogleDriveButtonsProps> = ({ isSignedIn, signIn, signOut, handleSaveSettings, handleLoadSettings }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-2">
            {isSignedIn ? (
                <>
                    <Button
                        onClick={handleSaveSettings}
                        label={t('Save Settings to Google Drive')}
                        className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-teal-600 transition-colors duration-200"
                        icon={MdDriveFileRenameOutline}
                    />
                    <Button
                        onClick={handleLoadSettings}
                        label={t('Load Settings from Google Drive')}
                        className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-teal-600 transition-colors duration-200"
                        icon={MdDriveFileRenameOutline}
                    />
                    <Button
                        onClick={signOut}
                        label={t('Sign Out')}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-red-600 transition-colors duration-200"
                        icon={MdLogout}
                    />
                </>
            ) : (
                <Button
                    onClick={signIn}
                    label={t('Sign In with Google')}
                    className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-teal-600 transition-colors duration-200"
                    icon={MdLogin}
                />
            )}
        </div>
    );
};

export default GoogleDriveButtons;
