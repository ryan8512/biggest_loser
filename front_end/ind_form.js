const apiBaseUrl = "https://vx5pzolkud.execute-api.us-east-1.amazonaws.com/Prod"; // Replace this with your actual API base URL

document.getElementById('logout_button').addEventListener('click', (event) => {
    localStorage.removeItem('authToken');
    window.location.href = '/index.html';
});

window.onload = async (event) => {
    const token = localStorage.getItem('authToken'); 

    // Ensure the token exists before sending the request
    if (!token) {
        console.error('No token found');
        return;
    }

    try {
        // Split the token into parts
        const tokenParts = token.split('.');
    
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }
    
        // Decode the payload (second part of the token)
        const payload = JSON.parse(atob(tokenParts[1])); // atob decodes Base64 strings
    
        // Extract the username from the payload
        const username = payload.username || 'Unknown User'; // Adjust this key based on your token structure
    
        // Update the DOM with the username
        document.getElementById('username_id').innerHTML = `<b><i>${username}</i></b>`;
    
        // Optionally, call the showUserStat function with the token
        await showUserStat(event, `${apiBaseUrl}/get-user-stat`, token);
    } catch (err) {
        console.error('Error decoding token:', err);
    }
};

async function showUserStat(event, fetch_path, token) {
    try {
        let data = "";
        let fetch_id = "";

        const response = await fetch(fetch_path, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Add the Bearer token
            },
            mode: 'cors'
        }); // Send a GET request to the endpoint

        if(response.ok){
            fetch_id = fetch_path.replace("/get-", "");
            data = await response.json();
            console.log(data);

            const userStat = data;

            // Update the UI with the fetched data
            document.getElementById('weight').innerText = parseFloat(userStat.weight).toFixed(2) + " kg";
            document.getElementById('fat-pctg').innerText = parseFloat(userStat.fat_pctg).toFixed(2) + "%";
            document.getElementById('fat-mass').innerText = parseFloat(userStat.fat_mass).toFixed(2) + " kg";

        } else {
            document.getElementById(fetch_id).innerHTML = 'Error fetching data';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById("user-stat").innerHTML = 'Fetch error occurred';
    }
};

document.getElementById('weight-entry').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission behavior

    const date = document.getElementById('date_input').value.trim();
    const weight = document.getElementById('weight_input').value.trim();
    const fat_pctg = document.getElementById('fat_pctg_input').value.trim();

    // Call the API to check if the username exists
    weightEntry(date, weight, fat_pctg);
});

function weightEntry(date, weight, fat_pctg) {
    const apiEndpoint2 = `${apiBaseUrl}/check-weight`;
    const token = localStorage.getItem('authToken'); // Retrieve the token from localStorage

    if (!token) {
        document.getElementById('message').textContent = 'Unauthorized: Please log in first.';
        return;
    }

    fetch(apiEndpoint2, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // Add the token to the Authorization header
        },
        mode: 'cors',
        body: JSON.stringify({ date, weight, fat_pctg })
    }).then(async (response) => {
        const data = await response.json();
        if (response.ok) {
            document.getElementById('message').textContent = data.message;
        } else {
            // Error from the server
            document.getElementById('message').textContent = data.message;
        }
    })
    .catch((error) => {
        // Network or unexpected error
        console.error('Error submitting the form:', error);
        document.getElementById('message').textContent = 'An error occurred while submitting the form.';
    });
}

function calculatePercentageChange(currentValue) {
    const previousValue = 100; // You can use actual previous values from your data
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return change.toFixed(2); // Format to two decimal places
}
