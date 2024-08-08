interface Window {
    YT: {
        Player: new (id: string) => {
            seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        };
    };
    ytInitialData: any;
}
