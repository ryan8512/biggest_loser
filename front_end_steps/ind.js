let username = "";
let debug_setting = 0;

const apiBaseUrl = "__API_BASE_URL__";

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('usernameForm');
    const message = document.getElementById('message');
    
    // Update leaderboards on page load
    updateLeaderboards();
    
    // Add event listeners for weekly tabs
    document.querySelectorAll('#weeklyTabs button').forEach(button => {
        button.addEventListener('click', function() {
            const weekOffset = this.id.split('-')[0] === 'current' ? 0 : 
                             this.id.split('-')[0] === 'last' ? 1 :
                             this.id.split('-')[0] === 'two' ? 2 :
                             this.id.split('-')[0] === 'three' ? 3 :
                             this.id.split('-')[0] === 'four' ? 4 : 5;
            
            // Remove active class from all tabs and panes
            document.querySelectorAll('#weeklyTabs button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#weeklyTabContent .tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            // Add active class to clicked tab and its pane
            this.classList.add('active');
            const targetPane = document.querySelector(this.getAttribute('data-bs-target'));
            targetPane.classList.add('show', 'active');
            
            updateWeeklyLeaderboard(weekOffset);
        });
    });

    document.querySelectorAll('#monthlyTabs button').forEach(button => {
        button.addEventListener('click', function() {
            const monthOffset = this.id.split('-')[0] === 'current' ? 0 : 
                             this.id.split('-')[0] === 'last' ? 1 : 2;
            
            // Remove active class from all tabs and panes
            document.querySelectorAll('#monthlyTabs button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#monthlyTabContent .tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            
            // Add active class to clicked tab and its pane
            this.classList.add('active');
            const targetPane = document.querySelector(this.getAttribute('data-bs-target'));
            targetPane.classList.add('show', 'active');
            
            updateMonthlyLeaderboard(monthOffset);
        });
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        username = document.getElementById('username').value.trim();
        
        if (!username) {
            message.textContent = "Username cannot be empty!";
            return;
        }
        checkUsernameExistence(username);
    });
    
    async function updateLeaderboards() {
        try {
            // Fetch overall leaderboard
            await updateMonthlyLeaderboard(0);
            
            // Fetch current week's leaderboard
            await updateWeeklyLeaderboard(0);
            
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    }
    
    async function updateWeeklyLeaderboard(weekOffset) {
        try {
            const endpoint = `/weekly_steps_leaderboard?week_offset=${weekOffset}`;
            const tabId = weekOffset === 0 ? 'current-week' : 
                          weekOffset === 1 ? 'last-week' : 
                          weekOffset === 2 ? 'two-weeks' : 
                          weekOffset === 3 ? 'three-weeks' : 
                         weekOffset === 4 ? 'four-weeks' : 'five-weeks';
            await showLeaderboard(null, endpoint, tabId);
        } catch (error) {
            console.error('Error fetching weekly leaderboard:', error);
        }
    }

    async function updateMonthlyLeaderboard(monthOffset) {
        try {
            const endpoint = `/overall_steps_leaderboard?month_offset=${monthOffset}`;
            const tabId = monthOffset === 0 ? 'current-month' : 
                         monthOffset === 1 ? 'last-month' : 'two-month';
            await showLeaderboard(null, endpoint, tabId);
        } catch (error) {
            console.error('Error fetching monthly leaderboard:', error);
        }
    }
    
    async function showLeaderboard(event, fetch_path, targetId) {
        try {
            let data = "";
            
            if(debug_setting == 1){
                data = [
                    { "username": "Person 1", "steps": 80000 },
                    { "username": "Person 2", "steps": 60000 },
                    { "username": "Person 3", "steps": 40000 }
                ];
            }else{
                const response = await fetch(apiBaseUrl + fetch_path, {
                    method: 'GET', 
                    mode: 'cors', 
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }); 
                
                if(response.ok){
                    data = await response.json();
                } else {
                    document.getElementById(targetId).innerHTML = 'Error fetching data';
                    return;
                }
            }
            
            const leaderboardContainer = document.getElementById(targetId);
            leaderboardContainer.innerHTML = ''; // Clear existing content
            
            const medalColors = [
                { r: 254, g: 216, b: 0 },  // Gold
                { r: 175, g: 174, b: 168 }, // Silver
                { r: 210, g: 151, b: 89 }   // Bronze
            ];

            data.forEach((entry, index) => {
                const barContainer = document.createElement('div');
                barContainer.classList.add('bar-container');

                // Create circle for steps count
                const circle = document.createElement('div');
                circle.classList.add('circle');
                circle.style.backgroundColor = `hsl(166, 97%, ${20 + (index * 3)}%)`; 
                
                const stepsText = document.createElement('h4');
                stepsText.innerHTML = `<b>${(entry.steps/1000).toFixed(1)}k</b>`;
                circle.appendChild(stepsText);

                // Create the label (person's name)
                const label = document.createElement('div');
                label.classList.add('label');
                const personName = document.createElement('span');
                personName.textContent = entry.username;
                label.appendChild(personName);

                // Add medal for top 3
                if(index < 3) {
                    const { r, g, b } = medalColors[index];
                    const medalSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    medalSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    medalSvg.setAttribute('width', '30');
                    medalSvg.setAttribute('height', '30');
                    medalSvg.setAttribute('fill', 'currentColor');
                    medalSvg.setAttribute('class', 'bi bi-award-fill');
                    medalSvg.setAttribute('viewBox', '0 0 16 16');
                    medalSvg.style.color = `rgba(${r}, ${g}, ${b}, 0.734)`;
                    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path1.setAttribute('d', 'm8 0 1.669.864 1.858.282.842 1.68 1.337 1.32L13.4 6l.306 1.854-1.337 1.32-.842 1.68-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.68-1.337-1.32L2.6 6l-.306-1.854 1.337-1.32.842-1.68L6.331.864z');
                    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path2.setAttribute('d', 'M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1z');
                    medalSvg.appendChild(path1);
                    medalSvg.appendChild(path2);
                    
                    label.appendChild(medalSvg);
                }

                barContainer.appendChild(circle);
                barContainer.appendChild(label);
                leaderboardContainer.appendChild(barContainer);
            });
        } catch (error) {
            console.error('Fetch error:', error);
            document.getElementById(targetId).innerHTML = 'Fetch error occurred';
        }
    }
});

async function checkUsernameExistence(username) {
    const apiEndpoint = `${apiBaseUrl}/login_steps`;

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username }),
            mode: 'cors'
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            // Redirect to the steps form page
            window.location.href = 'index_form.html';
        } else {
            const error = await response.json();
            document.getElementById('message').textContent = error.message;
        }
    } catch (error) {
        document.getElementById('message').textContent = 'An error occurred';
    }
}