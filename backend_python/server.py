# backend_python/server.py
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import time
import random
import threading # For the auction timer logic

# --- 1. Basic Flask App Setup ---
app = Flask(__name__)
# Enable CORS for all origins during development
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*")

PORT = os.environ.get('PORT', 3000)

print('Server.py: Script execution started.')

# --- 2. Auction Item Logic (Python Translation) ---

# This class mirrors the AuctionTimer from the Node.js version
class PythonAuctionTimer:
    def __init__(self, auction_item, interval_seconds=5):
        self.auction_item = auction_item
        self.interval = interval_seconds
        self._timer = None
        self._status_index = 0
        self.statuses = ['active', 'going once', 'going twice', 'sold']
        print("AuctionTimer: Initialized.")

    def _tick(self):
        # This function runs periodically
        self._status_index += 1
        if self._status_index < len(self.statuses):
            new_status = self.statuses[self._status_index]
            self.auction_item.update_status(new_status)
            if new_status == 'sold':
                self.auction_item.sell_item()
                self.stop() # Stop timer once sold
            else:
                self._start_timer_thread() # Reschedule for the next tick
        else:
            self.stop() # Should not happen if 'sold' stops it correctly

    def start(self):
        # Reset the timer and status if a new bid comes in or item resets
        self.stop() # Stop any running timer
        self._status_index = 0 # Reset status to 'active' or 0
        self.auction_item.update_status(self.statuses[self._status_index]) # Ensure status is 'active'
        self._start_timer_thread()
        print("AuctionTimer: Started.")

    def stop(self):
        if self._timer and self._timer.is_alive():
            self._timer.cancel()
            print("AuctionTimer: Stopped.")
        self._timer = None # Clear the timer object

    def _start_timer_thread(self):
        # Schedules _tick to run after 'interval' seconds
        self._timer = threading.Timer(self.interval, self._tick)
        self._timer.daemon = True # Allow the main program to exit even if thread is running
        self._timer.start()


class PythonAuctionItem:
    def __init__(self):
        self.observers = {} # Store observers as {observerId: {update: func}}
        self.reset_item() # Initialize with a new item

    def reset_item(self):
        # Using simple random for product names and prices, similar to Node.js fallback
        self.item_name = self._generate_product_name()
        self.description = "A randomly generated item for auction (Python fallback)."
        self.starting_bid = round(random.uniform(10.0, 100.0), 2)
        self.current_bid = self.starting_bid
        self.highest_bidder = None
        self.auction_status = 'active'
        print(f"Auction Item '{self.item_name}' created with starting bid: ${self.starting_bid:.2f} (Python)")
        self.notify_observers() # Initial notification

    def get_state(self):
        return {
            'itemName': self.item_name,
            'description': self.description,
            'currentBid': self.current_bid,
            'highestBidder': self.highest_bidder,
            'auctionStatus': self.auction_status
        }

    def attach(self, observer_id, observer_obj):
        if observer_id not in self.observers:
            self.observers[observer_id] = observer_obj
            print(f"Observer attached: {observer_id} (Python)")
            # Immediately notify the newly attached observer with the current state
            observer_obj['update'](self.get_state())

    def detach(self, observer_id):
        if observer_id in self.observers:
            del self.observers[observer_id]
            print(f"Observer detached: {observer_id} (Python)")

    def notify_observers(self):
        current_state = self.get_state()
        # Ensure that emits are run in the context of the SocketIO server
        # Use socketio.emit to send to specific rooms/sids based on observer config
        for observer_id, observer_obj in self.observers.items():
            try:
                # The 'update' function for observers will now contain the emit call
                # and already knows which client (sid) to send to.
                observer_obj['update'](current_state)
            except Exception as e:
                print(f"Error notifying observer {observer_id}: {e}")

    def place_bid(self, bidder_name, bid_amount):
        if self.auction_status == 'sold':
            print(f"Bid by {bidder_name} for ${bid_amount:.2f} failed: Auction is sold. (Python)")
            return False
        if bid_amount > self.current_bid:
            self.current_bid = bid_amount
            self.highest_bidder = bidder_name
            self.auction_status = 'active' # Reset status if new bid comes in
            print(f"New bid: ${bid_amount:.2f} by {bidder_name} (Python)")
            self.notify_observers() # Important: Notify observers after state change
            return True
        # This is the line that had the syntax error, please compare it meticulously
        print(f"Bid by {bidder_name} for ${bid_amount:.2f} failed: Must be higher than current bid (${self.current_bid:.2f}) (Python)")
        return False

    def update_status(self, status):
        if self.auction_status != 'sold': # Prevent status change if already sold
            self.auction_status = status
            self.notify_observers() # Notify observers about status change
            print(f"Auction status for '{self.item_name}': {status} (Python)")

    def sell_item(self):
        if self.auction_status != 'sold':
            self.auction_status = 'sold'
            print(f"Auction for '{self.item_name}' SOLD to {self.highest_bidder} for ${self.current_bid:.2f}! (Python)")
            self.notify_observers() # Final notification after selling

    def _generate_product_name(self):
        names = ['Python Widget', 'Flask Gadget', 'SocketIO Trinket', 'Dynamic Doohickey', 'Coding Collectible', 'Digital Artifact']
        return random.choice(names)

