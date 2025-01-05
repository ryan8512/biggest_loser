let username = "";

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

document.getElementById('formContainer').addEventListener('submit', function(event) {
    if (event.target && event.target.id === 'weightEntry') {
        event.preventDefault(); // Prevent the form from submitting normally

        const date = document.getElementById('date').value.trim();
        const weight = document.getElementById('weight').value.trim();
        const fat_pctg = document.getElementById('fat_pctg').value.trim();

        // Call the API to check if the username exists
        weightEntry(username,date,weight,fat_pctg);
    }
});

document.getElementById("leaderboard").addEventListener('click', async (event) => {
    try {
        reset_display();
        const response = await fetch('/get-leaderboard'); // Send a GET request to the endpoint
        if (response.ok) {
            const data = await response.json();

            // Create a table dynamically
            const table = document.createElement('table');
            table.border = "1"; // Add a border for better visibility

            // Add table headers (assuming the first object's keys are representative)
            const headers = Object.keys(data[0]);
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header; // Set the column name
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Add table rows
            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const tr = document.createElement('tr');
                headers.forEach(header => {
                    const td = document.createElement('td');
                    td.textContent = row[header]; // Fill cell with corresponding data
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            // Display the table in the result div
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = ''; // Clear previous content
            resultDiv.appendChild(table);
        } else {
            document.getElementById('result').innerHTML = 'Error fetching data';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        document.getElementById('result').innerHTML = 'Fetch error occurred';
    }
});

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