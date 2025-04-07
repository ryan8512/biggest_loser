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
        
        const medalColors = [
            { r: 254, g: 216, b: 0 },
            { r: 175, g: 174, b: 168 },
            { r: 210, g: 151, b: 89 }
        ];
        // Iterate through the data and dynamically create bars
        data.forEach((entry, index) => {
            // Create the outer bar container
            const barContainer = document.createElement('div');
            barContainer.classList.add('bar-container');

            // Create the circle for the fat percentage and set background color and text
            const circle = document.createElement('div');
            circle.classList.add('circle');
            if(entry.fatLossPercentage>=0){
                circle.style.backgroundColor = `hsl(166, 97%, ${20 + (index * 3)}%)`; // Adjust the color based on fat percentage
            }else{
                circle.style.backgroundColor = `hsl(0, 49%, ${56 - (index * 2)}%)`; // Adjust the color based on fat percentage
            }
            
            const percentageText = document.createElement('h4');
            percentageText.innerHTML = `<b>${entry.fatLossPercentage.toFixed(1)}%</b>`;
            circle.appendChild(percentageText);

            // Create the label (person's name)
            const label = document.createElement('div');
            label.classList.add('label');
            const personName = document.createElement('span');
            personName.textContent = entry.name; // Assuming 'name' is a field in your data
            label.appendChild(personName);

            // Create the medal SVG (ranking icon)
            if(index<3) {
                const { r, g, b } = medalColors[index]; // Destructuring the color object
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
                
                // Add the medal to the label
                label.appendChild(medalSvg);
            }

            // Append the circle and label to the bar container
            barContainer.appendChild(circle);
            barContainer.appendChild(label);

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
            window.location.href = 'index_form.html'; // Redirect to the presigned URL
        }else {
            const error = await response.json();
            document.getElementById('message').textContent = error.message;
        }
    } catch (error) {
        document.getElementById('message').textContent = 'An error occurred';
    }
}
