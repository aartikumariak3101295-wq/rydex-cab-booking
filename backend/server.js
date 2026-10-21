
require("dotenv").config();

const express = require("express");
const Stripe = require("stripe");
const stripeKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeKey ? Stripe(stripeKey) : null;
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error("Missing Supabase URL or secret key in backend/.env");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const allowedRides = [
  "Bike",
  "Auto",
  "Mini Cab",
  "Comfort Cab",
  "Premium",
];

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Rydex backend is running!",
  });
});
app.post("/api/payments/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Stripe test key is not configured.",
      });
    }

    const { fare, rideType } = req.body;

    if (
      typeof fare !== "number" ||
      !Number.isFinite(fare) ||
      fare < 1 ||
      fare > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid fare.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
   
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `Rydex ${rideType || "Cab"} Ride`,
            },
            unit_amount: Math.round(fare * 100),
          },
          quantity: 1,
        },
      ],
      success_url:
        "https://rydex-cab-booking.vercel.app/?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://rydex-cab-booking.vercel.app/?payment=cancelled",
    });

    return res.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment session.",
    });
  }
});


app.post("/api/bookings", async (req, res) => {
  try {
    const {
      pickup,
      dropoff,
      rideType,
      fare,
      distanceKm,
      durationMinutes,
      pricing,
    } = req.body;

    if (
      typeof pickup !== "string" ||
      typeof dropoff !== "string" ||
      !pickup.trim() ||
      !dropoff.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter pickup and drop-off locations.",
      });
    }

    if (pickup.trim().toLowerCase() === dropoff.trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Pickup and drop-off must be different.",
      });
    }

    if (!allowedRides.includes(rideType)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid ride.",
      });
    }

    if (
      typeof fare !== "number" ||
      !Number.isFinite(fare) ||
      fare <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fare.",
      });
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: "guest",
        pickup_location: pickup.trim(),
        dropoff_location: dropoff.trim(),
        ride_type: rideType,
        fare,
        distance_km: Number.isFinite(distanceKm) ? distanceKm : null,
        duration_minutes: Number.isInteger(durationMinutes)
          ? durationMinutes
          : null,
        pricing: pricing ?? null,
        status: "requested",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message,
      });

    }

    return res.status(201).json({
      success: true,
      message: "Booking saved successfully!",
      booking: {
        id: data.id,
        pickup: data.pickup_location,
        dropoff: data.dropoff_location,
        ride: data.ride_type,
        rideType: data.ride_type,
        fare: Number(data.fare),
        distanceKm: data.distance_km,
        durationMinutes: data.duration_minutes,
        pricing: data.pricing,
        status: "Pending",
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("Booking error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unexpected booking error.",
    });
  }
});

app.get("/api/bookings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("History error:", error.message);
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    const bookings = data.map((item) => ({
      id: item.id,
      pickup: item.pickup_location,
      dropoff: item.dropoff_location,
      ride: item.ride_type,
      rideType: item.ride_type,
      fare: Number(item.fare),
      distanceKm: item.distance_km,
      durationMinutes: item.duration_minutes,
      pricing: item.pricing,
      status: item.status,
      createdAt: item.created_at,
    }));

    return res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("History error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unexpected history error.",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

app.listen(PORT, () => {
  console.log(`Rydex backend running at http://localhost:${PORT}`);
});
