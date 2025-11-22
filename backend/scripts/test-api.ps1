# PowerShell script to test signup and OTP verification
# Usage: .\scripts\test-api.ps1

$API_URL = "http://localhost:4000/api"
$email = "test$([DateTimeOffset]::Now.ToUnixTimeSeconds())@example.com"
$name = "Test User"
$password = "Test1234!"

Write-Host "🧪 Testing Signup and OTP Verification Flow`n" -ForegroundColor Cyan
Write-Host "Email: $email"
Write-Host "Name: $name"
Write-Host "Password: $password`n"

# Step 1: Signup
Write-Host "📝 Step 1: Signup..." -ForegroundColor Yellow
try {
    $signupBody = @{
        name = $name
        email = $email
        password = $password
    } | ConvertTo-Json

    $signupResponse = Invoke-RestMethod -Uri "$API_URL/auth/signup" `
        -Method Post `
        -ContentType "application/json" `
        -Body $signupBody

    Write-Host "✅ Signup successful!" -ForegroundColor Green
    Write-Host "Response: $($signupResponse | ConvertTo-Json -Depth 3)`n"
    Write-Host "💡 Check your email or server console for the OTP code`n" -ForegroundColor Yellow

    # Wait a bit
    Write-Host "⏳ Waiting 2 seconds for OTP to be generated...`n" -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    # Step 2: Get OTP from user
    Write-Host "📧 Step 2: OTP Verification" -ForegroundColor Yellow
    $otp = Read-Host "Enter the OTP code from your email or server console"

    if ([string]::IsNullOrWhiteSpace($otp)) {
        Write-Host "❌ OTP is required!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Using OTP: $otp`n" -ForegroundColor Cyan

    # Step 3: Verify OTP
    Write-Host "🔐 Step 3: Verifying OTP..." -ForegroundColor Yellow
    try {
        $verifyBody = @{
            email = $email
            otp = $otp
            purpose = "signup"
        } | ConvertTo-Json

        $verifyResponse = Invoke-RestMethod -Uri "$API_URL/auth/verify-otp" `
            -Method Post `
            -ContentType "application/json" `
            -Body $verifyBody

        Write-Host "✅ OTP Verification successful!" -ForegroundColor Green
        Write-Host "Response: $($verifyResponse | ConvertTo-Json -Depth 3)`n"

        if ($verifyResponse.token) {
            Write-Host "🎉 User is now verified and logged in!" -ForegroundColor Green
            Write-Host "Token: $($verifyResponse.token.Substring(0, 20))...`n"
        }

        # Step 4: Test Login
        Write-Host "🔑 Step 4: Testing Login..." -ForegroundColor Yellow
        try {
            $loginBody = @{
                email = $email
                password = $password
            } | ConvertTo-Json

            $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" `
                -Method Post `
                -ContentType "application/json" `
                -Body $loginBody

            Write-Host "✅ Login successful!" -ForegroundColor Green
            Write-Host "Response: $($loginResponse | ConvertTo-Json -Depth 3)`n"
            Write-Host "✅ All tests passed!" -ForegroundColor Green

        } catch {
            Write-Host "❌ Login failed!" -ForegroundColor Red
            Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
            Write-Host "Error: $($_.ErrorDetails.Message)"
        }

    } catch {
        Write-Host "❌ OTP Verification failed!" -ForegroundColor Red
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error: $($errorResponse.error)"
        
        if ($errorResponse.error -eq "invalid_otp") {
            Write-Host "`n💡 The OTP you entered is incorrect. Check the email or server console." -ForegroundColor Yellow
        } elseif ($errorResponse.error -eq "otp_expired") {
            Write-Host "`n💡 The OTP has expired. Request a new one." -ForegroundColor Yellow
        }
    }

} catch {
    Write-Host "❌ Signup failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($errorResponse.error)"
    
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "`n💡 User already exists. Try with a different email or verify existing account." -ForegroundColor Yellow
    }
}

