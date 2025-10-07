import React, { useState } from 'react';
import CalendarSlotSelector from './components/CalendarSlotSelector';
import FacilityFlowBookingForm from './components/FacilityFlowBookingForm';

function App() {
  const [selectedDateTime, setSelectedDateTime] = useState(null);

  // Callback when user selects a date and slots
  const handleDateTimeSelect = (date, slots) => {
    setSelectedDateTime({ date, slots });
  };

  return (
    <div>
      {/* <h1 style={{ textAlign: 'center' }}>Facility Flow Booking</h1> */}
      
      {!selectedDateTime ? (
        // Show calendar only if date/time not selected
        <CalendarSlotSelector onSelect={handleDateTimeSelect} />
      ) : (
        // Show booking form once date/time is selected
        <FacilityFlowBookingForm dateTime={selectedDateTime} />
      )}
    </div>
  );
}

export default App;
