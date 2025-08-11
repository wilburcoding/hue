# hue

## Backend TODO

- [] Handle user connecting and disconnecting
- [] Create games when threshold reached (with countdown)
- [] Emit game information to active players (etc. image url, live leaderboard)
- [] 

## Backend Events

Server emits:
- "game-start" `{"countdown": 5, ...state}`
- "game-update" `{"imageUrl": "...", "targetColor": {"r", ...}, "leaderboard": [{"name": "", "points": 100}], "endTime": 1754871193132}`
- "game-end" `{"leaderboard": [...]}`

Client emits:
- "join" `{"name": ""}` 
- "color-change" `{"color": {"r": 255, "g": 0, "b": 15}}`
