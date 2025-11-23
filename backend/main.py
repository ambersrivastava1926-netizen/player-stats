from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import List, Dict, Any, Optional
import asyncio
import uuid

# ==============================================================
# Database Models
# ==============================================================

class StatsBase(SQLModel):
    matches: int = 0
    runs_or_goals: int = 0
    average: float = 0.0

class Player(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    sport: str
    team: str = ""
    age: int = 0
    matches: int = 0
    runs_or_goals: int = 0
    average: float = 0.0

# ==============================================================
# Database setup
# ==============================================================

DATABASE_URL = "sqlite:///players.db"
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

# ==============================================================
# FastAPI setup
# ==============================================================

app = FastAPI(title="Realtime Player Stats API (SQLite)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================
# WebSocket Manager
# ==============================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        async with self.lock:
            to_remove = []
            for conn in list(self.active_connections):
                try:
                    await conn.send_json(message)
                except Exception:
                    to_remove.append(conn)
            for r in to_remove:
                if r in self.active_connections:
                    self.active_connections.remove(r)

manager = ConnectionManager()

# ==============================================================
# Helper functions
# ==============================================================

def get_session():
    return Session(engine)

def player_to_dict(p: Player):
    return {
        "id": p.id,
        "name": p.name,
        "sport": p.sport,
        "team": p.team,
        "age": p.age,
        "stats": {
            "matches": p.matches,
            "runs_or_goals": p.runs_or_goals,
            "average": p.average,
        },
    }

# ==============================================================
# Routes
# ==============================================================

@app.on_event("startup")
def startup():
    init_db()
    # seed initial data if db empty
    with get_session() as session:
        existing = session.exec(select(Player)).all()
        if not existing:
            players = [
                Player(name="Virat Kohli", sport="cricket", team="India", age=36,
                       matches=260, runs_or_goals=12040, average=59.3),
                Player(name="Lionel Messi", sport="football", team="Inter Miami", age=37,
                       matches=1000, runs_or_goals=820, average=0.82)
            ]
            session.add_all(players)
            session.commit()
            print("✅ Database seeded with sample players.")

@app.get("/players")
def list_players(sport: Optional[str] = None):
    with get_session() as session:
        query = select(Player)
        if sport:
            query = query.where(Player.sport == sport)
        result = session.exec(query).all()
        return [player_to_dict(p) for p in result]

@app.get("/players/{player_id}")
def get_player(player_id: str):
    with get_session() as session:
        p = session.get(Player, player_id)
        if not p:
            raise HTTPException(404, "Player not found")
        return player_to_dict(p)

@app.post("/players")
async def create_player(data: Dict[str, Any]):
    with get_session() as session:
        p = Player(
            name=data["name"],
            sport=data["sport"],
            team=data.get("team", ""),
            age=data.get("age", 0),
            matches=data["stats"]["matches"],
            runs_or_goals=data["stats"]["runs_or_goals"],
            average=data["stats"]["average"],
        )
        session.add(p)
        session.commit()
        session.refresh(p)
        await manager.broadcast({"type": "player_created", "player": player_to_dict(p)})
        return player_to_dict(p)

@app.patch("/players/{player_id}/stats")
async def update_stats(player_id: str, stats: StatsBase):
    with get_session() as session:
        p = session.get(Player, player_id)
        if not p:
            raise HTTPException(404, "Player not found")
        p.matches = stats.matches
        p.runs_or_goals = stats.runs_or_goals
        p.average = stats.average
        session.add(p)
        session.commit()
        session.refresh(p)
        await manager.broadcast({"type": "stats_updated", "player": player_to_dict(p)})
        return player_to_dict(p)

@app.delete("/players/{player_id}")
async def delete_player(player_id: str):
    with get_session() as session:
        p = session.get(Player, player_id)
        if not p:
            raise HTTPException(404, "Player not found")
        session.delete(p)
        session.commit()
        await manager.broadcast({"type": "player_deleted", "player_id": player_id})
        return {"ok": True}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    with get_session() as session:
        all_players = session.exec(select(Player)).all()
        await websocket.send_json({"type": "init", "players": [player_to_dict(p) for p in all_players]})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
