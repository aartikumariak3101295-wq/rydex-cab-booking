import RideMap from "./RideMap";
import { useEffect, useState } from "react";
import "./App.css";


const rides = [
  {
    id: "bike",
    name: "Bike",
    description: "Quick solo trips",
    baseFare: 20,
    perKm: 8,
    minimumFare: 35,
    image:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "auto",
    name: "Auto",
    description: "Convenient city travel",
    baseFare: 25,
    perKm: 12,
    minimumFare: 50,
    image:
      "https://images.unsplash.com/photo-1593766827228-8737b1cd1479?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "mini",
    name: "Mini Cab",
    description: "Affordable car travel",
    baseFare: 35,
    perKm: 14,
    minimumFare: 70,
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "comfort",
    name: "Comfort Cab",
    description: "Extra space and comfort",
    baseFare: 50,
    perKm: 18,
    minimumFare: 100,
    image:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=80",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Luxury travel experience",
    baseFare: 100,
    perKm: 30,
    minimumFare: 200,
    image:
      "https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=80",
  },
];

const API_URL = "http://localhost:5000/api/bookings";

function calculateFare(ride, distance) {
  if (!ride || !Number.isFinite(distance) || distance <= 0) {
    return null;
  }

  return Math.ceil(
    Math.max(ride.minimumFare, ride.baseFare + distance * ride.perKm)
  );
}



async function geocodeLocation(address, signal) {
  const cleanAddress = address.trim().replace(/\s+/g, " ");

  if (!cleanAddress) {
    throw new Error("Please enter a pickup or destination.");
  }

  // Try the complete address first, then useful variations.
  const parts = cleanAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const queries = [
    cleanAddress,
    `${cleanAddress}, India`,
    ...(parts.length > 1
      ? [
          `${parts.slice(0, 3).join(", ")}, India`,
          `${parts.slice(-3).join(", ")}, India`,
        ]
      : []),
  ];

  let lastError = null;

  for (const query of [...new Set(queries)]) {
    if (signal?.aborted) {
      throw new DOMException("Search cancelled", "AbortError");
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        limit: "5",
        countrycodes: "in",
        addressdetails: "1",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { signal }
      );

      if (!response.ok) {
        lastError = new Error("Location search is temporarily unavailable.");
        continue;
      }

      const results = await response.json();

      if (results.length > 0) {
  const result = results[0];

  const lat = Number(result.lat);
  const lon = Number(result.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    continue;
  }

  return {
    lat,
    lon,
    label: result.display_name,
    matchedQuery: query,
  };
}

    } catch (err) {
      if (err.name === "AbortError") throw err;
      lastError = err;
    }
  }

  if (lastError && !/Location search/.test(lastError.message)) {
    throw new Error(
      "Location search failed. Please check your internet and try again."
    );
  }

  throw new Error(
    `We couldn't find "${cleanAddress}". Try adding its area, city or PIN code.`
  );
}



