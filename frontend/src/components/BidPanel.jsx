// frontend/src/components/BidPanel.jsx
import React, { useState, useEffect } from 'react';
import TutorialSnippet from './TutorialSnippet';

const BidPanel = ({ currentBid, auctionStatus, onPlaceBid }) => {
    const [bidderName, setBidderName] = useState('Player 1');
    const [bidAmount, setBidAmount] = useState(0);
    const [bidMessage, setBidMessage] = useState('');

    // Watch for changes in currentBid to update minimum bid amount
    useEffect(() => {
        setBidAmount(currentBid + 0.01); // Suggest slightly higher than current bid
    }, [currentBid]);

    const placeBid = () => {
        if (bidderName && bidAmount > currentBid) {
            onPlaceBid({ bidderName, bidAmount });
            setBidMessage(`Bid of $${bidAmount.toFixed(2)} placed!`);
        } else {
            setBidMessage('Please enter a valid bid amount higher than the current bid.');
        }
        setTimeout(() => {
            setBidMessage('');
        }, 3000); // Clear message after 3 seconds
    };

    const isBidDisabled = !bidderName || bidAmount <= currentBid || auctionStatus === 'sold';

    return (
        <div className="card">
            <h3>Place Your Bid</h3>
            <TutorialSnippet>
                You (the user) are acting as a **Bidder**. When you place a valid bid,
                you trigger a **state change** on the **Auction Item (Subject)**.
                This action causes the Subject to **notify all its observers**.
            </TutorialSnippet>

            <div className="bidder-input-group">
                <label htmlFor="bidder-name">Your Name:</label>
                <input
                    type="text"
                    id="bidder-name"
                    value={bidderName}
                    onChange={(e) => setBidderName(e.target.value)}
                    placeholder="Enter your name"
                />
            </div>
            <div className="bidder-input-group">
                <label htmlFor="bid-amount">Bid Amount:</label>
                <input
                    type="number"
                    id="bid-amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseFloat(e.target.value))}
                    min={currentBid + 0.01}
                    step="0.01"
                />
            </div>
            <button onClick={placeBid} disabled={isBidDisabled}>
                Place Bid
            </button>
            {bidMessage && <p>{bidMessage}</p>}
        </div>
    );
};

export default BidPanel;