// frontend/src/components/AuctionItemDisplay.jsx
import React from 'react';
import TutorialSnippet from './TutorialSnippet';

const AuctionItemDisplay = ({ item, displayTitle, attached }) => {
    const formatStatus = (status) => {
        switch (status) {
            case 'active': return 'Active';
            case 'going once': return 'Going Once!';
            case 'going twice': return 'Going Twice!';
            case 'sold': return 'SOLD!';
            default: return status;
        }
    };

    return (
        <div className={`card ${!attached ? 'detached' : ''}`}>
            <h3>Auction Item: {displayTitle}</h3>
            {attached ? (
                <TutorialSnippet>
                    This display is **attached** to the auction item (the Subject).
                    It receives **real-time updates** when the item's state changes.
                </TutorialSnippet>
            ) : (
                <TutorialSnippet>
                    This display is **detached**. It is no longer receiving updates
                    from the auction item, demonstrating how observers can be removed.
                </TutorialSnippet>
            )}

            <div className="card-content">
                <p><strong>Item:</strong> {item.itemName || 'N/A'}</p>
                <p><strong>Description:</strong> {item.description || 'Loading...'}</p>
                <p>
                    <strong>Current Bid:</strong>
                    <span className="current-bid">${item.currentBid ? item.currentBid.toFixed(2) : '0.00'}</span>
                </p>
                <p>
                    <strong>Highest Bidder:</strong>
                    {item.highestBidder || 'No bids yet'}
                </p>
                <p>
                    <strong>Status:</strong>
                    <span className={`auction-status ${item.auctionStatus === 'sold' ? 'sold' : ''} ${item.auctionStatus && item.auctionStatus.includes('going') ? 'going-once' : ''}`}>
                        {formatStatus(item.auctionStatus)}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default AuctionItemDisplay;