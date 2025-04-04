const apiBaseUrl = "https://r58t6xl40g.execute-api.us-east-1.amazonaws.com/Prod";

// Check if user is logged in
window.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        // User is not logged in, redirect to home page
        window.location.href = '/';
        return;
    }
    
    // Show logout button and user info
    document.getElementById('logout-container').style.display = 'block';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    
    // Decode token and display username
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
        const payload = JSON.parse(atob(tokenParts[1]));
        const username = payload.username || 'Unknown User';
        document.getElementById('username_id').innerHTML = `<b><i>${username}</i></b>`;
    } catch (err) {
        console.error('Error decoding token:', err);
    }
});

document.getElementById('logout_button').addEventListener('click', (event) => {
    localStorage.removeItem('authToken');
    window.location.href = '/';
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
    
        await showUserStat(event, `${apiBaseUrl}/get-user-stat`, token);
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

            const table = document.createElement('table');
            const headerRow = document.createElement('tr');

            const headers = ['Date', 'Weight', 'Fat Percentage', 'Fat Mass'];
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });

            table.appendChild(headerRow);

            data.forEach((entry) => {
                const row = document.createElement('tr');
            
                const dateCell = document.createElement('td');
                const date = new Date(entry.date);
                dateCell.textContent = date.toLocaleDateString();
                row.appendChild(dateCell);
            
                const weightCell = document.createElement('td');
                weightCell.textContent = entry.weight;
                row.appendChild(weightCell);
            
                const fatPercentageCell = document.createElement('td');
                fatPercentageCell.textContent = `${entry.fat_pctg}%`;
                row.appendChild(fatPercentageCell);
            
                const fatMassCell = document.createElement('td');
                fatMassCell.textContent = parseFloat(entry.fat_mass).toFixed(2);
                row.appendChild(fatMassCell);
            
                table.appendChild(row);
            });

            userStatContainer.appendChild(table);
        } else {
            document.getElementById("user-stat").innerHTML = 'Error fetching data';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById("user-stat").innerHTML = 'Fetch error occurred';
    }
};

document.getElementById('weight-entry').addEventListener('submit', function (event) {
    event.preventDefault();

    const date = document.getElementById('date_input').value.trim();
    const weight = document.getElementById('weight_input').value.trim();
    const fat_pctg = document.getElementById('fat_pctg_input').value.trim();

    weightEntry(date, weight, fat_pctg);
});

function weightEntry(date, weight, fat_pctg) {
    const apiEndpoint2 = `${apiBaseUrl}/check-weight`;
    const token = localStorage.getItem('authToken');

    if (!token) {
        document.getElementById('message').textContent = 'Unauthorized: Please log in first.';
        return;
    }

    fetch(apiEndpoint2, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        mode: 'cors',
        body: JSON.stringify({ date, weight, fat_pctg })
    }).then(async (response) => {
        const data = await response.json();
        if (response.ok) {
            document.getElementById('message').textContent = data.message;
        } else {
            document.getElementById('message').textContent = data.message;
        }
    })
    .catch((error) => {
        console.error('Error submitting the form:', error);
        document.getElementById('message').textContent = 'An error occurred while submitting the form.';
    });
} 