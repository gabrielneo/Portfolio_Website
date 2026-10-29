// Pointer and scroll state shared by BackgroundCanvas (writes) and the WebGL
// scene (reads every frame). Plain object, so input never re-renders React.
export const backgroundInput = { x: 0, y: 0, active: false, scrollVelocity: 0 };
