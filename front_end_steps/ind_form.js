const apiBaseUrl = "__API_BASE_URL__"; // Same API base URL

document.getElementById('logout_button').addEventListener('click', (event) => {
    localStorage.removeItem('authToken');
    window.location.href = '/index.html';
});

window.onload = async (event) => {
    const token = localStorage.getItem('authToken'); 

    if (!token) {
        console.error('No token found');
        return;
    }

    try {
        const tokenParts = token.split('.');
    
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
    
        const payload = JSON.parse(atob(tokenParts[1]));
        const username = payload.username || 'Unknown User';
    
        document.getElementById('username_id').innerHTML = `<b><i>${username}</i></b>`;
    
        // Call user stats with the username from token
        await showUserStat(event, `${apiBaseUrl}/user_steps_stats/${username}`, token);

        // Set initial date values
        const today = new Date();
        document.getElementById('daily_date_input').value = today.toISOString().split('T')[0];
        document.getElementById('daily_date_input').max = today.toISOString().split('T')[0];

        // Set initial week value
        const currentSunday = new Date(today);
        while (currentSunday.getDay() !== 0) {
            currentSunday.setDate(currentSunday.getDate() - 1);
        }
        document.getElementById('week_start_input').value = currentSunday.toISOString().split('T')[0];
        updateWeekDisplay();
    } catch (err) {
        console.error('Error decoding token:', err);
    }
};

async function showUserStat(event, fetch_path, token) {
    try {
        const response = await fetch(fetch_path, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });

        const userStatContainer = document.getElementById('current-month');

        if(response.ok){
            const data = await response.json();
            const entryDates = data.entry_dates || [];

            // Render calendar
            renderCalendar(userStatContainer, entryDates);
        } else {
            userStatContainer.innerHTML = 'Error fetching data';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById('current-month').innerHTML = 'Fetch error occurred';
    }
}

// === Calendar Renderer ===
function renderCalendar(container, entryDates, monthOffset = 0) {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // Get first and last day of this month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // For easier comparison
    const entrySet = new Set(entryDates);

    // Start rendering
    let calendarHTML = `
        <div class="calendar">
            <h3 class="header-font">${targetDate.toLocaleString('default', { month: 'long' })} ${year}</h3>
            <div class="calendar-grid">
                <div class="calendar-day header">Sun</div>
                <div class="calendar-day header">Mon</div>
                <div class="calendar-day header">Tue</div>
                <div class="calendar-day header">Wed</div>
                <div class="calendar-day header">Thu</div>
                <div class="calendar-day header">Fri</div>
                <div class="calendar-day header">Sat</div>
    `;

    // Add empty cells before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarHTML += `<div class="calendar-day empty"></div>`;
    }

    // Fill days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const hasEntry = entrySet.has(dateStr);
        calendarHTML += `
            <div class="calendar-day ${hasEntry ? 'has-entry' : ''}">
                ${day}
            </div>
        `;
    }

    calendarHTML += `</div></div>`;
    container.innerHTML = calendarHTML;
}

// Daily Steps Form Handler
document.getElementById('daily-steps-entry').addEventListener('submit', function(event) {
    event.preventDefault();
    const date = document.getElementById('daily_date_input').value;
    const steps = document.getElementById('daily_steps_input').value;

    if (!date || !steps) {
        document.getElementById('daily_message').textContent = 'Please fill in all fields';
        return;
    }

    submitSteps({
        date: date,
        steps: parseInt(steps),
        type: 'daily'
    });
});

// Week selection functionality
let currentWeekStart = new Date();

// Initialize to current week's Sunday
while (currentWeekStart.getDay() !== 0) {
    currentWeekStart.setDate(currentWeekStart.getDate() - 1);
}

// Function to update the week display
function updateWeekDisplay() {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Format dates
    const startStr = weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const endStr = weekEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Update the display
    document.getElementById('current_week_range').textContent = `${startStr} - ${endStr}`;
    
    // Store dates for form submission (store in the week-dates div instead)
    const weekDates = document.querySelector('.week-dates');
    weekDates.dataset.startDate = weekStart.toISOString().split('T')[0];
    weekDates.dataset.endDate = weekEnd.toISOString().split('T')[0];

    // Disable next week button if it would go into the future
    const today = new Date();
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    document.getElementById('next_week').disabled = nextWeekStart > today;
}

// Add event listeners for week navigation
document.getElementById('prev_week').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekDisplay();
});

document.getElementById('next_week').addEventListener('click', () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Don't allow selecting future weeks
    if (nextWeek <= new Date()) {
        currentWeekStart = nextWeek;
        updateWeekDisplay();
    }
});

// Initialize week display on page load
document.addEventListener('DOMContentLoaded', () => {
    updateWeekDisplay();
});

