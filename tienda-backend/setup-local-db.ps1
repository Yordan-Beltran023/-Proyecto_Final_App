$dbDir = "C:\Users\sena\Documents\Proyecto_Final\PROYECTO_FIN_TIENDA\tienda-backend"
$envPath = Join-Path $dbDir ".env"

$pid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1)
if ($pid) {
    Stop-Process -Id $pid -Force
    Write-Host "Killed PID $pid on port 3000"
}

docker rm -f tienda-postgres 2>$null | Out-Null

docker run --name tienda-postgres -e POSTGRES_USER=tienda -e POSTGRES_PASSWORD=tienda123 -e POSTGRES_DB=tienda -p 5432:5432 -d postgres:16 | Out-Null

$envContent = @"
DB_USER=tienda
DB_HOST=localhost
DB_NAME=tienda
DB_PASSWORD=tienda123
DB_PORT=5432
JWT_SECRET=tienda_secret_2026
"@
$envContent | Set-Content -Path $envPath

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    docker exec tienda-postgres psql -U tienda -d tienda -tAc "SELECT 1" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
}

if (-not $ready) {
    throw "Postgres no quedó listo"
}

docker cp "$dbDir\schema.sql" tienda-postgres:/tmp/schema.sql

docker exec -i tienda-postgres psql -U tienda -d tienda -f /tmp/schema.sql
node "$dbDir\seedProducts.js"
node "$dbDir\createAdmin.js"

Write-Host "SETUP_OK"
