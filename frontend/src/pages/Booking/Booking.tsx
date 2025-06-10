// Booking.tsx - Production level seat booking with real-time availability
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

interface Seat {
  seatNumber: number;
  label: string;
  status: "available" | "booked" | "selected";
  price: number;
  className:
    | "Premium"
    | "Standard"
    | "Economy"
    | "First Class"
    | "Second Class"
    | "Economy Class"
    | "Premium Class"
    | "Business Class";
}

const seatColor: Record<string, string> = {
  available: "#22c55e",
  booked: "#ef4444",
  selected: "#3b82f6",
};

const Booking: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [vehicleType, setVehicleType] = useState<"bus" | "train" | "ferry">("bus");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [tripData, setTripData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes countdown
  const [showRoundTripPrompt, setShowRoundTripPrompt] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<Seat[]>([]);

  // Prevent round trip prompt if a round trip is already booked
  const isRoundTripBooked = () => {
    // Check if confirmationTrips in sessionStorage has two trips (round trip)
    try {
      const trips = JSON.parse(sessionStorage.getItem("confirmationTrips") || "null");
      return Array.isArray(trips) && trips.length === 2;
    } catch {
      return false;
    }
  };

  // Production-level seat reservation system
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const type = new URLSearchParams(location.search).get("type") || "";

  useEffect(() => {
    if ((type === "return" || type === "round") && !sessionStorage.getItem("outboundTrip")) {
      alert("Outbound trip not found. Please start a new round-trip booking.");
      navigate("/");
    }
  }, [type, navigate]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Session expired. Please search again.");
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);
  // Determine price based on class
  const getPrice = (_row: number, className: Seat["className"]) => {
    if (vehicleType === "bus") {
      if (className === "Premium") return 80;
      if (className === "Standard") return 50;
      return 30;
    }
    if (vehicleType === "train") {
      if (className === "First Class") return 200;
      if (className === "Second Class") return 120;
      return 60;
    }
    // ferry
    if (className === "Premium Class") return 150;
    if (className === "Business Class") return 100;
    return 40;
  };

  // Legacy fallback method for generating seats
  const generateSeats = (booked: number[], typeOverride: "bus" | "train" | "ferry") => {
    const newSeats: Seat[] = [];
    let seatNumber = 1;
    const type = typeOverride;

    if (type === "bus") {
      // 100 seats total: Premium (12), Standard (60), Economy (28)
      for (let row = 1; row <= 25; row++) {
        for (let colIndex = 0; colIndex < 4; colIndex++) {
          if (colIndex === 2) continue; // aisle gap
          const label = `${row}${["A", "B", "C", "D"][colIndex]}`;
          let className: Seat["className"] = "Economy";
          if (seatNumber <= 12) className = "Premium";
          else if (seatNumber <= 72) className = "Standard";

          newSeats.push({
            seatNumber,
            label,
            status: booked.includes(seatNumber) ? "booked" : "available",
            price: getPrice(row, className),
            className,
          });
          seatNumber++;
        }
      }
    } else if (type === "train") {
      // 350 seats: First Class (50), Second Class (120), Economy Class (180)
      for (let row = 1; row <= 35; row++) {
        for (let colIndex = 0; colIndex < 11; colIndex++) {
          if (colIndex === 5) continue; // aisle gap
          const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
          const label = `${row}${letters[colIndex]}`;
          let className: Seat["className"] = "Economy Class";
          if (seatNumber <= 50) className = "First Class";
          else if (seatNumber <= 170) className = "Second Class";

          newSeats.push({
            seatNumber,
            label,
            status: booked.includes(seatNumber) ? "booked" : "available",
            price: getPrice(row, className),
            className,
          });
          seatNumber++;
        }
      }
    } else if (type === "ferry") {
      // 338 seats: Premium Class (48), Business Class (90), Economy Class (200)
      for (let r = 0; r < 12; r++) {
        for (let c = 1; c <= 4; c++) {
          const label = `${String.fromCharCode(65 + r)}${c}`;
          newSeats.push({
            seatNumber,
            label,
            status: booked.includes(seatNumber) ? "booked" : "available",
            price: getPrice(r + 1, "Premium Class"),
            className: "Premium Class",
          });
          seatNumber++;
        }
      }
      // Business: next 90 seats
      for (let r = 12; r < 12 + 23; r++) {
        for (let c = 1; c <= 4; c++) {
          if (seatNumber > 48 + 90) break;
          const label = `${String.fromCharCode(65 + r)}${c}`;
          newSeats.push({
            seatNumber,
            label,
            status: booked.includes(seatNumber) ? "booked" : "available",
            price: getPrice(r + 1, "Business Class"),
            className: "Business Class",
          });
          seatNumber++;
        }
      }
      // Economy: remaining seats up to 338
      for (let r = 35; seatNumber <= 338; r++) {
        for (let c = 1; c <= 4; c++) {
          const label = `${String.fromCharCode(65 + r)}${c}`;
          newSeats.push({
            seatNumber,
            label,
            status: booked.includes(seatNumber) ? "booked" : "available",
            price: getPrice(r + 1, "Economy Class"),
            className: "Economy Class",
          });
          seatNumber++;
          if (seatNumber > 338) break;
        }
      }
    }

    setSeats(newSeats);
  };

  // Fetch trip & real-time seat availability
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get trip details
        const schedulesRes = await fetch("http://localhost:5000/api/schedules");
        const schedules = await schedulesRes.json();
        const trip = schedules.find((s: any) => String(s.id) === id);
        if (!trip) return;

        // Normalize vehicle type
        const vt = trip.vehicle_type.toLowerCase();
        if (vt === "bus" || vt === "train" || vt === "ferry") {
          setVehicleType(vt);
        } else {
          console.warn("Unexpected vehicle_type:", trip.vehicle_type);
        }

        setTripData(trip);

        // Get real-time seat layout with availability
        const seatLayoutRes = await fetch(
          `http://localhost:5000/api/schedules/${id}/seat-layout?vehicle_type=${vt}`
        );
        
        if (seatLayoutRes.ok) {
          const seatData = await seatLayoutRes.json();
          setSeats(seatData.seats);
          console.log(`📍 Loaded ${seatData.seats.length} seats, ${seatData.booked_count} booked, ${seatData.available_count} available`);
        } else {
          // Fallback to old method if new API fails
          console.warn("Real-time seat API failed, falling back to legacy method");
          const bookingsRes = await fetch("http://localhost:5000/api/bookings");
          const bookings = await bookingsRes.json();
          
          const booked = bookings
            .filter((b: any) => String(b.schedule_id) === id)
            .map((b: any) => b.seat_number);

          generateSeats(booked, vt as "bus" | "train" | "ferry");
        }
        
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
  }, [id]);

  // Production-level seat selection with real-time reservation
  const toggleSeat = async (num: number) => {
    const seat = seats.find((s) => s.seatNumber === num);
    if (!seat || seat.status === "booked") return;
    
    if (selectedSeats.includes(num)) {
      // Deselecting seat - release reservation
      const newSelected = selectedSeats.filter((n) => n !== num);
      setSelectedSeats(newSelected);
      
      // Release this seat
      try {
        await fetch(`http://localhost:5000/api/schedules/${id}/reserve-seats`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seat_numbers: [num],
            session_id: sessionId
          })
        });
        console.log(`🔓 Released reservation for seat ${num}`);
      } catch (err) {
        console.error('Failed to release seat reservation:', err);
      }
    } else {
      // Selecting seat - try to reserve it
      try {
        const response = await fetch(`http://localhost:5000/api/schedules/${id}/reserve-seats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seat_numbers: [num],
            session_id: sessionId,
            timeout_minutes: 10
          })
        });

        if (response.ok) {
          setSelectedSeats(prev => [...prev, num]);
          console.log(`🔒 Reserved seat ${num} for 10 minutes`);
        } else {
          const error = await response.json();
          alert(error.error || 'This seat is no longer available');
          
          // Refresh seat availability
          window.location.reload();
        }
      } catch (err) {
        console.error('Seat reservation failed:', err);
        alert('Unable to reserve seat. Please try again.');
      }
    }
  };

  // Render a seat or an empty placeholder if undefined
  const renderSeat = (seat?: Seat) => {
    if (!seat) {
      return <div style={{ width: 44, height: 44 }} />;
    }
    return (
      <button
        key={seat.seatNumber}
        onClick={() => toggleSeat(seat.seatNumber)}
        disabled={seat.status === "booked"}
        title={`Seat ${seat.label} (${seat.className}) — RM${seat.price}`}
        style={{
          width: 44,
          height: 44,
          backgroundColor: selectedSeats.includes(seat.seatNumber)
            ? seatColor.selected
            : seatColor[seat.status],
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 4,
          fontSize: "0.85rem",
          fontWeight: "bold",
          cursor: seat.status === "booked" ? "not-allowed" : "pointer",
        }}
      >
        {seat.label}
      </button>
    );
  };

  const renderClassLabel = (label: string, key: string) => (
    <div
      key={key}
      style={{
        textAlign: "center",
        fontWeight: "bold",
        margin: "16px 0 8px",
        fontSize: "1.1rem",
        color: "#374151",
      }}
    >
      {label}
    </div>
  );

  const renderLayout = () => {
    const layout: React.ReactElement[] = [];

    if (vehicleType === "bus") {
      // Bus layout rendering
      layout.push(renderClassLabel("Premium", "bus-premium"));
      const premiumSeats = seats.filter((s) => s.className === "Premium");
      for (let i = 0; i < premiumSeats.length; i += 3) {
        layout.push(
          <div
            key={`bus-premium-row-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {renderSeat(premiumSeats[i])}
              {renderSeat(premiumSeats[i + 1])}
            </div>
            <div style={{ width: 20 }} />
            {renderSeat(premiumSeats[i + 2])}
          </div>
        );
      }

      layout.push(renderClassLabel("Standard", "bus-standard"));
      const standardSeats = seats.filter((s) => s.className === "Standard");
      for (let i = 0; i < standardSeats.length; i += 3) {
        layout.push(
          <div
            key={`bus-standard-row-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {renderSeat(standardSeats[i])}
              {renderSeat(standardSeats[i + 1])}
            </div>
            <div style={{ width: 20 }} />
            {renderSeat(standardSeats[i + 2])}
          </div>
        );
      }

      layout.push(renderClassLabel("Economy", "bus-economy"));
      const economySeats = seats.filter((s) => s.className === "Economy");
      for (let i = 0; i < economySeats.length; i += 3) {
        layout.push(
          <div
            key={`bus-economy-row-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {renderSeat(economySeats[i])}
              {renderSeat(economySeats[i + 1])}
            </div>
            <div style={{ width: 20 }} />
            {renderSeat(economySeats[i + 2])}
          </div>
        );
      }
    }

    if (vehicleType === "train") {
      // Train layout rendering
      layout.push(renderClassLabel("First Class", "train-first"));
      const firstSeats = seats.filter((s) => s.className === "First Class");
      for (let i = 0; i < firstSeats.length; i += 5) {
        const chunk = firstSeats.slice(i, i + 5);
        layout.push(
          <div
            key={`train-first-rowA-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[0] && renderSeat(chunk[0])}
              {chunk[1] && renderSeat(chunk[1])}
            </div>
            <div style={{ width: 30 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[2] && renderSeat(chunk[2])}
              {chunk[3] && renderSeat(chunk[3])}
              {chunk[4] && renderSeat(chunk[4])}
            </div>
          </div>
        );
      }

      layout.push(renderClassLabel("Second Class", "train-second"));
      const secondSeats = seats.filter((s) => s.className === "Second Class");
      for (let i = 0; i < secondSeats.length; i += 5) {
        const chunk = secondSeats.slice(i, i + 5);
        layout.push(
          <div
            key={`train-second-rowB-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[0] && renderSeat(chunk[0])}
              {chunk[1] && renderSeat(chunk[1])}
            </div>
            <div style={{ width: 30 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[2] && renderSeat(chunk[2])}
              {chunk[3] && renderSeat(chunk[3])}
              {chunk[4] && renderSeat(chunk[4])}
            </div>
          </div>
        );
      }

      layout.push(renderClassLabel("Economy Class", "train-economy"));
      const economyTrainSeats = seats.filter((s) => s.className === "Economy Class");
      for (let i = 0; i < economyTrainSeats.length; i += 5) {
        const chunk = economyTrainSeats.slice(i, i + 5);
        layout.push(
          <div
            key={`train-economy-rowC-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[0] && renderSeat(chunk[0])}
              {chunk[1] && renderSeat(chunk[1])}
            </div>
            <div style={{ width: 30 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[2] && renderSeat(chunk[2])}
              {chunk[3] && renderSeat(chunk[3])}
              {chunk[4] && renderSeat(chunk[4])}
            </div>
          </div>
        );
      }
    }

    if (vehicleType === "ferry") {
      // Ferry layout rendering
      layout.push(renderClassLabel("Premium Class", "ferry-premium"));
      const premiumSeats = seats.filter((s) => s.className === "Premium Class");
      for (let i = 0; i < premiumSeats.length; i += 4) {
        const chunk = premiumSeats.slice(i, i + 4);
        layout.push(
          <div
            key={`ferry-premium-row-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[0] && renderSeat(chunk[0])}
              {chunk[1] && renderSeat(chunk[1])}
            </div>
            <div style={{ width: 20 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[2] && renderSeat(chunk[2])}
              {chunk[3] && renderSeat(chunk[3])}
            </div>
          </div>
        );
      }

      layout.push(renderClassLabel("Business Class", "ferry-business"));
      const businessSeats = seats.filter((s) => s.className === "Business Class");
      for (let i = 0; i < businessSeats.length; i += 4) {
        const chunk = businessSeats.slice(i, i + 4);
        layout.push(
          <div
            key={`ferry-business-row-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[0] && renderSeat(chunk[0])}
              {chunk[1] && renderSeat(chunk[1])}
            </div>
            <div style={{ width: 20 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[2] && renderSeat(chunk[2])}
              {chunk[3] && renderSeat(chunk[3])}
            </div>
          </div>
        );
      }

      layout.push(renderClassLabel("Economy Class", "ferry-economy"));
      const economySeats = seats.filter((s) => s.className === "Economy Class");
      for (let i = 0; i < economySeats.length; i += 4) {
        const chunk = economySeats.slice(i, i + 4);
        layout.push(
          <div
            key={`ferry-economy-row-${i}`}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[0] && renderSeat(chunk[0])}
              {chunk[1] && renderSeat(chunk[1])}
            </div>
            <div style={{ width: 20 }} />
            <div style={{ display: "flex", gap: 6 }}>
              {chunk[2] && renderSeat(chunk[2])}
              {chunk[3] && renderSeat(chunk[3])}
            </div>
          </div>
        );
      }
    }

    return layout;
  };

  // "Confirm Selection" handler - Navigate to confirmation page without booking
  const confirm = () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat.");
      return;
    }
    const selected = seats.filter((s) =>
      selectedSeats.includes(s.seatNumber)
    );
    setBookingDetails(selected);

    // Only show round trip prompt for one-way bookings, and only if a round trip is not already booked
    if ((type === "return" || type === "round") || isRoundTripBooked()) {
      // For return trips or if round trip is already booked, go straight to confirmation
      navigateToConfirmation(true, selected);
    } else {
      // For one-way trips, show round-trip prompt
      setShowRoundTripPrompt(true);
    }
  };

  // Navigate to confirmation page with trip data
  const navigateToConfirmation = (isReturn: boolean, seatsToBook: Seat[]) => {
    try {
      if (isReturn) {
        // Round-trip confirmation
        const raw = JSON.parse(sessionStorage.getItem("outboundTrip") || "{}");
        
        if (!raw.schedule_id || !raw.seat_numbers || !Array.isArray(raw.seat_numbers)) {
          throw new Error("Missing outbound trip data. Please reselect your trip.");
        }
        
        if (seatsToBook.length === 0) {
          throw new Error("Please select at least one seat for the return trip.");
        }

        // Clear outbound trip from storage since we're moving to confirmation
        sessionStorage.removeItem("outboundTrip");
        
        const returnLabels = seatsToBook.map(s => s.label);
        const returnPrice = seatsToBook.reduce((sum, s) => sum + s.price, 0);
        
        // Save trips to sessionStorage for refresh persistence
        sessionStorage.setItem("confirmationTrips", JSON.stringify([
          {
            schedule_id: Number(raw.schedule_id),
            type: raw.type,
            from: raw.from,
            to: raw.to,
            date: raw.date,
            seats: raw.seats,
            price: raw.price,
          },
          {
            schedule_id: Number(id),
            type: tripData.vehicle_type,
            from: tripData.destination_city,
            to: tripData.origin_city,
            date: new Date(tripData.departure_time).toISOString(),
            seats: returnLabels,
            price: returnPrice,
          },
        ]));
        navigate("/confirmation", {
          state: {
            trips: [
              {
                schedule_id: Number(raw.schedule_id),
                type: raw.type,
                from: raw.from,
                to: raw.to,
                date: raw.date,
                seats: raw.seats,
                price: raw.price,
              },
              {
                schedule_id: Number(id),
                type: tripData.vehicle_type,
                from: tripData.destination_city,
                to: tripData.origin_city,
                date: new Date(tripData.departure_time).toISOString(),
                seats: returnLabels,
                price: returnPrice,
              },
            ],
          },
        });
      } else {
        // One-way confirmation
        // Save trips to sessionStorage for refresh persistence
        sessionStorage.setItem("confirmationTrips", JSON.stringify([
          {
            schedule_id: Number(id),
            type: tripData.vehicle_type,
            from: tripData.origin_city,
            to: tripData.destination_city,
            date: new Date(tripData.departure_time).toISOString(),
            seats: seatsToBook.map(s => s.label),
            price: seatsToBook.reduce((sum, s) => sum + s.price, 0),
          },
        ]));
        navigate("/confirmation", {
          state: {
            trips: [
              {
                schedule_id: Number(id),
                type: tripData.vehicle_type,
                from: tripData.origin_city,
                to: tripData.destination_city,
                date: new Date(tripData.departure_time).toISOString(),
                seats: seatsToBook.map(s => s.label),
                price: seatsToBook.reduce((sum, s) => sum + s.price, 0),
              },
            ],
          },
        });
      }
    } catch (err: any) {
      console.error("Navigation error:", err);
      alert(err.message || "Unable to proceed to confirmation. Please try again.");
    }
  };
  // Clean up seat reservations when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Release any reserved seats when leaving the page
      if (selectedSeats.length > 0) {
        fetch(`http://localhost:5000/api/schedules/${id}/reserve-seats`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seat_numbers: selectedSeats,
            session_id: sessionId
          })
        }).catch(err => console.error('Failed to release seat reservations on unmount:', err));
      }
    };
  }, [selectedSeats, id, sessionId]);

  // Auto-release seats and refresh seat map on timer expiry
  useEffect(() => {
    if (timeLeft === 0 && selectedSeats.length > 0) {
      // Release all reserved seats for this session
      fetch(`http://localhost:5000/api/schedules/${id}/reserve-seats`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_numbers: selectedSeats,
          session_id: sessionId
        })
      })
        .then(() => {
          setSelectedSeats([]);
          // Optionally, refetch seat layout
          window.location.reload();
        })
        .catch(err => {
          console.error('Failed to auto-release seats on timeout:', err);
          window.location.reload();
        });
    }
  }, [timeLeft, selectedSeats, id, sessionId]);

  // Poll seat status every 10 seconds for real-time updates
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const seatLayoutRes = await fetch(
          `http://localhost:5000/api/schedules/${id}/seat-layout?vehicle_type=${vehicleType}`
        );
        if (seatLayoutRes.ok) {
          const seatData = await seatLayoutRes.json();
          setSeats(seatData.seats);
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 10000);
    return () => clearInterval(poll);
  }, [id, vehicleType]);

  // Seat legend for all vehicle types
  const renderSeatLegend = () => (
    <div style={{ display: 'flex', gap: 24, margin: '16px 0', alignItems: 'center' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 24, height: 24, background: seatColor.available, borderRadius: 4, display: 'inline-block', border: '1px solid #333' }} />
        Available
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 24, height: 24, background: seatColor.selected, borderRadius: 4, display: 'inline-block', border: '1px solid #333' }} />
        Selected
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 24, height: 24, background: seatColor.booked, borderRadius: 4, display: 'inline-block', border: '1px solid #333' }} />
        Booked
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 24, height: 24, background: '#fbbf24', borderRadius: 4, display: 'inline-block', border: '1px solid #333' }} />
        Reserved (by others)
      </span>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 960, margin: "auto" }}>
      <h2 style={{ marginBottom: 16 }}>
        {type === "return" ? "Return Trip" : "Outgoing Trip"} –{" "}
        {tripData ? `${tripData.origin_city} → ${tripData.destination_city}` : "Loading..."}
      </h2>

      <div style={{ marginBottom: 16, fontSize: "0.9rem", color: "#6b7280" }}>
        Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
      </div>
      {renderSeatLegend()}

      <div style={{ marginBottom: 16, fontWeight: "bold" }}>
        Total: RM{" "}
        <strong>
          {selectedSeats.reduce((sum, id) => {
            const s = seats.find((x) => x.seatNumber === id);
            return sum + (s?.price || 0);
          }, 0)}
        </strong>
      </div>

      <div>{renderLayout()}</div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button
          onClick={confirm}
          style={{
            backgroundColor: "#10b981",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 6,
            border: "none",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Confirm Selection
        </button>
      </div>

      {type !== "return" && type !== "round" && showRoundTripPrompt && !isRoundTripBooked() && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 30,
              borderRadius: 8,
              maxWidth: 400,
              width: "90%",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>
              Do you want to book a return trip?
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <button
                onClick={() => {
                  // Store all outbound trip details
                  const outboundSeats = bookingDetails.map((s) => s.label);
                  const outboundSeatNumbers = bookingDetails.map((s) => s.seatNumber);
                  const outboundPrice = bookingDetails.reduce((sum, s) => sum + s.price, 0);
                  
                  sessionStorage.setItem("outboundTrip", JSON.stringify({
                    schedule_id: id,
                    seats: outboundSeats,
                    seat_numbers: outboundSeatNumbers,
                    from: tripData.origin_city,
                    to: tripData.destination_city,
                    date: tripData.departure_time,
                    price: outboundPrice,
                    type: tripData.vehicle_type,
                  }));

                  const returnDate = new Date();
                  returnDate.setDate(returnDate.getDate() + 1);
                  const q = new URLSearchParams({
                    mode: tripData.vehicle_type,
                    from: tripData.destination_city,
                    to: tripData.origin_city,
                    date: returnDate.toISOString().split("T")[0],
                    type: "return",
                  });
                  navigate(`/search?${q.toString()}`);
                }}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Yes
              </button>
              <button
                onClick={() => {
                  navigateToConfirmation(false, bookingDetails);
                }}
                style={{
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                No, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
