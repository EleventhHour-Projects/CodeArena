# CodeArena: Matchmaking to Battle Completion Endpoints

This document provides a detailed list of all endpoints called throughout the lifecycle of a CodeArena battle, from the moment a user joins the matchmaking pool to the final storage of battle results.

---

## 1. Matchmaking Phase

### 1.1 Get Pool Size
Fetches the current number of players waiting in the matchmaking pool for each difficulty.
- **Method:** `GET`
- **Path:** `/api/matchmaking/poolsize`
- **Authentication:** None (Public)
- **Response Example:**
  ```json
  {
    "success": true,
    "easy": 5,
    "medium": 12,
    "hard": 3
  }
  ```

### 1.2 Register for Matchmaking
Registers the current authenticated user into a specific matchmaking pool.
- **Method:** `POST`
- **Path:** `/api/matchmaking/register`
- **Authentication:** Session (NextAuth)
- **Payload:**
  ```json
  {
    "difficulty": "medium" 
  }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1Ni...",
    "expires": "2026-04-14T17:40:00Z"
  }
  ```
  *(Note: The token is used for the websocket connection).*

### 1.3 Matchmaking Websocket
Real-time connection to the matchmaking service.
- **Protocol:** `WSS`
- **URL:** `wss://matchmake.codearena.pro/wss/matchmaking?token={TOKEN}&username={USERNAME}`
- **Behavior:** Once a match is found, the server emits a message (via internal logic) that triggers the frontend to redirect to the battle page using the generated `battleID`.

---

## 2. Battle Initialization Phase

### 2.1 Fetch Battle Metadata
Retrieves information about the battle, including players, start time, and assigned problem IDs.
- **Method:** `GET`
- **Path:** `/api/battle/[battleId]`
- **Authentication:** Session (NextAuth)
- **Response Example:**
  ```json
  {
    "success": true,
    "battle": {
      "_id": "661b...",
      "player1": "user_id_1",
      "player2": "user_id_2",
      "status": "Active",
      "startTime": "2026-04-14T17:30:00Z",
      "problems": [
        { "id": 101, "difficulty": "Medium" },
        { "id": 102, "difficulty": "Medium" }
      ]
    }
  }
  ```

### 2.2 Fetch Problem Details
Loads the descriptions, examples, and test cases for the problems assigned to the battle.
- **Method:** `GET`
- **Path:** `/api/battle/questions?ids=101,102`
- **Authentication:** Session (NextAuth)
- **Response Example:**
  ```json
  {
    "problems": [
      {
        "id": 101,
        "title": "Two Sum",
        "description": "...",
        "difficulty": "Medium",
        "testcases": [
          { "input": "[2,7,11,15]", "output": "[0,1]" }
        ]
      }
    ]
  }
  ```

---

## 3. Battle Loop Phase

### 3.1 Execute/Submit Code
Triggers code execution on the server. `type` can be `"Run"` or `"Submit"`.
- **Method:** `POST`
- **Path:** `/api/battle/exec-code`
- **Authentication:** Session (NextAuth)
- **Payload:**
  ```json
  {
    "code": "#include <iostream>...",
    "language": "cpp",
    "userId": "user_id_1",
    "battleId": "battle_id_123",
    "difficulty": "medium",
    "problemId": 101,
    "type": "Submit",
    "testcases": [] 
  }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "executionCode": {
      "_id": "exec_8899",
      "status": "Pending"
    }
  }
  ```

### 3.2 Poll Submission Status
Checks the result of a previous code execution.
- **Method:** `GET`
- **Path:** `/api/submission-status/[exec_id]`
- **Authentication:** Session (NextAuth)
- **Response Example (Pending):**
  ```json
  { "success": true, "status": "PENDING" }
  ```
- **Response Example (Completed):**
  ```json
  {
    "success": true,
    "status": "Accepted",
    "exec_time": 45,
    "memory": 12.5,
    "errorMsg": null
  }
  ```

### 3.3 Fetch Battle Progress
Tracks which problems have been solved by each player in the current battle.
- **Method:** `GET`
- **Path:** `/api/battle/[battleId]/progress`
- **Authentication:** Session (NextAuth)
- **Response Example:**
  ```json
  {
    "success": true,
    "player1Solved": [101],
    "player2Solved": []
  }
  ```

### 3.4 Battle Recording Flush
Sends chunks of replay data (code snapshots and events) every 30 seconds.
- **Method:** `POST`
- **Path:** `/api/battle/recording`
- **Authentication:** Session (NextAuth)
- **Payload:**
  ```json
  {
    "battleId": "...",
    "player1Id": "...",
    "snapshots": [
       { "timestamp": 12.5, "player1": { "code": "...", "problemIndex": 0 } }
    ],
    "final": false
  }
  ```

---

## 4. Draw & Surrender Phase (Real-time)

These actions are primarily handled via **Socket.IO** events but some involve API calls for persistence.

### 4.1 Draw Offer (API)
Persists a draw offer attempt.
- **Method:** `POST`
- **Path:** `/api/battle/draw-offer`
- **Payload:** `{ "battleId": "...", "userId": "..." }`
- **Response:** `{ "success": true, "count": 1 }`

### 4.2 WebSockets (Socket.IO)
- **JOIN_BATTLE:** `emit("JOIN_BATTLE", { battleId, userId })`
- **USER_RUN/RESULT/SOLVED:** Transmits progress to the opponent.
- **DRAW_REQUEST / DRAW_RESPONSE:** Handles draw negotiation.
- **USER_SURRENDER:** Emitted when a user quits.

---

## 5. Completion Phase

### 5.1 Finalize Battle
Calculates the final scores, updates Elo ratings, and marks the battle as completed.
- **Method:** `POST`
- **Path:** `/api/battle/complete`
- **Authentication:** Session (NextAuth)
- **Payload:**
  ```json
  {
    "battleId": "battle_id_123",
    "resultOverride": "player1" 
  }
  ```
- **Response Example:**
  ```json
  {
    "success": true,
    "result": "player1",
    "scoreA": 450,
    "scoreB": 120,
    "newRa": 1540,
    "newRb": 1460,
    "ratingChangeA": 25,
    "ratingChangeB": -25,
    "duration": { "hours": 0, "minutes": 15, "seconds": 30 }
  }
  ```
