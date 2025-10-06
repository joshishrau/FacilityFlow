import React, { useState } from "react";
import Calendar from "react-calendar";
import { useNavigate } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import "./CalendarSlotSelector.css";

export default function CalendarSlotSelector() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSlots, setShowSlots] = useState(false);
  const navigate = useNavigate();

  // generate hourly slots (9 AM - 5 PM as example)
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
    navigate("/booking-form", {
      state: {
        event_date: selectedDate.toISOString().split("T")[0],
        slot,
      },
    });
  };

  const slots = generateHourlySlots(9, 18); // 9 AM - 6 PM

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

