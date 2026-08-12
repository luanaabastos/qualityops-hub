# Test endpoints
Write-Host "Testing API Health Endpoint..."
try {
    $health = [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
    $response = (New-Object System.Net.WebClient).DownloadString("http://localhost:3001/api/health")
    Write-Host "Health Response: $response"
} catch {
    Write-Host "Error: $_"
}

Write-Host "`nTesting Frontend Endpoint..."
try {
    $frontend = (New-Object System.Net.WebClient).DownloadString("http://localhost:5173")
    if ($frontend.Contains("QualityOps")) {
        Write-Host "Frontend is responding (contains 'QualityOps')"
    } else {
        Write-Host "Frontend returned content: " + $frontend.Substring(0, [Math]::Min(200, $frontend.Length))
    }
} catch {
    Write-Host "Error: $_"
}

Write-Host "`nTesting Dashboard API..."
try {
    $dashboard = (New-Object System.Net.WebClient).DownloadString("http://localhost:3001/api/dashboard")
    $obj = $dashboard | ConvertFrom-Json
    Write-Host "Dashboard summary: $(($obj.summary | ConvertTo-Json -Compress))"
} catch {
    Write-Host "Error: $_"
}
