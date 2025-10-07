import React, { useState, useEffect } from "react";
import "./FacilityFlowBookingForm.css";

export default function FacilityFlowBookingForm({ dateTime }) {
  const [formData, setFormData] = useState({
    department: "",
    event_name: "",
    event_date: "",
    slots: [],
    visitors: "",
    total_persons: "",
    faculty_staff: "",
    contact_number: "",
    peon_name: ""
  });

  useEffect(() => {
    if (dateTime) {
      setFormData({
        ...formData,
        event_date: dateTime.date,
        slots: dateTime.slots
      });
    }
  }, [dateTime]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Booking submitted:", formData);
    alert("Booking Submitted!");
  };

  return (
    <div className="form-container">
      <form className="booking-form" onSubmit={handleSubmit}>
        <h2>Facility Flow - Event Booking</h2>
        <label>Day/Date:</label>
        <input type="date" name="event_date" value={formData.event_date} readOnly />

        <label>Selected Slots:</label>
        <input type="text" name="slots" value={formData.slots.join(", ")} readOnly />

        <label>Name of Department:</label>
        <input type="text" name="department" value={formData.department} onChange={handleChange} required />

        <label>Name of Event:</label>
        <input type="text" name="event_name" value={formData.event_name} onChange={handleChange} required />

        <label>Visitors:</label>
        <textarea name="visitors" value={formData.visitors} onChange={handleChange} required></textarea>

        <label>Total Persons:</label>
        <input type="number" name="total_persons" value={formData.total_persons} onChange={handleChange} required />

        <label>Faculty & Staff Deputed:</label>
        <textarea name="faculty_staff" value={formData.faculty_staff} onChange={handleChange} required></textarea>

        <label>Contact Number:</label>
        <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} required />

        <label>Peon/Attendant:</label>
        <input type="text" name="peon_name" value={formData.peon_name} onChange={handleChange} required />

        <button type="submit">Submit Booking</button>
      </form>
    </div>
  );
}
