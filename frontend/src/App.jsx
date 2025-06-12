// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import AuctionItemDisplay from './components/AuctionItemDisplay';
import BidPanel from './components/BidPanel';
import ObserverControl from './components/ObserverControl';
import TutorialSnippet from './components/TutorialSnippet';

// Connect to your backend
const socket = io('http://localhost:3000');

const App = () => {
    // Reactive state for the main auction item being observed
    const [auctionState, setAuctionState] = useState({
        itemName: 'Loading Auction Item...',
        description: 'Awaiting item details from the server.',
        currentBid: 0,
        highestBidder: null,
        auctionStatus: 'inactive'
    });

    // Keep track of which *frontend UI components* are logically attached/detached
    // This helps us control which `AuctionItemDisplay` receives updates from the server
    // and also to visually represent the detached state.
    const [attachedObservers, setAttachedObservers] = useState({
        mainDisplayObserver: true,
        bidder1ViewObserver: true,
        bidder2ViewObserver: true,
    });

    // When an observer is detached, we want its display to stop updating.
    // We'll store its last received state here so it doesn't just go blank.
    const detachedStates = useRef({
        mainDisplayObserver: {},
        bidder1ViewObserver: {},
        bidder2ViewObserver: {},
    });

    // --- Socket.IO Event Handlers ---
    useEffect(() => {
        const handleConnect = () => {
            console.log('Connected to server via Socket.IO');
            // Upon connection, request the current auction item state for all initially attached observers
            // We'll simulate initial attachment for all existing observer UIs here.
            // This ensures they get the current state from the new subject.
            for (const obsId in attachedObservers) {
                if (attachedObservers[obsId]) {
                    // Use the `attachObserver` function to send the correct ID to the server
                    attachObserver(obsId); // Re-attach existing observers on reconnect
                }
            }
        };

        const handleDisconnect = () => {
            console.log('Disconnected from server');
            setAuctionState(prev => ({ ...prev, auctionStatus: 'disconnected' }));
        };

        // This function handles updates for specific observer IDs
        const createUpdateHandler = (obsId) => (data) => {
            // Always update the detachedStates ref for consistency, so it holds the latest data
            detachedStates.current[obsId] = { ...data };

            // If this specific UI component is currently marked as attached,
            // update the global auctionState. This ensures the main shared state
            // reflects the latest data if *any* attached observer receives it.
            if (attachedObservers[obsId]) { // CRITICAL FIX: Ensures it uses the *current* state of attachedObservers
                setAuctionState(data); // CRITICAL FIX: Update shared state here regardless of obsId being 'mainDisplayObserver'
            }
        };

        // Set up general listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        // Set up specific listeners for each observer ID
        const observerIds = Object.keys(attachedObservers); // Get current observer IDs
        const specificUpdateHandlers = {};

        observerIds.forEach(obsId => {
            specificUpdateHandlers[obsId] = createUpdateHandler(obsId);
            // The server emits 'auctionUpdate:observerId' (e.g., 'auctionUpdate:mainDisplayObserver')
            // The backend handles the `socket.id` prefix internally in its `emit` call.
            socket.on(`auctionUpdate:${obsId}`, specificUpdateHandlers[obsId]);
        });


        // Handle new auction started event (general broadcast)
        const handleNewAuctionStarted = (initialState) => {
            console.log('New auction started:', initialState);
            setAuctionState(initialState); // Update the main state with the new item
            // Ensure all detached displays also reflect the *new item's initial state*
            // when a new auction starts, so they are ready if re-attached.
            for (const obsId in detachedStates.current) {
                detachedStates.current[obsId] = { ...initialState };
            }
            // Also re-attach any observers that were previously attached to the *old* item
            // because a new subject means a new subscription context.
            for (const obsId in attachedObservers) {
                if (attachedObservers[obsId]) {
                    attachObserver(obsId); // Re-emit attach for the new subject on server
                }
            }
        };
        socket.on('newAuctionStarted', handleNewAuctionStarted);


        // Cleanup function for useEffect
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('newAuctionStarted', handleNewAuctionStarted);
            observerIds.forEach(obsId => {
                socket.off(`auctionUpdate:${obsId}`, specificUpdateHandlers[obsId]);
            });
        };
    }, [attachedObservers]); // CRITICAL FIX: Add attachedObservers to dependency array!

    // --- Frontend Action Handlers ---

    const handlePlaceBid = (bidData) => {
        socket.emit('placeBid', bidData);
    };

    const startNewAuction = () => {
        socket.emit('startNewAuction');
    };

    const attachObserver = (observerId) => {
        console.log(`Attaching ${observerId}`);
        setAttachedObservers(prev => ({ ...prev, [observerId]: true }));
        // Send unique ID to server (socket.id + unique observer key)
        socket.emit('attachObserver', socket.id + '-' + observerId);
        // When re-attaching, ensure its display immediately reflects the *current* auction state.
        // This is managed by the AuctionItemDisplay's `item` prop logic in the template.
    };

    const detachObserver = (observerId) => {
        console.log(`Detaching ${observerId}`);
        setAttachedObservers(prev => ({ ...prev, [observerId]: false }));
        // Before detaching, capture the current state so the display doesn't go blank.
        // This is actually handled by `createUpdateHandler` updating `detachedStates.current`
        socket.emit('detachObserver', socket.id + '-' + observerId); // Send unique ID to server
    };

    return (
        <>
            <h1 className="section-title">Interactive Auction: Observer Pattern Demo (React)</h1>

            <div className="main-column">
                <div className="card">
                    <h2>The Auction Item (Subject)</h2>
                    <TutorialSnippet>
                        This represents the **Subject** (the observable) in our Observer Pattern.
                        Its state (current bid, bidder, status) changes, and it **notifies**
                        all registered **Observers** about these changes.
                    </TutorialSnippet>
                    <button
                        onClick={startNewAuction}
                        disabled={auctionState.auctionStatus !== 'sold' && auctionState.auctionStatus !== 'inactive'}
                    >
                        Start New Auction Item
                    </button>
                    <AuctionItemDisplay
                        item={auctionState}
                        displayTitle="Main Auction View"
                        attached={true} // This display is conceptually always attached as the primary view
                    />
                </div>

                <BidPanel
                    currentBid={auctionState.currentBid}
                    auctionStatus={auctionState.auctionStatus}
                    onPlaceBid={handlePlaceBid}
                />
            </div>

            <div className="observers-column">
                <h2>Observer Views (The Observers)</h2>
                <TutorialSnippet>
                    These panels are **Observers**. They receive updates from the Auction Item (Subject).
                    Use the toggles to **attach/detach** them and see how updates stop/start.
                </TutorialSnippet>

                <ObserverControl
                    observerId="mainDisplayObserver"
                    observerName="General Auction Display"
                    initialAttached={true}
                    onAttach={attachObserver}
                    onDetach={detachObserver}
                />
                <AuctionItemDisplay
                    item={attachedObservers.mainDisplayObserver ? auctionState : detachedStates.current.mainDisplayObserver}
                    displayTitle="General Auction Display"
                    attached={attachedObservers.mainDisplayObserver}
                />

                <ObserverControl
                    observerId="bidder1ViewObserver"
                    observerName="Bidder 1's View"
                    initialAttached={true}
                    onAttach={attachObserver}
                    onDetach={detachObserver}
                />
                <AuctionItemDisplay
                    item={attachedObservers.bidder1ViewObserver ? auctionState : detachedStates.current.bidder1ViewObserver}
                    displayTitle="Bidder 1's Personal View"
                    attached={attachedObservers.bidder1ViewObserver}
                />

                <ObserverControl
                    observerId="bidder2ViewObserver"
                    observerName="Bidder 2's View"
                    initialAttached={true}
                    onAttach={attachObserver}
                    onDetach={detachObserver}
                />
                <AuctionItemDisplay
                    item={attachedObservers.bidder2ViewObserver ? auctionState : detachedStates.current.bidder2ViewObserver}
                    displayTitle="Bidder 2's Personal View"
                    attached={attachedObservers.bidder2ViewObserver}
                />
            </div>
        </>
    );
};

export default App;