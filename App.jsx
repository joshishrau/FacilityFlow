import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CalendarSlotSelector from "./components/CalendarSlotSelector";
import FacilityFlowBookingForm from "./components/FacilityFlowBookingForm";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CalendarSlotSelector />} />
        <Route path="/booking-form" element={<FacilityFlowBookingForm />} />
      </Routes>
    </Router>
  );
}

export default App;

