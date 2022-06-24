export interface Settings {
    cutoff: number;
    cutoffSmoothness: number;
    time: number;
    scale: number;
    showGroundTexture: boolean;
    minTreeCloseness: number;
    showTreePositions: boolean;
    timeOfDay: number;
};

export const defaultSettings: Settings = {
    time: 0,
    scale: 1,
    cutoff: 0.5,
    cutoffSmoothness: 0.2,
    showGroundTexture: true,
    minTreeCloseness: 5.0,
    showTreePositions: true,
    timeOfDay: 9.0
};
