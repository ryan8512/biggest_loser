const apiBaseUrl = "https://r58t6xl40g.execute-api.us-east-1.amazonaws.com/Prod"; // Same API base URL

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
    } catch (err) {
        console.error('Error decoding token:', err);
    }
};

async function showUserStat(event, fetch_path, token) {
    try {
        let data = "";

        const response = await fetch(fetch_path, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });

        if(response.ok){
            data = await response.json();

            const userStatContainer = document.getElementById("user-stat");

            // Create stats summary section
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'stats-summary mb-4';
            summaryDiv.innerHTML = `
                <h4 class="header-font mb-3">Your Steps Summary</h4>
                <div class="row">
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">Total Steps</h5>
                                <p class="card-text">${data.total_steps.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">Weekly Steps</h5>
                                <p class="card-text">${data.weekly_steps.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <h5 class="card-title">Daily Average</h5>
                                <p class="card-text">${data.daily_average.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            userStatContainer.appendChild(summaryDiv);

        } else {
            document.getElementById("user-stat").innerHTML = 'Error fetching data';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById("user-stat").innerHTML = 'Fetch error occurred';
    }
};

document.getElementById('steps-entry').addEventListener('submit', function (event) {
    event.preventDefault();

    const date = document.getElementById('date_input').value.trim();
    const steps = document.getElementById('steps_input').value.trim();

    // Call the API to submit steps
    submitSteps(date, steps);
});

function submitSteps(date, steps) {
    const apiEndpoint = `${apiBaseUrl}/submit_steps`;
    const token = localStorage.getItem('authToken');

    if (!token) {
        document.getElementById('message').textContent = 'Unauthorized: Please log in first.';
        return;
    }

    fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        mode: 'cors',
        body: JSON.stringify({ date, steps })
    }).then(async (response) => {
        const data = await response.json();
        if (response.ok) {
            document.getElementById('message').textContent = data.message;
            // Refresh the stats after successful submission
            const username = JSON.parse(atob(token.split('.')[1])).username;
            showUserStat(null, `${apiBaseUrl}/user_steps_stats/${username}`, token);
        } else {
            document.getElementById('message').textContent = data.message;
        }
    })
    .catch((error) => {
        console.error('Error submitting the form:', error);
        document.getElementById('message').textContent = 'An error occurred while submitting the form.';
    });
}

// Set today's date as default in the date input
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date_input').value = today;
    document.getElementById('date_input').max = today; // Prevent future dates
});
