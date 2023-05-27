let isTickerRunning = false;

// Start the ticker
function startTicker() {
    isTickerRunning = true;
    updateTicker();
}

// Stop the ticker
function stopTicker() {
    isTickerRunning = false;
}

// Update the ticker
function updateTicker() {
    if (!isTickerRunning) {
    document.getElementById('ticker').value = '';
    return;
    }

    fetch('/last_five_entries')
    .then(response => response.json())
    .then(data => {
        let entries = data.lastFiveEntries;
        let tickerText = entries.map(entry => JSON.stringify(entry)).join(', ');
        document.getElementById('ticker').value = tickerText;
        setTimeout(updateTicker, 1000);
    });
}
