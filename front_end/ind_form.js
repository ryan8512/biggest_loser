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

    await showUserStat(event,'/get-user-stat', token);
}

async function showUserStat(event, fetch_path, token){
        try {
            let data = ""
            let fetch_id = ""
            
            const response = await fetch(fetch_path,{
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Add the Bearer token
                }
            }); // Send a GET request to the endpoint
            
            if(response.ok){
                fetch_id = fetch_path.replace("/get-", "");
                data = await response.json();
                console.log(data);

                const userStat = data;
            
                // Update the UI with the fetched data
                document.getElementById('weight').innerText = userStat.weight + " kg";
                document.getElementById('fat-pctg').innerText = userStat.fat_pctg + "%";
                document.getElementById('fat-mass').innerText = userStat.fat_mass + " kg";
                
                // Optionally update progress bars or other elements for percentage change
                const weightChange = calculatePercentageChange(userStat.weight);
                document.getElementById('weight-change').innerText = weightChange + "%";
                const fatPctgChange = calculatePercentageChange(userStat.fat_pctg);
                document.getElementById('fat-pctg-change').innerText = fatPctgChange + "%";

            }  else {
                document.getElementById(fetch_id).innerHTML = 'Error fetching data';
            }
        }catch (error) {
            console.error('Fetch error:', error);
            document.getElementById("user-stat").innerHTML = 'Fetch error occurred';
        }
        
};

document.getElementById('weight-entry').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission behavior

    const date = document.getElementById('date').value.trim();
    const weight = document.getElementById('weight').value.trim();
    const fat_pctg = document.getElementById('fat-percentage').value.trim();

    // Call the API to check if the username exists
    weightEntry(username,date,weight,fat_pctg);

});

function weightEntry(date, weight, fat_pctg) {
    const apiEndpoint2 = `/check-weight`;
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
        body: JSON.stringify({date, weight, fat_pctg }),
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