let username = "";
let debug_setting = 0;

const apiBaseUrl = "https://r58t6xl40g.execute-api.us-east-1.amazonaws.com/Prod"; // Replace with your actual API URL

document.getElementById('usernameForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    username = document.getElementById('username').value.trim();

    // Simple validation to check if username is empty
    if (!username) {
        document.getElementById('message').textContent = "Username cannot be empty!";
        return;
    }
    // Call the API to check if the username exists
    checkUsernameExistence(username);
});

window.onload = async (event) => {
    // Call your function to fetch and display the leaderboard here
    await showLeaderboard(event, '/get-weekly-leaderboard');
    await showLeaderboard(event, '/get-overall-leaderboard');
};

async function showLeaderboard(event, fetch_path){
    try {
        let data = ""
        let fetch_id = ""
        
        // Dummy data to simulate the API response
        if(debug_setting == 1){
            data = [
                { "name": "Person 1", "fatLossPercentage": 80 },
                { "name": "Person 2", "fatLossPercentage": 60 },
                { "name": "Person 3", "fatLossPercentage": 40 }
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
                fetch_id = fetch_path.replace("/get-", "");
                data = await response.json();
            }  else {
                document.getElementById(fetch_id).innerHTML = 'Error fetching data';
            }
        }
        
        // Get the container where the leaderboard should be displayed
        const leaderboardContainer = document.getElementById(fetch_id);
        // Iterate through the data and dynamically create bars
        data.forEach((entry, index) => {
            const barContainer = document.createElement('div');
            barContainer.classList.add('bar-container');
            // Create the label (name of the person)
            const label = document.createElement('div');
            label.classList.add('label');
            label.textContent = entry.name; // Assuming 'name' is a field in your data
            // Create the bar (fat percentage loss)
            const bar = document.createElement('div');
            bar.classList.add('bar');
            bar.textContent = `${entry.fatLossPercentage}%`; // Assuming 'fatLossPercentage' is a field in your data
            bar.style.width = `${entry.fatLossPercentage}%`; // Set the width of the bar according to fat loss
            if(fetch_id === 'weekly-leaderboard'){
                bar.style.backgroundColor = `hsl(210, 100%, ${20 + index * 5}%)`; // Change the color based on index
            }else{
                bar.style.backgroundColor = `hsl(30, 60%, ${20 + index * 5}%)`; // Change the color based on index
            }
            
            // Append the label and bar to the bar container
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            // Append the bar container to the leaderboard
            leaderboardContainer.appendChild(barContainer);
        });
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById(fetch_id).innerHTML = 'Fetch error occurred';
    }
};

async function checkUsernameExistence(username) {
    // Use the full API URL here as well
    const apiEndpoint = `${apiBaseUrl}/check-username`;
    const apiEndpoint2 = `${apiBaseUrl}/check-index-form`;

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username }),
            mode:'cors'
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.token);
            const responseForm = await fetch(apiEndpoint2, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: data.token }),
                mode:'cors'
            });

            if(responseForm.ok){
                const data = await responseForm.json();
                window.location.href = data.url; // Redirect to the presigned URL
            }else{
                document.getElementById('message').textContent = "Token invalid or expired"
            }

        } else {
            const error = await response.json();
            document.getElementById('message').textContent = error.message;
        }
    } catch (error) {
        document.getElementById('message').textContent = 'An error occurred';
    }
}
