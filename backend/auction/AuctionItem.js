// backend/auction/AuctionItem.js
const { faker } = require('@faker-js/faker');

/**
 * The Subject (AuctionItem) in the Observer Pattern.
 * It maintains a list of its dependents (observers) and notifies them of any state changes.
 */
class AuctionItem {
    constructor() {
        this.observers = new Map(); // Stores observers: Map<observerId, { update: Function }>
        this.resetItem();
    }

    /**
     * Resets the auction item with new random data.
     */
    resetItem() {
        this.itemName = faker.commerce.productName();
        this.description = faker.commerce.productDescription();
        this.startingBid = parseFloat(faker.commerce.price({ min: 10, max: 100 }));
        this.currentBid = this.startingBid;
        this.highestBidder = null;
        this.auctionStatus = 'active'; // 'active', 'going once', 'going twice', 'sold'

        console.log(`Auction Item '${this.itemName}' created with starting bid: $${this.startingBid.toFixed(2)}`);
        this.notifyObservers(); // Notify immediately when item is created/reset
    }

    /**
     * Returns the current state of the auction item.
     */
    getState() {
        return {
            itemName: this.itemName,
            description: this.description,
            currentBid: this.currentBid,
            highestBidder: this.highestBidder,
            auctionStatus: this.auctionStatus
        };
    }

    /**
     * Attaches an observer to the list.
     * @param {string} observerId A unique identifier for the observer.
     * @param {{ update: Function }} observer The observer object with an update method.
     */
    attach(observerId, observer) {
        if (!this.observers.has(observerId)) {
            this.observers.set(observerId, observer);
            console.log(`Observer attached: ${observerId}`);
            // Immediately notify the newly attached observer with the current state
            observer.update(this.getState());
        }
    }

    /**
     * Detaches an observer from the list.
     * @param {string} observerId The unique identifier of the observer to detach.
     */
    detach(observerId) {
        if (this.observers.delete(observerId)) {
            console.log(`Observer detached: ${observerId}`);
        }
    }

    /**
     * Notifies all attached observers about the current state.
     */
    notifyObservers() {
        const currentState = this.getState();
        // console.log('Notifying observers with state:', currentState);
        this.observers.forEach(observer => {
            try {
                observer.update(currentState);
            } catch (error) {
                console.error(`Error notifying observer: ${error.message}`);
                // Optionally, detach observers that cause errors
            }
        });
    }

    /**
     * Places a bid on the auction item.
     * @param {string} bidderName
     * @param {number} bidAmount
     * @returns {boolean} True if the bid was successful, false otherwise.
     */
    placeBid(bidderName, bidAmount) {
        if (this.auctionStatus === 'sold') {
            console.log(`Bid by ${bidderName} for $${bidAmount.toFixed(2)} failed: Must be higher than current bid ($${this.currentBid.toFixed(2)})`);
            return false;
        }
        if (bidAmount > this.currentBid) {
            this.currentBid = bidAmount;
            this.highestBidder = bidderName;
            this.auctionStatus = 'active'; // Reset status if new bid comes in
            this.notifyObservers(); // Important: Notify observers after state change
            console.log(`New bid: $${bidAmount.toFixed(2)} by ${bidderName}`);
            return true;
        } else {
            console.log(`Bid by ${bidderName} for <span class="math-block">\{bidAmount\.toFixed\(2\)\} failed\: Must be higher than current bid \(</span>{this.currentBid.toFixed(2)})`);
            return false;
        }
    }

    /**
     * Updates the auction status (e.g., 'going once', 'going twice', 'sold').
     * This method is called by the AuctionTimer.
     * @param {string} status The new status.
     */
    updateStatus(status) {
        if (this.auctionStatus !== 'sold') { // Prevent status change if already sold
            this.auctionStatus = status;
            this.notifyObservers(); // Notify observers about status change
            console.log(`Auction status for '${this.itemName}': ${status}`);
        }
    }

    /**
     * Marks the auction item as sold.
     */
    sellItem() {
        if (this.auctionStatus !== 'sold') {
            this.auctionStatus = 'sold';
            console.log(`Auction for '${this.itemName}' SOLD to ${this.highestBidder} for $${this.currentBid.toFixed(2)}!`);
            this.notifyObservers(); // Final notification after selling
        }
    }
}

module.exports = AuctionItem;