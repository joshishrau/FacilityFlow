import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./CalendarSlotSelector.css";

export default function CalendarSlotSelector({ onSelect }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSlots, setShowSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);

  // generate hourly slots (9 AM - 5 PM)
  const generateHourlySlots = (startHour, endHour) => {
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const start = `${hour.toString().padStart(2, "0")}:00`;
      const end = `${(hour + 1).toString().padStart(2, "0")}:00`;
      slots.push(`${start} - ${end}`);
    }
    return slots;
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setShowSlots(true);
    setSelectedSlots([]);
  };


  // Helper to get slot index
  const getSlotIndex = (slot) => slots.indexOf(slot);

  const handleSlotClick = (slot) => {
    if (selectedSlots.includes(slot)) {
      // Deselect
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      if (selectedSlots.length === 0) {
        setSelectedSlots([slot]);
      } else {
        // Check if new slot is continuous with current selection
        const indices = selectedSlots.map(getSlotIndex).sort((a, b) => a - b);
        const newIndex = getSlotIndex(slot);
        const min = indices[0];
        const max = indices[indices.length - 1];
        if (newIndex === min - 1 || newIndex === max + 1) {
          // Allow only if new slot is adjacent
          setSelectedSlots(
            newIndex < min
              ? [slot, ...selectedSlots]
              : [...selectedSlots, slot]
          );
        } else {
          // Not continuous, reset to only this slot
          setSelectedSlots([slot]);
        }
      }
    }
  };

  const slots = generateHourlySlots(9, 18); // 9 AM - 6 PM

  return (
    <div className="calendar-container">
      <h2>Select Date</h2>
      <Calendar 
        onChange={handleDateChange}
        value={selectedDate}
        minDate={new Date()}
      />

      {showSlots && (
        <div className="slots-container">
          <h3>Available Time Slots</h3>
          <div className="slots-grid">
            {slots.map((slot, index) => (
              <button
                key={index}
                className={`slot-btn ${selectedSlots.includes(slot) ? 'selected' : ''}`}
                onClick={() => handleSlotClick(slot)}
              >
                {slot}
              </button>
            ))}
          </div>

          <button
            className="confirm-btn"
            onClick={() => onSelect(selectedDate.toISOString().split("T")[0], selectedSlots)}
            disabled={selectedSlots.length === 0}
          >
            Confirm Slots
          </button>
        </div>
      )}
    </div>
  );
}
