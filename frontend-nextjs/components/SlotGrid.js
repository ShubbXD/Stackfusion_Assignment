import { createBooking } from "../lib/api";

export default function SlotGrid({ slots, selectedVehicle, fetchSlots }) {
  async function handleBook(slotId) {
    if (!selectedVehicle) {
      alert("Select a vehicle first");
      return;
    }

    try {
      await createBooking({
        vehicle: Number(selectedVehicle),
        slot: slotId
      });
      alert("Booking created");
      fetchSlots();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!slots.length) {
    return <p>No slots found.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(3, 1fr)" }}>
      {slots.map((slot) => (
        <button key={slot.id} onClick={() => handleBook(slot.id)}>
          Slot {slot.number} - {slot.is_occupied ? "Occupied" : "Free"}
        </button>
      ))}
    </div>
  );
}
