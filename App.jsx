  import React, { useState } from 'react';
  import CalendarSlotSelector from './components/CalendarSlotSelector';
import FacilityFlowBookingForm from './components/FacilityFlowBookingForm';


  function App() {
    const [selectedDateTime, setSelectedDateTime] = useState(null);

    // Callback when user selects a date and time
    const handleDateTimeSelect = (date, time) => {
      setSelectedDateTime({ date, time });
    };

    return (
      <div>
        <h1>Facility Flow Booking</h1>
        
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
