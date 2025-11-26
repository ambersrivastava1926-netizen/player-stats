


// If you're testing locally, use:  "http://127.0.0.1:8000"
// If deployed on Render, use your Render URL (the one that works in browser with /players)
//const BACKEND = "https://player-stats-cw41.onrender.com";  // Backend URL

import React, { useEffect, useState } from "react";
import axios from "axios";

// 🛠️ IMPORTANT: Change this to your real backend URL
// For local testing, use: "http://127.0.0.1:8000"
const BACKEND = "https://player-stats-cw41.onrender.com";  // Backend URL

// ---------- Helper functions ----------
function getRunsLabel(sport) {
  return sport === "cricket" ? "Runs" : "Goals";
}

function getPlayerAvatar(name) {
  const encoded = encodeURIComponent(name || "Player");
  return `https://ui-avatars.com/api/?name=${encoded}&background=random&rounded=true`;
}

// ---------- Main Component ----------
export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form + UI states
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
  const [search, setSearch] = useState("");
  const [filterSport, setFilterSport] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // new for CSV + photos
  const [csvFile, setCsvFile] = useState(null);

  // ---------- Load data ----------
  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND}/players`);
      // handle both array or {players: [...]}
      const list = Array.isArray(res.data) ? res.data : res.data.players;
      setPlayers(list || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load players");
      setLoading(false);
    }
  }

  // ---------- Add / Edit / Delete ----------
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

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

  async function deletePlayer(id) {
    if (!window.confirm("Delete this player?")) return;
    try {
      await axios.delete(`${BACKEND}/players/${id}`);
      await loadPlayers();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  // ---------- Filtering / Sorting ----------
  const filteredSortedPlayers = (() => {
    let list = [...players];
    if (filterSport !== "all") list = list.filter((p) => p.sport === filterSport);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.team || "").toLowerCase().includes(q));

    list.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case "matches": valA = a.stats.matches; valB = b.stats.matches; break;
        case "runs": valA = a.stats.runs_or_goals; valB = b.stats.runs_or_goals; break;
        case "average": valA = a.stats.average; valB = b.stats.average; break;
        default: valA = a.name.toLowerCase(); valB = b.name.toLowerCase();
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  })();

  // ---------- Pagination ----------
  const totalPages = Math.max(1, Math.ceil(filteredSortedPlayers.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const visiblePlayers = filteredSortedPlayers.slice(startIndex, startIndex + PAGE_SIZE);

  function changeSort(field) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }
  function sortLabel(field, label) {
    if (sortField !== field) return label;
    return sortDir === "asc" ? `${label} ↑` : `${label} ↓`;
  }

  // ---------- Loading / Error ----------
  if (loading) return <h2 className="center">Loading players...</h2>;
  if (error) return <h2 className="center error">{error}</h2>;

  // ---------- JSX ----------
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Realtime Player Stats</h1>
          <p className="subtitle">
            Search, filter and manage cricket & football player statistics.
          </p>
        </div>

        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="Search by name or team..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <select
            className="select"
            value={filterSport}
            onChange={(e) => { setFilterSport(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Sports</option>
            <option value="cricket">Cricket</option>
            <option value="football">Football</option>
          </select>
          <div className="sort-buttons">
            <button onClick={() => changeSort("name")}>{sortLabel("name", "Name")}</button>
            <button onClick={() => changeSort("matches")}>{sortLabel("matches", "Matches")}</button>
            <button onClick={() => changeSort("runs")}>{sortLabel("runs", "Runs/Goals")}</button>
            <button onClick={() => changeSort("average")}>{sortLabel("average", "Average")}</button>
          </div>
        </div>
      </header>

      {/* ---------- Add / Edit form ---------- */}
      <section className="card form-card">
        <h2>{editing ? `Edit Stats: ${editing.name}` : "Add New Player"}</h2>
        <form className="form-grid" onSubmit={editing ? saveEdit : handleSubmit}>
          <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} required disabled={!!editing}/>
          <select name="sport" value={formData.sport} onChange={handleChange} disabled={!!editing}>
            <option value="cricket">Cricket</option>
            <option value="football">Football</option>
          </select>
          <input name="team" placeholder="Team / Club" value={formData.team} onChange={handleChange} disabled={!!editing}/>
          <input name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} disabled={!!editing}/>
          <input name="matches" type="number" placeholder="Matches" value={formData.matches} onChange={handleChange}/>
          <input name="runs_or_goals" type="number" placeholder={formData.sport === "cricket" ? "Total Runs" : "Total Goals"} value={formData.runs_or_goals} onChange={handleChange}/>
          <input name="average" type="number" step="0.01" placeholder="Average" value={formData.average} onChange={handleChange}/>
          <div className="form-buttons">
            <button type="submit">{editing ? "Save Stats" : "Add Player"}</button>
            {editing && (
              <button type="button" className="secondary" onClick={() => {
                setEditing(null);
                setFormData({ name: "", sport: "cricket", team: "", age: "", matches: "", runs_or_goals: "", average: "" });
              }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ---------- CSV Upload ---------- */}
      <section className="card form-card">
        <h2>Bulk Import Players (CSV)</h2>
        <p className="subtitle">
          Upload CSV with: name, sport, team, age, matches, runs_or_goals, average, photo_url
        </p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!csvFile) return alert("Select a CSV file first");
          const formData = new FormData();
          formData.append("file", csvFile);
          try {
            await axios.post(`${BACKEND}/players/upload_csv`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            alert("CSV uploaded successfully!");
            setCsvFile(null);
            await loadPlayers();
          } catch (err) {
            console.error(err);
            alert("Error uploading CSV");
          }
        }}>
          <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])}/>
          <button type="submit">Upload CSV</button>
        </form>
      </section>

      {/* ---------- Player Cards ---------- */}
      <section>
        <div className="list-header">
          <h2>
            Players ({filteredSortedPlayers.length}
            {filterSport !== "all" ? ` • ${filterSport}` : ""})
          </h2>
          <div className="page-info">Page {page} of {totalPages}</div>
        </div>

        {filteredSortedPlayers.length === 0 ? (
          <p className="center">No players match your filters yet.</p>
        ) : (
          <>
            <div className="grid">
              {visiblePlayers.map((p) => (
                <div key={p.id} className="card player-card">
                  <div className="player-header">
                    <img src={p.photo_url || getPlayerAvatar(p.name)} alt={p.name} className="avatar" />
                    <div>
                      <h3>{p.name}</h3>
                      <div className={`sport-tag ${p.sport}`}>{p.sport.toUpperCase()}</div>
                      <div className="team">{p.team || "No team specified"}</div>
                    </div>
                  </div>
                  <div className="stats-row">
                    <div><span className="label">Matches</span><span className="value">{p.stats.matches}</span></div>
                    <div><span className="label">{getRunsLabel(p.sport)}</span><span className="value">{p.stats.runs_or_goals}</span></div>
                    <div><span className="label">Average</span><span className="value">{p.stats.average}</span></div>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => startEdit(p)}>Edit Stats</button>
                    <button onClick={async () => {
                      const url = prompt("Enter photo URL for this player:", p.photo_url || "");
                      if (url) {
                        try {
                          await axios.patch(`${BACKEND}/players/${p.id}/photo`, null, { params: { photo_url: url } });
                          await loadPlayers();
                        } catch (err) { alert("Failed to update photo"); }
                      }
                    }}>Add/Update Photo</button>
                    <button className="danger" onClick={() => deletePlayer(p.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setCurrentPage((p) => p - 1)}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? "active" : ""} onClick={() => setCurrentPage(n)}>{n}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
