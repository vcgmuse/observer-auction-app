// backend/utils/auctionTimer.js

/**
 * Manages the timer for an AuctionItem.
 * It acts as a client that calls methods on the AuctionItem (Subject)
 * based on time intervals.
 */
class AuctionTimer {
    constructor(auctionItem) {
        this.auctionItem = auctionItem; // The Subject we are timing
        this.timer = null;
        this.phase = 0; // 0: active, 1: going once, 2: going twice, 3: sold
        this.intervalMs = 10000; // 10 seconds for each phase
    }

    /**
     * Starts or resets the auction timer.
     */
    start() {
        this.stop(); // Clear any existing timer
        this.phase = 0; // Reset phase
        this.setNextPhaseTimer();
        console.log(`Auction timer started/reset for '${this.auctionItem.itemName}'. Next phase in ${this.intervalMs / 1000}s.`);
    }

    /**
     * Stops the current auction timer.
     */
    stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            console.log(`Auction timer stopped for '${this.auctionItem.itemName}'.`);
        }
    }

    /**
     * Sets the timer for the next auction phase.
     * This method embodies the timing logic for the auction.
     */
    setNextPhaseTimer() {
        this.timer = setTimeout(() => {
            this.phase++;
            switch (this.phase) {
                case 1:
                    this.auctionItem.updateStatus('going once');
                    this.setNextPhaseTimer(); // Set timer for next phase
                    break;
                case 2:
                    this.auctionItem.updateStatus('going twice');
                    this.setNextPhaseTimer(); // Set timer for next phase
                    break;
                case 3:
                    this.auctionItem.sellItem();
                    this.stop(); // Auction is sold, stop the timer
                    break;
                default:
                    // Should not happen, but a fallback
                    this.stop();
                    break;
            }
        }, this.intervalMs);
    }
}

module.exports = AuctionTimer;