async function getRoadDistance(pickup, dropoff, signal) {
  const [from, to] = await Promise.all([
    geocodeLocation(pickup, signal),
    geocodeLocation(dropoff, signal),
  ]);

  const routeUrl =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lon},${from.lat};${to.lon},${to.lat}` +
    `?overview=false&alternatives=false&steps=false`;

  const response = await fetch(routeUrl, { signal });

  if (!response.ok) {
    throw new Error("Unable to calculate the road distance.");
  }

  const data = await response.json();
  console.log("Rydex OSRM route response:", {
  code: data.code,
  distanceMeters: data.routes?.[0]?.distance,
  durationSeconds: data.routes?.[0]?.duration,
  pickupCoordinates: from,
  destinationCoordinates: to,
});

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No driving route found for these locations.");
  }

  return {
  distanceKm: data.routes[0].distance / 1000,
  durationMinutes: data.routes[0].duration / 60,
  pickupLabel: from.label,
  dropoffLabel: to.label,
  pickupCoords: {
    lat: from.lat,
    lon: from.lon,
  },
  dropoffCoords: {
    lat: to.lat,
    lon: to.lon,
  },
};
}

function App() {
  const [dark, setDark] = useState(true);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedRide, setSelectedRide] = useState("comfort");
  const [route, setRoute] = useState(null);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  
const [bookingHistory, setBookingHistory] = useState([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");
const [showHistory, setShowHistory] = useState(false);

  const selected = rides.find((ride) => ride.id === selectedRide);
  const fare = route ? calculateFare(selected, route.distanceKm) : null;

  // Automatically calculate road distance when both locations are entered.
  useEffect(() => {
    const from = pickup.trim();
    const to = dropoff.trim();

    setRoute(null);
    setError("");
    setBooking(null);

    if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
      setRouteLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(async () => {
      setRouteLoading(true);

      try {
        const result = await getRoadDistance(
          from,
          to,
          controller.signal
        );

        setRoute(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message ||
              "Could not calculate the route. Check your locations and try again."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }
    }, 1200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pickup, dropoff]);



async function loadBookingHistory() {
  setHistoryLoading(true);
  setHistoryError("");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Could not load booking history.");
    }

    const data = await response.json();

    const bookings = Array.isArray(data)
      ? data
      : data.bookings || [];

    setBookingHistory(bookings);
  } catch (err) {
    setHistoryError(
      "Unable to load booking history. Please check the backend connection."
    );
  } finally {
  setHistoryLoading(false);
}
}



  function swapLocations() {
    setPickup(dropoff);
    setDropoff(pickup);
  }

  function handleLocationChange(setter, value) {
    setter(value);
    setError("");
    setBooking(null);
  }

  async function bookRide(event) {
    event.preventDefault();

    if (isBooking) return;

    setError("");
    setBooking(null);

    const from = pickup.trim();
    const to = dropoff.trim();

    if (!from || !to) {
      setError("Please enter both pickup and destination.");
      return;
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      setError("Pickup and destination must be different.");
      return;
    }

    if (!selected) {
      setError("Please select a ride.");
      return;
    }

    if (routeLoading) {
      setError("Please wait while we calculate your route.");
      return;
    }

    if (!route || !fare) {
      setError(
        "Road distance is not available yet. Check both locations and try again."
      );
      return;
    }

    setIsBooking(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup: from,
          dropoff: to,
          rideType: selected.name,
          fare,
          distanceKm: Number(route.distanceKm.toFixed(2)),
          durationMinutes: Math.round(route.durationMinutes),
          pricing: {
            baseFare: selected.baseFare,
            perKm: selected.perKm,
            minimumFare: selected.minimumFare,
          },
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not save your booking.");
      }

      const saved = data.booking || data;

      setBooking({
        id:
          saved.id ||
          saved._id ||
          saved.bookingId ||
          `RYD-${Date.now().toString().slice(-7)}`,
        pickup: saved.pickup || from,
        dropoff: saved.dropoff || to,
        ride: saved.ride || saved.rideType || selected.name,
        fare: saved.fare ?? fare,
        distanceKm: saved.distanceKm ?? route.distanceKm,
        durationMinutes:
          saved.durationMinutes ?? route.durationMinutes,
      });
      await loadBookingHistory();

      
      



    } catch (err) {
      console.error("Booking error:", err);

      setError(
        err instanceof TypeError || err.message === "Failed to fetch"
          ? "Backend connection failed. Check that your backend is running on port 5000 and CORS is enabled."
          : err.message
      );
    } finally {
      setIsBooking(false);
    }
  }


async function payForBooking() {
  if (!booking || isBooking) return;

  setIsBooking(true);
  setError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/payments/create-checkout-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fare: Number(booking.fare),
          rideType: booking.ride,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.checkoutUrl) {
      throw new Error(
        data.message || "Unable to open payment checkout."
      );
    }

    window.location.href = data.checkoutUrl;
  } catch (err) {
    setError(err.message || "Payment could not be started.");
  } finally {
    setIsBooking(false);
  }
}



  function resetBooking() {
    setBooking(null);
    setError("");
    setPickup("");
    setDropoff("");
    setSelectedRide("comfort");
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <header className="navbar">
        <a className="brand" href="#home" aria-label="Rydex home">
          <span className="brand-mark">R</span>
          <span>Rydex<span className="brand-dot">.</span></span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a className="active" href="#home">Home</a>
          <a href="#booking">Plan a ride</a>
          <a href="#rides">Ride options</a>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setDark((previous) => !previous)}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
            <span>{dark ? "Light" : "Dark"}</span>
          </button>

          <a className="sign-in" href="#booking">Get started ↗</a>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="status-dot" />
            YOUR JOURNEY <span>•</span> SIMPLIFIED
          </div>

          <h1>Your city,<br /><span>your way.</span></h1>

          <p className="hero-description">
            Compare rides, calculate road distance and estimate your fare
            before booking your journey with Rydex.
          </p>

          <a className="primary-button" href="#booking">
            Plan your journey <span>→</span>
          </a>

          <div className="hero-stats">
            <div><strong>5</strong><span>Ride options</span></div>
            <div><strong>Live</strong><span>Route estimate</span></div>
            <div><strong>Easy</strong><span>Trip planning</span></div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-label">
            <span>YOUR NEXT JOURNEY</span>
            <span className="live-status">
              <span className="status-dot" /> RYDEX
            </span>
          </div>

          <div className="city-scene">
            <div className="sun" />

            <div className="city-skyline">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  className="building"
                  key={index}
                  style={{
                    "--height": `${75 + ((index * 37) % 115)}px`,
                    "--shade": index % 2 === 0 ? "#c6e5d4" : "#dcefe3",
                  }}
                >
                  <span /><span /><span /><span />
                </div>
              ))}
            </div>

            <svg
              className="route-line"
              viewBox="0 0 600 200"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M 25 150 C 100 150, 90 60, 190 85 S 315 160, 390 100 S 490 40, 575 22"
                fill="none"
                stroke="#0d9862"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="7 8"
              />
            </svg>

            <span className="map-pin pin-a" aria-label="Pickup point">A</span>
            <span className="map-pin pin-b" aria-label="Destination">B</span>

            <div className="road">
              <div className="road-line" />
              <div className="hero-car" aria-label="Car illustration">
                <span className="car-roof" />
                <span className="car-window" />
                <span className="car-body">R</span>
                <span className="wheel wheel-left" />
                <span className="wheel wheel-right" />
              </div>
            </div>
          </div>

          <div className="visual-footer">
            <div className="footer-icon">✦</div>
            <div>
              <strong>Every journey starts here</strong>
              <span>Choose a ride that suits you</span>
            </div>
            <span className="footer-arrow">↗</span>
          </div>
        </div>
      </section>

      <section className="booking-section" id="booking">
        <div className="section-heading">
          <div>
            <span className="section-kicker">PLAN YOUR JOURNEY</span>
            <h2>Where would you like to go?</h2>
            <p>Enter locations to calculate road distance and estimated fare.</p>
          </div>
          <span className="step-label">STEP 01 / YOUR JOURNEY</span>
        </div>

        <form className="booking-card" onSubmit={bookRide} noValidate>
          <div className="location-row">
            <label className="location-input">
              <span className="location-icon pickup-icon" aria-hidden="true">●</span>
              <span className="input-content">
                <span>Pickup location</span>
                <input
                  type="text"
                  value={pickup}
                  onChange={(event) => handleLocationChange(setPickup, event.target.value)}
                  placeholder="e.g. BRCM College, Bahal"
                  aria-label="Pickup location"
                  autoComplete="off"
                  maxLength={150}
                  disabled={isBooking}
                />
              </span>
            </label>

            <button
              type="button"
              className="swap-button"
              onClick={swapLocations}
              title="Swap pickup and destination"
              aria-label="Swap pickup and destination"
              disabled={isBooking}
            >
              ⇄
            </button>

            <label className="location-input">
              <span className="location-icon drop-icon" aria-hidden="true">◆</span>
              <span className="input-content">
                <span>Destination</span>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(event) => handleLocationChange(setDropoff, event.target.value)}
                  placeholder="e.g. Rohtak Railway Station"
                  aria-label="Destination"
                  autoComplete="off"
                  maxLength={150}
                  disabled={isBooking}
                />
              </span>
            </label>
          </div>

          <div className="route-summary">
            {routeLoading && (
              <p className="message">Calculating road distance and fare...</p>
            )}

            {!routeLoading && route && (
              <div className="route-details">
                <div>
                  <strong>{route.distanceKm.toFixed(1)} km</strong>
                  <span>Road distance</span>
                </div>
                <div>
                  <strong>{Math.max(1, Math.round(route.durationMinutes))} min</strong>
                  <span>Estimated drive time</span>
                </div>
                <div>
                  <strong>₹{fare}</strong>
                  <span>{selected.name} estimated fare</span>
                </div>
              </div>
            )}
          </div>
          <div className="map-section">
          <h3>Your route on map</h3>
          <RideMap route={route} />
          
          </div>

          <div className="ride-heading" id="rides">
            <strong>Select your ride</strong>
            <span>Estimated fare changes with distance</span>
          </div>

          <div className="ride-grid">
            {rides.map((ride) => {
              const rideFare = route ? calculateFare(ride, route.distanceKm) : null;

              return (
                <button
                  type="button"
                  key={ride.id}
                  className={`ride-card ${selectedRide === ride.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedRide(ride.id);
                    setError("");
                    setBooking(null);
                  }}
                  aria-pressed={selectedRide === ride.id}
                  disabled={isBooking}
                >
                  <div className="ride-image">
                    <img
                      src={ride.image}
                      alt={`${ride.name} ride`}
                      loading="lazy"
                    />
                    {selectedRide === ride.id && (
                      <span className="selected-check" aria-label="Selected">✓</span>
                    )}
                  </div>

                  <strong>{ride.name}</strong>
                  <span className="ride-description">{ride.description}</span>
                  <span className="ride-fare">
                    {rideFare === null ? `₹${ride.minimumFare}+` : `₹${rideFare}`}
                  </span>
                  <span className="ride-description">
                    {route ? "Estimated total" : `₹${ride.perKm}/km + base fare`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="booking-bottom">
            <span className="fare-note">
              <span className="info-icon" aria-hidden="true">i</span>
              Demo pricing only. Actual fares may vary.
            </span>

            <button
              className="find-ride-button"
              type="submit"
              disabled={isBooking || routeLoading || !route}
            >
              {isBooking ? "Booking..." : "Book this ride"}
              <span>{isBooking ? "…" : "→"}</span>
            </button>
          </div>

          {error && (
            <p className="message error-message" role="alert">{error}</p>
          )}

          {booking && (
            <div className="booking-result" role="status" aria-live="polite">
              <div className="success-icon" aria-hidden="true">✓</div>

              <div className="result-details">
                <h3>Booking request saved</h3>
                <p><strong>Pickup:</strong> {booking.pickup}</p>
                <p><strong>Destination:</strong> {booking.dropoff}</p>
                <p><strong>Ride:</strong> {booking.ride}</p>
                <p><strong>Distance:</strong> {Number(booking.distanceKm).toFixed(1)} km</p>
                <p><strong>Estimated drive:</strong> {Math.round(booking.durationMinutes)} min</p>
                <p><strong>Estimated fare:</strong> ₹{booking.fare}</p>
                <span className="booking-id">Booking ID: {booking.id}</span>
                <p className="demo-note">
                  Demo booking only. No driver has been assigned, live tracking
                  is unavailable, and no payment has been processed.
                </p>
              </div>


              
               <button
              className="find-ride-button"
              type="button"
              onClick={payForBooking}
               disabled={isBooking}
               >
               {isBooking ? "Opening payment..." : "Pay Now"}
                <span>→</span>
               </button>


              <button
                className="close-result"
                type="button"
                onClick={resetBooking}
              >
                New ride
              </button>
            </div>
          )}
        </form>
      </section>


      
<section className="booking-section" id="history">
  <div className="section-heading">
    <div>
      <span className="section-kicker">YOUR RIDES</span>
      <h2>Booking History</h2>
      <p>View the booking requests saved by the backend.</p>
    </div>

    <button
      type="button"
      className="find-ride-button"
      onClick={() => {
         const nextState = !showHistory;
         setShowHistory(nextState);

         if (nextState) {
         loadBookingHistory();
        }
      }}
    >
      {showHistory ? "Hide History ↑" : "Show History ↓"}
    </button>
  </div>
  {showHistory && (
  <>
    {historyLoading && <p>Loading bookings...</p>}

    {historyError && (
      <p className="message error-message" role="alert">
        {historyError}
      </p>
    )}

    {!historyLoading && !historyError && bookingHistory.length === 0 && (
      <p className="fare-note">
        No bookings found yet. Book your first ride to see it here.
      </p>
    )}

    {!historyLoading && !historyError && bookingHistory.length > 0 && (
      <div className="booking-card">
        {bookingHistory.map((item, index) => (
          <article
            key={item._id || item.id || index}
            className="benefit"
            style={{ marginBottom: "12px" }}
          >
            <div>
              <strong>{item.rideType || item.ride || "Ride"}</strong>
              <p>Pickup: {item.pickup}</p>
              <p>Destination: {item.dropoff}</p>
              <p>Distance: {item.distanceKm ?? "N/A"} km</p>
              <p>Fare: ₹{item.fare ?? "N/A"}</p>
              <p className="booking-id">
                Booking ID: {item._id || item.id || "N/A"}
              </p>
            </div>
          </article>
        ))}
      </div>
    )}
  </>
)}

</section>




      <section className="benefits" aria-label="Rydex features">
        <article className="benefit">
          <span className="benefit-icon" aria-hidden="true">↯</span>
          <div>
            <strong>Smart fare estimates</strong>
            <p>Estimated fares based on route distance and ride type.</p>
          </div>
        </article>

        <article className="benefit">
          <span className="benefit-icon" aria-hidden="true">◇</span>
          <div>
            <strong>Multiple ride choices</strong>
            <p>Choose Bike, Auto, Mini, Comfort or Premium.</p>
          </div>
        </article>

        <article className="benefit">
          <span className="benefit-icon" aria-hidden="true">⌁</span>
          <div>
            <strong>Plan your trip</strong>
            <p>Review distance and estimated travel time before booking.</p>
          </div>
        </article>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark">R</span>
          <span>Rydex<span className="brand-dot">.</span></span>
        </a>
        <p>Plan your journey with Rydex.</p>
        <span>Rydex · Cab Booking Project Demo</span>
      </footer>
    </main>
  );
}

export default App;