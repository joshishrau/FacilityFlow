import React, { useState } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import "./CalendarSlotSelector.css";

export default function CalendarSlotSelector({ onSelect }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSlots, setShowSlots] = useState(false);

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
  };

  const handleSlotClick = (slot) => {
    // Pass selected date and slot to App.jsx
    onSelect(selectedDate.toISOString().split("T")[0], slot);
  };

  const slots = generateHourlySlots(9, 18);

  return (
    <div className="calendar-container">
      <h2>Select Date</h2>
      <Calendar onChange={handleDateChange} value={selectedDate} />

      {showSlots && (
        <div className="slots-container">
          <h3>Available Time Slots</h3>
          <div className="slots-grid">
            {slots.map((slot, index) => (
              <button
                key={index}
                className="slot-btn"
                onClick={() => handleSlotClick(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
