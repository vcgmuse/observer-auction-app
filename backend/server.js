// backend/server.js
console.log('Server.js: Script execution started.'); // <-- ADDED DEBUG LINE 1
const express = require('express');
console.log('Server.js: Express loaded.'); // <-- ADDED DEBUG LINE 2
const http = require('http');
const { Server } = require('socket.io');
console.log('Server.js: Socket.IO loaded.'); // <-- ADDED DEBUG LINE 3
const path = require('path');
const fs = require('fs'); // For checking if frontend build exists
console.log('Server.js: Path and FS loaded.'); // <-- ADDED DEBUG LINE 4

const AuctionItem = require('./auction/AuctionItem');
console.log('Server.js: AuctionItem loaded.'); // <-- ADDED DEBUG LINE 5
const AuctionTimer = require('./utils/auctionTimer');
console.log('Server.js: AuctionTimer loaded.'); // <-- ADDED DEBUG LINE 6

console.log('Server.js: Defining app and server.'); // <-- ADDED DEBUG LINE 7
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// --- Auction State Management ---
let currentAuctionItem = null;
let auctionTimer = null;

console.log('Server.js: About to call startNewAuction().'); // <-- ADDED DEBUG LINE 8
/**
 * Initializes a new auction item and starts its timer.
 */
function startNewAuction() {
    console.log('Server.js: Inside startNewAuction() function.'); // <-- ADDED DEBUG LINE 9
    if (auctionTimer) {
        auctionTimer.stop(); // Stop any existing timer
    }
    currentAuctionItem = new AuctionItem(); // Create a new Subject
    auctionTimer = new AuctionTimer(currentAuctionItem);
    auctionTimer.start(); // Start the timer for the new item
    console.log('Server.js: Exited startNewAuction() function.'); // <-- ADDED DEBUG LINE 10
}

// Start the first auction when the server boots up
startNewAuction();

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a client wants to explicitly attach a specific UI component as an observer
    socket.on('attachObserver', (observerId) => {
        if (currentAuctionItem) {
            // The `observerId` here is a unique string like `socket.id-mainDisplayObserver`
            // This allows the Subject to know *which* UI component on which client needs an update.
            currentAuctionItem.attach(observerId, {
                // This is the specific `update` method for this single observer instance.
                update: (data) => {
                    // When the AuctionItem notifies, emit to this specific socket and component ID.
                    // This uses Socket.IO's "rooms" concept implicitly, sending only to the specific socket.id
                    // and with a specific event name for the frontend component to listen to.
                    io.to(socket.id).emit(`auctionUpdate:${observerId}`, data);
                }
            });
        }
    });

    // When a client wants to explicitly detach a specific UI component as an observer
    socket.on('detachObserver', (observerId) => {
        if (currentAuctionItem) {
            currentAuctionItem.detach(observerId);
        }
    });

    // Handle new bid from a client
    socket.on('placeBid', (bidData) => {
        const { bidderName, bidAmount } = bidData;
        if (currentAuctionItem && currentAuctionItem.auctionStatus !== 'sold') {
            const bidSuccessful = currentAuctionItem.placeBid(bidderName, parseFloat(bidAmount));
            if (bidSuccessful) {
                auctionTimer.start(); // Reset timer if a new bid comes in
            }
        } else {
            socket.emit('auctionError', 'Auction is closed or item not available.');
        }
    });

    // Handle request to start a new auction from a client
    socket.on('startNewAuction', () => {
        console.log(`Client ${socket.id} requested new auction.`);
        if (currentAuctionItem && currentAuctionItem.auctionStatus === 'sold') {
            startNewAuction(); // Start a brand new item
            // Notify all clients that a new auction has started so they can update their UIs
            // This is a general broadcast, then individual components will re-attach to the new item.
            io.emit('newAuctionStarted', currentAuctionItem.getState());
        } else if (!currentAuctionItem) {
             startNewAuction(); // In case server started without an item for some reason
             io.emit('newAuctionStarted', currentAuctionItem.getState());
        }
        // If auction is active, don't start a new one.
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // When a user disconnects, remove all observers associated with their socket ID.
        // This ensures the Subject (AuctionItem) doesn't try to notify non-existent connections.
        if (currentAuctionItem) {
            currentAuctionItem.observers.forEach((_, observerId) => {
                if (observerId.startsWith(socket.id + '-')) { // Match observer IDs starting with this socket's ID
                    currentAuctionItem.detach(observerId);
                }
            });
        }
    });
});

// --- Serve Frontend Static Files ---
const projectRoot = path.resolve(__dirname, '..'); // This should resolve to observer-auction-app/
const frontendDistPath = path.join(projectRoot, 'frontend', 'dist');

console.log(`Attempting to serve frontend from: ${frontendDistPath}`); // <-- DEBUG LOG

app.use(express.static(frontendDistPath));

// Fallback for React Router history mode (if applicable, which it isn't strictly for a single page demo)
app.get('*', (req, res) => {
    // Ensure index.html exists before trying to send it
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error(`Error: index.html not found at ${indexPath}. Did you run 'npm run build' in the frontend directory?`);
        res.status(404).send('Frontend application not found. Please build the frontend first (`cd frontend && npm run build`).');
    }
});

// --- Start the Server ---
// THIS IS THE MISSING PIECE!
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend will be served from: ${frontendDistPath}`); // Clarify serving path
});