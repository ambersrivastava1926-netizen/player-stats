import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND = "http://127.0.0.1:8000"; // Backend URL

export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    sport: "cricket",
    team: "",
    age: "",
    matches: "",
    runs_or_goals: "",
    average: "",
  });
  const [editing, setEditing] = useState(null);

  // Load all players
  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      const res = await axios.get(`${BACKEND}/players`);
      setPlayers(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load players");
    }
  }

  // Handle input change
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Create new player
  async function handleSubmit(e) {
    e.preventDefault();
    const stats = {
      matches: Number(formData.matches),
      runs_or_goals: Number(formData.runs_or_goals),
      average: Number(formData.average),
    };

    try {
      await axios.post(`${BACKEND}/players`, {
        name: formData.name,
        sport: formData.sport,
        team: formData.team,
        age: Number(formData.age),
        stats,
      });
      setFormData({
        name: "",
        sport: "cricket",
        team: "",
        age: "",
        matches: "",
        runs_or_goals: "",
        average: "",
      });
      loadPlayers();
    } catch (err) {
      console.error(err);
      alert("Error adding player");
    }
  }

  // Delete player
  async function deletePlayer(id) {
    if (!window.confirm("Are you sure you want to delete this player?")) return;
    try {
      await axios.delete(`${BACKEND}/players/${id}`);
      loadPlayers();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  // Begin edit
  function startEdit(player) {
    setEditing(player);
    setFormData({
      name: player.name,
      sport: player.sport,
      team: player.team,
      age: player.age,
      matches: player.stats.matches,
      runs_or_goals: player.stats.runs_or_goals,
      average: player.stats.average,
    });
  }

  // Save edit
  async function saveEdit(e) {
    e.preventDefault();
    const stats = {
      matches: Number(formData.matches),
      runs_or_goals: Number(formData.runs_or_goals),
      average: Number(formData.average),
    };

    try {
      await axios.patch(`${BACKEND}/players/${editing.id}/stats`, stats);
      setEditing(null);
      setFormData({
        name: "",
        sport: "cricket",
        team: "",
        age: "",
        matches: "",
        runs_or_goals: "",
        average: "",
      });
      loadPlayers();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    }
  }

  if (loading) return <h2>Loading players...</h2>;
  if (error) return <h2 style={{ color: "red" }}>{error}</h2>;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Realtime Player Stats (CRUD + SQLite)</h1>

      <form onSubmit={editing ? saveEdit : handleSubmit}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <input placeholder="Name" name="name" value={formData.name} onChange={handleChange} required />
        <select name="sport" value={formData.sport} onChange={handleChange}>
          <option value="cricket">Cricket</option>
          <option value="football">Football</option>
        </select>
        <input placeholder="Team" name="team" value={formData.team} onChange={handleChange} />
        <input placeholder="Age" name="age" type="number" value={formData.age} onChange={handleChange} />
        <input placeholder="Matches" name="matches" type="number" value={formData.matches} onChange={handleChange} />
        <input placeholder={formData.sport === "cricket" ? "Runs" : "Goals"} name="runs_or_goals" type="number" value={formData.runs_or_goals} onChange={handleChange} />
        <input placeholder="Average" name="average" type="number" step="0.01" value={formData.average} onChange={handleChange} />
        <button type="submit" style={{ background: editing ? "#2e7d32" : "#1976d2", color: "white", border: "none", borderRadius: 6 }}>
          {editing ? "Save Changes" : "Add Player"}
        </button>
      </form>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 16,
      }}>
        {players.map((p) => (
          <div key={p.id} style={{
            background: "white",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
          }}>
            <h3>{p.name} <span style={{ color: "#777" }}>({p.sport})</span></h3>
            <div>Team: {p.team}</div>
            <div>Age: {p.age}</div>
            <div>Matches: {p.stats.matches}</div>
            <div>{p.sport === "cricket" ? "Runs" : "Goals"}: {p.stats.runs_or_goals}</div>
            <div>Average: {p.stats.average}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={() => startEdit(p)} style={{ background: "#ff9800", border: "none", color: "white", padding: "4px 8px", borderRadius: 4 }}>Edit</button>
              <button onClick={() => deletePlayer(p.id)} style={{ background: "#d32f2f", border: "none", color: "white", padding: "4px 8px", borderRadius: 4 }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
