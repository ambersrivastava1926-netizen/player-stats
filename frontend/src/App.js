

import React, { useEffect, useState } from "react";
import axios from "axios";

// 🔧 IMPORTANT: put your working backend URL here
// If you're testing locally, use:  "http://127.0.0.1:8000"
// If deployed on Render, use your Render URL (the one that works in browser with /players)
const BACKEND = "https://player-stats-cw41.onrender.com";  // Backend URL

function getRunsLabel(sport) {
  return sport === "cricket" ? "Runs" : "Goals";
}

// Simple avatar based on player name (no backend change needed)
function getPlayerAvatar(name) {
  const encoded = encodeURIComponent(name || "Player");
  return `https://ui-avatars.com/api/?name=${encoded}&background=random&rounded=true`;
}

export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sport: "cricket",
    team: "",
    age: "",
    matches: "",
    runs_or_goals: "",
    average: "",
  });
  const [editing, setEditing] = useState(null); // player being edited (stats only)

  // UI controls
  const [search, setSearch] = useState("");
  const [filterSport, setFilterSport] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Load all players from backend
  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND}/players`);
      setPlayers(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load players");
      setLoading(false);
    }
  }

  // Handle input change for add/edit form
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Add new player
  async function handleSubmit(e) {
    e.preventDefault();
    const stats = {
      matches: Number(formData.matches) || 0,
      runs_or_goals: Number(formData.runs_or_goals) || 0,
      average: Number(formData.average) || 0,
    };

    try {
      await axios.post(`${BACKEND}/players`, {
        name: formData.name,
        sport: formData.sport,
        team: formData.team,
        age: Number(formData.age) || 0,
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
      await loadPlayers();
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
      await loadPlayers();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  // Start editing stats of a player
  function startEdit(player) {
    setEditing(player);
    setFormData({
      name: player.name,                     // shown but not changed in backend
      sport: player.sport,
      team: player.team,                     // shown but not changed in backend
      age: player.age,                       // shown but not changed in backend
      matches: player.stats.matches,
      runs_or_goals: player.stats.runs_or_goals,
      average: player.stats.average,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Save edited stats (name/team/age remain same in backend)
  async function saveEdit(e) {
    e.preventDefault();
    const stats = {
      matches: Number(formData.matches) || 0,
      runs_or_goals: Number(formData.runs_or_goals) || 0,
      average: Number(formData.average) || 0,
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
      await loadPlayers();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes");
    }
  }

  // Derived: filter, search, sort
  const filteredSortedPlayers = (() => {
    let list = [...players];

    // filter by sport
    if (filterSport !== "all") {
      list = list.filter((p) => p.sport === filterSport);
    }

    // search by name or team
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.team || "").toLowerCase().includes(q)
        );
      });
    }

    // sort
    list.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case "matches":
          valA = a.stats.matches;
          valB = b.stats.matches;
          break;
        case "runs":
          valA = a.stats.runs_or_goals;
          valB = b.stats.runs_or_goals;
          break;
        case "average":
          valA = a.stats.average;
          valB = b.stats.average;
          break;
        case "name":
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  })();

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedPlayers.length / PAGE_SIZE)
  );
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const visiblePlayers = filteredSortedPlayers.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  function changeSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortLabel(field, label) {
    if (sortField !== field) return label;
    return sortDir === "asc" ? `${label} ↑` : `${label} ↓`;
  }

  if (loading) return <h2 className="center">Loading players...</h2>;
  if (error) return <h2 className="center error">{error}</h2>;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Realtime Player Stats</h1>
          <p className="subtitle">
            Search, filter and manage cricket &amp; football player statistics.
          </p>
        </div>
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="Search by name or team..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <select
            className="select"
            value={filterSport}
            onChange={(e) => {
              setFilterSport(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Sports</option>
            <option value="cricket">Cricket</option>
            <option value="football">Football</option>
          </select>
          <div className="sort-buttons">
            <button onClick={() => changeSort("name")}>
              {sortLabel("name", "Name")}
            </button>
            <button onClick={() => changeSort("matches")}>
              {sortLabel("matches", "Matches")}
            </button>
            <button onClick={() => changeSort("runs")}>
              {sortLabel("runs", "Runs/Goals")}
            </button>
            <button onClick={() => changeSort("average")}>
              {sortLabel("average", "Average")}
            </button>
          </div>
        </div>
      </header>

      {/* Add / Edit form */}
      <section className="card form-card">
        <h2>{editing ? `Edit Stats: ${editing.name}` : "Add New Player"}</h2>
        <form
          className="form-grid"
          onSubmit={editing ? saveEdit : handleSubmit}
        >
          <input
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={!!editing} // editing stats only
          />
          <select
            name="sport"
            value={formData.sport}
            onChange={handleChange}
            disabled={!!editing}
          >
            <option value="cricket">Cricket</option>
            <option value="football">Football</option>
          </select>
          <input
            name="team"
            placeholder="Team / Club"
            value={formData.team}
            onChange={handleChange}
            disabled={!!editing}
          />
          <input
            name="age"
            type="number"
            placeholder="Age"
            value={formData.age}
            onChange={handleChange}
            disabled={!!editing}
          />
          <input
            name="matches"
            type="number"
            placeholder="Matches"
            value={formData.matches}
            onChange={handleChange}
          />
          <input
            name="runs_or_goals"
            type="number"
            placeholder={
              formData.sport === "cricket" ? "Total Runs" : "Total Goals"
            }
            value={formData.runs_or_goals}
            onChange={handleChange}
          />
          <input
            name="average"
            type="number"
            step="0.01"
            placeholder="Average"
            value={formData.average}
            onChange={handleChange}
          />
          <div className="form-buttons">
            <button type="submit">
              {editing ? "Save Stats" : "Add Player"}
            </button>
            {editing && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
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
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Player grid */}
      <section>
        <div className="list-header">
          <h2>
            Players ({filteredSortedPlayers.length}
            {filterSport !== "all" ? ` • ${filterSport}` : ""})
          </h2>
          <div className="page-info">
            Page {page} of {totalPages}
          </div>
        </div>

        {filteredSortedPlayers.length === 0 ? (
          <p className="center">No players match your filters yet.</p>
        ) : (
          <>
            <div className="grid">
              {visiblePlayers.map((p) => (
                <div key={p.id} className="card player-card">
                  <div className="player-header">
                    <img
                      src={getPlayerAvatar(p.name)}
                      alt={p.name}
                      className="avatar"
                    />
                    <div>
                      <h3>{p.name}</h3>
                      <div className={`sport-tag ${p.sport}`}>
                        {p.sport.toUpperCase()}
                      </div>
                      <div className="team">
                        {p.team || "No team specified"}
                      </div>
                    </div>
                  </div>
                  <div className="stats-row">
                    <div>
                      <span className="label">Matches</span>
                      <span className="value">{p.stats.matches}</span>
                    </div>
                    <div>
                      <span className="label">{getRunsLabel(p.sport)}</span>
                      <span className="value">{p.stats.runs_or_goals}</span>
                    </div>
                    <div>
                      <span className="label">Average</span>
                      <span className="value">{p.stats.average}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => startEdit(p)}>Edit Stats</button>
                    <button
                      className="danger"
                      onClick={() => deletePlayer(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            <div className="pagination">
              <button
                disabled={page <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={n === page ? "active" : ""}
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}


