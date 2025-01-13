# Start Docker container in detached mode
docker run -d -p 8000:8000 amazon/dynamodb-local

# Step 1: Invoke check-username function to get the token
# Build the SAM app first
sam build

# Invoke the function locally and capture the response
$TOKEN_RESPONSE = sam local invoke ApiHandler -e ./sam_local_json/check_username_event.json

# The body is a stringified JSON, so we need to parse it
$BODY = ($TOKEN_RESPONSE | jq -r '.body') | ConvertFrom-Json

# Now extract the token from the parsed body
$TOKEN = $BODY.token

# Verify the token was extracted
if (-not $TOKEN) {
    Write-Host "Failed to extract token from check-username response." -ForegroundColor Red
    exit 1
}

Write-Host "Extracted token: $TOKEN"

# Step 2A: Update check_weight_event.json with the token
# Update the Authorization header in check_weight_event.json with the extracted token
$UPDATED_CHECK_WEIGHT_EVENT = jq --arg token "Bearer $TOKEN" '.headers.Authorization = $token' ./sam_local_json/check_weight_event.json

# Save the updated JSON content to a new file without BOM
$UPDATED_CHECK_WEIGHT_EVENT | Set-Content -Path ./sam_local_json/check_weight_event.json -Force

Write-Host "Updated check_weight_event.json with token."

#Invoke sam local invoke
$SAM_INVOKE_RESPONSE = sam local invoke ApiHandler -e ./sam_local_json/check_weight_event.json
Write-Host "SAM local invocation complete. Response:"
Write-Host $SAM_INVOKE_RESPONSE

# Step 2B: Update check_weight_event.json with the token
# Update the Authorization header in check_weight_event.json with the extracted token
$UPDATED_CHECK_WEIGHT_EVENT = jq --arg token "Bearer $TOKEN" '.headers.Authorization = $token' ./sam_local_json/check_weight_event2.json

# Save the updated JSON content to a new file
$UPDATED_CHECK_WEIGHT_EVENT | Set-Content -Path ./sam_local_json/check_weight_event2.json

Write-Host "Updated check_weight_event2.json with token."

#Invoke sam local invoke
$SAM_INVOKE_RESPONSE = sam local invoke ApiHandler -e ./sam_local_json/check_weight_event2.json
Write-Host "SAM local invocation complete. Response:"
Write-Host $SAM_INVOKE_RESPONSE


# Step 3: Check the input data in DynamoDB
Write-Host "Scanning the Weight table in DynamoDB..."
$DYNAMODB_SCAN = aws dynamodb scan --table-name Weights --endpoint-url http://localhost:8000

# Output the result of the scan
Write-Host "DynamoDB Scan Results:"
Write-Host $DYNAMODB_SCAN

# Step 4: Check the input data in DynamoDB (Login already)
# Update the Authorization header in check_weight_event.json with the extracted token
$UPDATED_CHECK_WEIGHT_EVENT = jq --arg token "Bearer $TOKEN" '.headers.Authorization = $token' ./sam_local_json/get_user_stat.json

# Save the updated JSON content to a new file without BOM
$UPDATED_CHECK_WEIGHT_EVENT | Set-Content -Path ./sam_local_json/get_user_stat.json -Force

Write-Host "Updated get_user_stat.json with token."

# Pause to keep the terminal open (optional)
Read-Host -Prompt "Press Enter to exit"
