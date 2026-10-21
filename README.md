# Rydex – Cab Booking Web Application

Rydex is a responsive cab booking web application that helps users plan journeys, calculate road distance, estimate fares, choose ride options, save booking requests, and access a payment checkout.

## Live Demo

- **Website:** https://rydex-cab-booking.vercel.app
- **Backend Health Check:** https://rydex-cab-booking.onrender.com/api/health
- **GitHub Repository:** https://github.com/aartikumariak3101295-wq/rydex-cab-booking

## Features

- Responsive cab booking interface
- Five ride options: Bike, Auto, Mini Cab, Comfort Cab, and Premium
- Pickup and destination input
- Road distance and estimated travel time using OpenStreetMap and OSRM
- Dynamic fare calculation based on ride type and distance
- Booking requests saved through the backend
- Booking history section
- Stripe test-mode payment checkout integration
- Dark and light theme toggle
- Interactive route map

## Technologies Used

**Frontend**
- React
- JavaScript
- HTML
- CSS

**Backend and Services**
- Node.js
- Express.js
- Supabase
- Stripe
- OpenStreetMap Nominatim
- OSRM Routing API

**Deployment**
- Vercel (Frontend)
- Render (Backend)

## How It Works

1. Enter pickup and destination locations.
2. The application calculates the estimated road distance and travel time.
3. Select a preferred ride option.
4. Review the estimated fare and submit a booking request.
5. View booking details and booking history.
6. Use Pay Now to open the Stripe checkout flow.

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/aartikumariak3101295-wq/rydex-cab-booking.git
cd rydex-cab-booking
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Start the frontend

```bash
npm run dev
```

### 4. Start the backend

Open another terminal and install the backend dependencies:

```bash
cd backend
npm install
node server.js
```

Configure the required environment variables for Supabase and Stripe in the backend environment before running payment or database features. Never commit secret keys to GitHub.

## Environment Variables

Configure these variables in your deployment settings, using the names expected by the application:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `STRIPE_SECRET_KEY`

Keep all secret values private. Use Stripe test keys for test payments.

## Important Notes

- This project is a demonstration application.
- Fare amounts are estimates and may not represent actual taxi prices.
- A saved booking does not mean that a driver has been assigned.
- Payment functionality depends on the Stripe configuration.
- Booking history depends on correct backend and Supabase permissions.
- Live driver tracking is not implemented.

## Future Improvements

- User registration and login
- Driver assignment and live tracking
- Booking cancellation
- Payment confirmation and booking status updates
- Improved booking history and user-specific records

## Author

Developed as a cab booking web application project.

