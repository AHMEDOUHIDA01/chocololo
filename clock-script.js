// clock-script.js

// Get the current date and time
function updateClock() {
    const now = new Date();
    const utcString = now.toUTCString();
    const utcDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
    document.getElementById('clock').textContent = utcDate;
}

// Toggle between 12/24 hour format
let is24HourFormat = true;
function toggleFormat() {
    is24HourFormat = !is24HourFormat;
    updateClock();
}

// Dark mode toggle functionality
let isDarkMode = false;
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
}

// Update the clock every second
setInterval(updateClock, 1000);

// Event listeners for buttons
document.getElementById('toggleFormatBtn').addEventListener('click', toggleFormat);
document.getElementById('toggleDarkModeBtn').addEventListener('click', toggleDarkMode);

// Initial function call to set the clock
updateClock();