# Train_Pulse
ALX capstone Project
TrainPulse – Capstone Project Proposal

1. Project Idea
The project I decided to work on is called TrainPulse.
TrainPulse is a web application that allows commuters to track trains in real time (or near real time) and plan their journeys more effectively. The app is inspired by ride‑hailing applications such as Uber or InDrive, where users can see vehicles moving on a map, track progress, and get estimated arrival times.
The initial focus of the project is on Cape Town’s Southern Line (Cape Town → Retreat). Many commuters experience uncertainty due to delayed, cancelled, or unpredictable train services. TrainPulse aims to reduce this uncertainty by presenting train movement, status, and estimated arrival times in a clear and familiar interface.
The current implementation uses a simulation MVP to demonstrate how the system would work if connected to real train data, while still solving a real problem and showing strong technical design.

2. Project Features

The project will have the following features:

Core Features
Interactive map showing the Southern Line stations
Visual train movement along the railway line
Station‑to‑station movement with realistic stops
Live status updates (Moving, Stopped, Arrived)
Estimated Time of Arrival (ETA) updates
Stops‑away indicator (how many stations away the train is)

User‑Focused Features
"Your station" selector so users can choose where they want to board
ETA specifically calculated for the selected station
Uber‑style bottom dashboard for quick information
Track / follow train functionality that keeps the train centered on the map

Planned Enhancements
Support for multiple trains
Bi‑directional routes (Cape Town → Retreat and Retreat → Cape Town)
Alerts and notifications
Historical reliability data

3. API Usage
At the moment, the project uses simulated data to represent train movement and timing. This approach allows the core functionality and architecture to be demonstrated without relying on unreliable or unavailable real‑time data sources.
Planned / Possible APIs
In future versions, the application can integrate with:
GTFS (General Transit Feed Specification) for scheduled train data
GTFS‑Realtime feeds for live train positions and delays (if available)
Crowdsourced reporting APIs where users submit arrival and delay information
A custom backend API built with FastAPI or Express to aggregate and serve data
The frontend is designed so that simulated data can easily be replaced with real API responses.

4. React Components (Planned)
The final version of the project is planned to be implemented using React. The following components are expected:
App – Root component
MapView – Displays the Leaflet map and route
TrainMarker – Handles train position and animation
StationMarker – Displays individual stations
BottomPanel – Uber‑style dashboard UI
StationSelector – Dropdown for selecting the user’s station
ETAInfo – Displays ETA and stops‑away information
TrackButton – Toggles train tracking mode
