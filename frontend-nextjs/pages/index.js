import { useEffect, useState } from "react";
import SlotGrid from "../components/SlotGrid";
import { fetchAvailableSlots, fetchLots } from "../lib/api";

export default function HomePage() {
  const [lots, setLots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedLot, setSelectedLot] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLots()
      .then(setLots)
      .catch((err) => setError(err.message));
  }, []);

  async function loadSlots() {
    if (!selectedLot) {
      setError("Please select a parking lot first");
      return;
    }
    try {
      setError("");
      const parsed = await fetchAvailableSlots(selectedLot);
      setSlots(parsed);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h1>Parking Management Dashboard</h1>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="lot">Parking Lot: </label>
        <select id="lot" value={selectedLot} onChange={(e) => setSelectedLot(e.target.value)}>
          <option value="">Select lot</option>
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="vehicle">Vehicle ID: </label>
        <input
          id="vehicle"
          type="number"
          placeholder="e.g. 1"
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
        />
      </div>

      <button onClick={loadSlots}>Load Available Slots</button>

      {error ? <p style={{ color: "red" }}>{error}</p> : null}

      <h3 style={{ marginTop: 24 }}>Slots</h3>
      <SlotGrid slots={slots} selectedVehicle={selectedVehicle} fetchSlots={loadSlots} />
    </main>
  );
}