# --- Global Auction State ---
current_auction_item = None
auction_timer = None

def start_new_auction():
    global current_auction_item, auction_timer
    print('Server.py: Inside start_new_auction() function.')
    if auction_timer:
        auction_timer.stop() # Stop any existing timer
    current_auction_item = PythonAuctionItem() # Create a new Subject
    auction_timer = PythonAuctionTimer(current_auction_item)
    auction_timer.start() # Start the timer for the new item
    print('Server.py: Exited start_new_auction() function.')

# Start the first auction when the server boots up
start_new_auction()


# --- 3. Socket.IO Event Handlers (Matching Frontend) ---
@socketio.on('connect')
def handle_connect():
    print(f'User connected: {request.sid} (Python)')
    # When a new client connects, attach its main display as an observer
    # Note: Using request.sid directly in the lambda makes it unique per client
    current_auction_item.attach(f"{request.sid}-mainDisplayObserver", {
        'update': lambda data: emit(f'auctionUpdate:mainDisplayObserver', data, room=request.sid)
    })
    # Also attach other potential observers, e.g., bid history (if frontend needs it)
    current_auction_item.attach(f"{request.sid}-bidHistoryObserver", {
        'update': lambda data: emit(f'auctionUpdate:bidHistoryObserver', data, room=request.sid)
    })
    # Send the initial state to the newly connected client
    emit('newAuctionStarted', current_auction_item.get_state(), room=request.sid)


@socketio.on('disconnect')
def handle_disconnect():
    print(f'User disconnected: {request.sid} (Python)')
    # Detach all observers associated with this socket ID
    # Iterate over a copy of keys to avoid RuntimeError during deletion
    for obs_id in list(current_auction_item.observers.keys()):
        if obs_id.startswith(f"{request.sid}-"):
            current_auction_item.detach(obs_id)


@socketio.on('attachObserver')
def handle_attach_observer(observer_id):
    # The 'observer_id' passed from frontend already includes the socket.id prefix (e.g., 'socketid-mainDisplayObserver')
    full_observer_id = observer_id # Corrected: Use the ID as sent from frontend
    current_auction_item.attach(full_observer_id, {
        # When emitting back to frontend, extract original observer ID (e.g., 'mainDisplayObserver')
        # The frontend's `socket.on` listener expects the event name without the socket.id prefix.
        'update': lambda data: emit(f'auctionUpdate:{observer_id.split("-", 1)[1]}', data, room=request.sid)
    })

@socketio.on('detachObserver')
def handle_detach_observer(observer_id):
    # The 'observer_id' passed from frontend already includes the socket.id prefix
    full_observer_id = observer_id # Corrected: Use the ID as sent from frontend
    current_auction_item.detach(full_observer_id)

@socketio.on('placeBid')
def handle_place_bid(data):
    bidder_name = data.get('bidderName')
    bid_amount = data.get('bidAmount')
    if not isinstance(bid_amount, (int, float)):
        try:
            bid_amount = float(bid_amount)
        except ValueError:
            emit('auctionError', 'Invalid bid amount provided.', room=request.sid)
            return

    print(f"Received bid: {bid_amount} from {bidder_name} (Python)")
    if current_auction_item and current_auction_item.auction_status != 'sold':
        if current_auction_item.place_bid(bidder_name, bid_amount):
            # If bid successful, restart timer (equivalent to Node.js `auctionTimer.start()`)
            auction_timer.start()
        else:
            # Bid failed due to being lower than current bid, emit error
            emit('auctionError', f'Bid by {bidder_name} for ${bid_amount:.2f} failed: Must be higher than current bid (${current_auction_item.current_bid:.2f})', room=request.sid)
    else:
        emit('auctionError', 'Auction is closed or item not available.', room=request.sid)


@socketio.on('startNewAuction')
def handle_start_new_auction():
    print(f'Client {request.sid} requested new auction (Python).')
    # Allow starting a new auction only if the current one is sold
    if current_auction_item and current_auction_item.auction_status == 'sold':
        start_new_auction() # This will create a new item and start its timer
        socketio.emit('newAuctionStarted', current_auction_item.get_state()) # Notify all clients
    else:
        emit('auctionError', 'Cannot start a new auction while one is active.', room=request.sid)


# --- 4. Serve Frontend Static Files ---
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
frontend_dist_path = os.path.join(project_root, 'frontend', 'dist')

@app.route('/')
def serve_index():
    print(f'Attempting to serve frontend from: {frontend_dist_path}')
    try:
        return send_from_directory(frontend_dist_path, 'index.html')
    except Exception as e:
        print(f"Error serving index.html: {e}")
        return "Frontend application not found. Please build the frontend first (`cd frontend && npm run build`).", 404

@app.route('/<path:filename>')
def serve_static(filename):
    try:
        return send_from_directory(frontend_dist_path, filename)
    except Exception as e:
        print(f"Error serving static file {filename}: {e}")
        return "File not found.", 404

# --- 5. Start the Server ---
if __name__ == '__main__':
    print(f'Server running on http://localhost:{PORT} (Python)')
    print(f'Frontend will be served from: {frontend_dist_path} (Python)')
    # Flask-SocketIO uses its own run method
    socketio.run(app, port=PORT, debug=True, allow_unsafe_werkzeug=True)