// Update the weekly steps form submission to use the selected week
document.getElementById('weekly-steps-entry').addEventListener('submit', function(event) {
    event.preventDefault();
    const weekDates = document.querySelector('.week-dates');
    const startDate = weekDates.dataset.startDate;
    const endDate = weekDates.dataset.endDate;
    const steps = document.getElementById('weekly_steps_input').value;

    if (!startDate || !endDate || !steps) {
        document.getElementById('weekly_message').textContent = 'Please fill in all fields';
        return;
    }

    submitSteps({
        date: startDate,
        endDate: endDate,
        steps: parseInt(steps),
        type: 'weekly'
    });
});

// Photo Proof Form Handler
document.getElementById('photo-proof-entry').addEventListener('submit', function(event) {
    event.preventDefault();
    const photoInput = document.getElementById('photo_input');
    
    if (!photoInput.files || photoInput.files.length === 0) {
        document.getElementById('photo_message').textContent = 'Please select a photo to upload';
        return;
    }

    submitPhotoProof(photoInput.files[0]);
});

async function submitSteps(data) {
    const token = localStorage.getItem('authToken');

    if (!token) {
        if(data.type === 'daily'){
            document.getElementById('daily_message').textContent = 'Unauthorized: Please log in first.';
        } else if(data.type === 'weekly'){
            document.getElementById('weekly_message').textContent = 'Unauthorized: Please log in first.';
        }
        return;
    }

    try {
        const response = await fetch(`${apiBaseUrl}/submit_steps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors',
            body: JSON.stringify(data)
        });

        const responseData = await response.json();

        if (response.ok) {
            if(data.type === 'daily'){
                document.getElementById('daily_message').textContent = 'Steps submitted successfully!';
            } else if(data.type === 'weekly'){
                document.getElementById('weekly_message').textContent = 'Steps submitted successfully!';
            }
            // Reset form
            if (data.type === 'daily') {
                document.getElementById('daily_steps_input').value = '';
            } else {
                document.getElementById('weekly_steps_input').value = '';
            }
            // Refresh stats
            const username = JSON.parse(atob(token.split('.')[1])).username;
            await showUserStat(null, `${apiBaseUrl}/user_steps_stats/${username}`, token);
        } else {
            if(data.type === 'daily'){
                document.getElementById('daily_message').textContent = responseData.message || 'Error submitting steps';
            } else if(data.type === 'weekly'){
                document.getElementById('weekly_message').textContent = responseData.message || 'Error submitting steps';
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if(data.type === 'daily'){
            document.getElementById('daily_message').textContent = 'An error occurred while submitting steps';
        } else if(data.type === 'weekly'){
            document.getElementById('weekly_message').textContent = 'An error occurred while submitting steps';
        }
    }
}

async function submitPhotoProof(file) {
    const token = localStorage.getItem('authToken');

    if (!token) {
        document.getElementById('photo_message').textContent = 'Unauthorized: Please log in first.';
        return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch(`${apiBaseUrl}/submit_photo_proof`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('photo_message').textContent = 'Photo uploaded successfully!';
            document.getElementById('photo_input').value = ''; // Reset file input
        } else {
            document.getElementById('photo_message').textContent = data.message || 'Error uploading photo';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('photo_message').textContent = 'An error occurred while uploading the photo';
    }
}

document.querySelectorAll('#monthlyTabs button').forEach(button => {
    button.addEventListener('click', function() {
        const monthOffset = this.id.split('-')[0] === 'current' ? 0 : 
                            this.id.split('-')[0] === 'last' ? -1 : -2;
        
        // Remove active class from all tabs and panes
        document.querySelectorAll('#monthlyTabs button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#monthlyTabContent .tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        // Add active class to clicked tab and its pane
        this.classList.add('active');
        const targetPane = document.querySelector(this.getAttribute('data-bs-target'));
        targetPane.classList.add('show', 'active');
        
        updateCalender(monthOffset);
    });
});

async function updateCalender(monthOffset) {
    try {
        const endpoint = `/user_steps_stats?month_offset=${monthOffset}`;
        const targetId = monthOffset === 0 ? 'current-month' : 
                         monthOffset === 1 ? 'last-month' : 'two-month';
        const container = document.getElementById(targetId);
        const response = await fetch(apiBaseUrl + endpoint, {
            method: 'GET', 
            mode: 'cors', 
            headers: {
                'Content-Type': 'application/json'
            }
        }); 
        
        if (!response.ok) {
            container.innerHTML = 'Error fetching data';
            return;
        }

        const data = await response.json();
        const entryDates = data.entry_dates || [];

        // Render calendar for the specified month offset
        renderCalendar(container, entryDates, monthOffset);
    } catch (error) {
        console.error('Error fetching monthly leaderboard:', error);
        container.innerHTML = 'Error fetching data';
    }
}