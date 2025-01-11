let username = "";
let debug_setting = 0;

document.getElementById('usernameForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    username = document.getElementById('username').value.trim();

    // Simple validation to check if username is empty
    if (!username) {
        document.getElementById('message').textContent = "Username cannot be empty!";
        return;
    }

    //Reset the output message
    reset_display();

    // Call the API to check if the username exists
    checkUsernameExistence(username);
});

// document.getElementById('formContainer').addEventListener('submit', function(event) {
//     if (event.target && event.target.id === 'weightEntry') {
//         event.preventDefault(); // Prevent the form from submitting normally

//         const date = document.getElementById('date').value.trim();
//         const weight = document.getElementById('weight').value.trim();
//         const fat_pctg = document.getElementById('fat_pctg').value.trim();

//         // Call the API to check if the username exists
//         weightEntry(username,date,weight,fat_pctg);
//     }
// });

window.onload = async (event) => {
    // Call your function to fetch and display the leaderboard here
    await showLeaderboard(event);
};

async function showLeaderboard(event){
    try {
        //reset_display(); // Assuming this resets any previous display, keep it here
        let data = ""
        // Dummy data to simulate the API response
        if(debug_setting == 1){
            data = [
                { "name": "Person 1", "fatLossPercentage": 80 },
                { "name": "Person 2", "fatLossPercentage": 60 },
                { "name": "Person 3", "fatLossPercentage": 40 }
            ];
        }else{
            const response = await fetch('/get-leaderboard'); // Send a GET request to the endpoint

            if(response.ok){
                data = await response.json();
            }  else {
                document.getElementById('weekly-leaderboard').innerHTML = 'Error fetching data';
            }
        }
        
        // Get the container where the leaderboard should be displayed
        const leaderboardContainer = document.getElementById('weekly-leaderboard');
        // Clear any previous content
        leaderboardContainer.innerHTML = `
            <h5 class="header-font"><b>Week 1 Ranking</b></h5>
            <h6 class="header-font">By Fat Percentage (%) Loss</h6>
            <div style="height: 15px;"></div>
        `; // Reset title and other content
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
            bar.style.backgroundColor = `hsl(210, 100%, ${20 + index * 5}%)`; // Change the color based on index
            // Append the label and bar to the bar container
            barContainer.appendChild(label);
            barContainer.appendChild(bar);
            // Append the bar container to the leaderboard
            leaderboardContainer.appendChild(barContainer);
        });
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById('weekly-leaderboard').innerHTML = 'Fetch error occurred';
    }
};

function checkUsernameExistence(username) {
    // Example API endpoint (you would replace this with your actual API endpoint)
    const apiEndpoint = `/check-username`;

    fetch(apiEndpoint, {
        method: 'POST',  // Assuming a GET request, but it could be POST  on your API
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username})
    })
    .then(async (response) => {
        if(response.ok){
            hide_display();
            const html = await response.text();
            document.getElementById('formContainer').innerHTML = html;
            document.getElementById('home_button').style.display = 'block'; //Enable the home button
        }
        else{
            const error = await response.json();
            document.getElementById('message').textContent = error.message;
        }
    })
    .catch(error => {
        document.getElementById('message').textContent = error;
    });
}

function weightEntry(username,date,weight,fat_pctg) {
    // Example API endpoint (you would replace this with your actual API endpoint)
    const apiEndpoint2 = `/check-weight`;

    fetch(apiEndpoint2, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username,date,weight,fat_pctg})
    })
    .then(response => response.json()) // Parse the response as JSON
    .then(data => {
        hide_display();
        document.getElementById('home_button').style.display = 'block'; //Enable the home button
        document.getElementById('message').textContent = data.message;
    })
    .catch(error => {
        console.error('Error submitting the form:', error);
        formContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    });
}

function reset_display(){
    document.getElementById('message').innerHTML = ""; // Reset username message
    document.getElementById('result').innerHTML = ''; // Clear previous content
}

function hide_display(){
    document.getElementById('usernameForm').innerHTML = ""; // Hide the first form
    document.getElementById('leaderboard_button').innerHTML = ""; 
    document.getElementById('formContainer').innerHTML = ""; 
}