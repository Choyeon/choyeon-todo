Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\public\favicon.png"
$buildDir = Join-Path $PSScriptRoot "..\build"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
Write-Host "Source image: $($sourceImage.Width)x$($sourceImage.Height)"

$sizes = @(16, 32, 48, 64, 128, 256)
$iconImages = @()

foreach ($size in $sizes) {
    $newImage = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $graphics.DrawImage($sourceImage, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
    
    $pngPath = Join-Path $buildDir "icon-${size}x${size}.png"
    $newImage.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Generated: $pngPath"
    
    $iconImages += $newImage
    $graphics.Dispose()
}

$icoPath = Join-Path $buildDir "icon.ico"
$iconImages[0].Save($icoPath, [System.Drawing.Imaging.ImageFormat]::Icon)
Write-Host "Generated: $icoPath"

$pngPath = Join-Path $buildDir "icon.png"
$newImage512 = New-Object System.Drawing.Bitmap(512, 512)
$graphics512 = [System.Drawing.Graphics]::FromImage($newImage512)
$graphics512.Clear([System.Drawing.Color]::Transparent)
$graphics512.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics512.DrawImage($sourceImage, (New-Object System.Drawing.Rectangle(0, 0, 512, 512)))
$newImage512.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated: $pngPath"
$graphics512.Dispose()
$newImage512.Dispose()

$sourceImage.Dispose()
foreach ($img in $iconImages) { $img.Dispose() }

Write-Host "Icon generation complete!"