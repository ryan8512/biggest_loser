document.getElementById('usernameForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const username = document.getElementById('username').value.trim();

    // Simple validation to check if username is empty
    if (!username) {
        document.getElementById('message').textContent = "Username cannot be empty!";
        return;
    }

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
        weightEntry(date,weight,fat_pctg);
    }
});

function checkUsernameExistence(username) {
    // Example API endpoint (you would replace this with your actual API endpoint)
    const apiEndpoint = `http://localhost:3000/check-username`;

    fetch(apiEndpoint, {
        method: 'POST',  // Assuming a GET request, but it could be POST  on your API
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username})
    })
    .then(response => response.text()) // Parse the response as JSON
    .then(data => {
        // document.getElementById('message').textContent = data.message;
        // Hide the first form
        usernameForm.style.display = 'none';
        document.getElementById('formContainer').innerHTML = data;
    })
    .catch(error => {
        console.error('Error submitting the form:', error);
        formContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    });
}

function weightEntry(date,weight,fat_pctg) {
    // Example API endpoint (you would replace this with your actual API endpoint)
    const apiEndpoint2 = `http://localhost:3000/check-weight`;

    fetch(apiEndpoint2, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({date,weight,fat_pctg})
    })
    .then(response => response.json()) // Parse the response as JSON
    .then(data => {
        document.getElementById('message').textContent = data.message;
    })
    .catch(error => {
        console.error('Error submitting the form:', error);
        formContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    });
}