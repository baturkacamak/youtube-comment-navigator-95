import { useEffect, useState } from 'react';
import { gapi } from 'gapi-script';

const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

const useGoogleDrive = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [googleAuth, setGoogleAuth] = useState<gapi.auth2.GoogleAuth | null>(null);

    useEffect(() => {
        const initClient = () => {
            gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
            }).then(() => {
                const authInstance = gapi.auth2.getAuthInstance();
                setGoogleAuth(authInstance);
                setIsSignedIn(authInstance.isSignedIn.get());

                authInstance.isSignedIn.listen(setIsSignedIn);

                // Load the Drive API
                gapi.client.load('drive', 'v3', () => {
                    console.log('Google Drive API loaded.');
                });
            }).catch((error) => {
                console.error('Error initializing GAPI client:', error);
            });
        };

        gapi.load('client:auth2', initClient);
    }, []);

    const signIn = () => {
        if (googleAuth) {
            googleAuth.signIn();
        }
    };

    const signOut = () => {
        if (googleAuth) {
            googleAuth.signOut();
        }
    };

    const saveFile = (fileName: string, content: string) => {
        console.log(`Saving file: ${fileName} with content: ${content}`);
        // Placeholder implementation
        // Uncomment and implement later
        // const fileMetadata = {
        //     name: fileName,
        //     parents: ['appDataFolder'],
        // };
        // const media = {
        //     mimeType: 'application/json',
        //     body: content,
        // };
        // gapi.client.drive.files.create({
        //     resource: fileMetadata,
        //     media: media,
        //     fields: 'id',
        // }).then((response: any) => {
        //     console.log('File ID: ', response.result.id);
        // }).catch((error: any) => {
        //     console.error('Error saving file:', error);
        // });
    };

    const loadFile = (fileName: string) => {
        console.log(`Loading file: ${fileName}`);
        // Placeholder implementation
        // Uncomment and implement later
        // gapi.client.drive.files.list({
        //     spaces: 'appDataFolder',
        //     fields: 'files(id, name)',
        //     q: `name='${fileName}'`,
        // }).then((response: any) => {
        //     const files = response.result.files;
        //     if (files && files.length > 0) {
        //         const file = files[0];
        //         gapi.client.drive.files.get({
        //             fileId: file.id,
        //             alt: 'media',
        //         }).then((response: any) => {
        //             console.log('File content: ', response.body);
        //         }).catch((error: any) => {
        //             console.error('Error loading file:', error);
        //         });
        //     } else {
        //         console.log('No files found.');
        //     }
        // }).catch((error: any) => {
        //     console.error('Error listing files:', error);
        // });
    };

    return { isSignedIn, signIn, signOut, saveFile, loadFile };
};

export default useGoogleDrive;
