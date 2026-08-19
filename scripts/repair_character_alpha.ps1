param(
  [string]$AssetDirectory = "public/characters",
  [string]$AssetPattern = "*_transparent_asset.png",
  [int]$Skip = 0
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path $AssetDirectory).Path
$files = Get-ChildItem -LiteralPath $root -Filter $AssetPattern -File | Sort-Object Name | Select-Object -Skip $Skip
$summary = @()

foreach ($file in $files) {
  $source = [System.Drawing.Bitmap]::FromFile($file.FullName)
  $output = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $transparentRgbCleared = 0
  $edgeDespill = 0

  try {
    $graphics = [System.Drawing.Graphics]::FromImage($output)
    try { $graphics.DrawImageUnscaled($source, 0, 0) } finally { $graphics.Dispose() }

    $rectangle = New-Object System.Drawing.Rectangle(0, 0, $output.Width, $output.Height)
    $bitmapData = $output.LockBits($rectangle, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $byteCount = [Math]::Abs($bitmapData.Stride) * $output.Height
      $pixels = New-Object byte[] $byteCount
      [Runtime.InteropServices.Marshal]::Copy($bitmapData.Scan0, $pixels, 0, $byteCount)
      for ($index = 0; $index -lt $byteCount; $index += 4) {
        $blue = [int]$pixels[$index]
        $green = [int]$pixels[$index + 1]
        $red = [int]$pixels[$index + 2]
        $alpha = [int]$pixels[$index + 3]
        if ($alpha -eq 0) {
          if ($red -ne 0 -or $green -ne 0 -or $blue -ne 0) { $transparentRgbCleared++ }
          $pixels[$index] = 0
          $pixels[$index + 1] = 0
          $pixels[$index + 2] = 0
        }
        elseif ($alpha -lt 255 -and $green -gt 70 -and $green -gt ($red * 1.25) -and $green -gt ($blue * 1.15)) {
          $neutralGreen = [Math]::Min($green, [Math]::Round([Math]::Max($red, $blue) * 1.04))
          $pixels[$index + 1] = [byte]$neutralGreen
          $edgeDespill++
        }
      }
      # Chroma-key contamination can remain fully opaque on the one-pixel
      # silhouette edge. Despill only green-dominant pixels adjacent to a
      # transparent/semitransparent pixel so clothing and interior colors are
      # preserved.
      $stride = [Math]::Abs($bitmapData.Stride)
      for ($y = 0; $y -lt $output.Height; $y++) {
        for ($x = 0; $x -lt $output.Width; $x++) {
          $index = ($y * $stride) + ($x * 4)
          $blue = [int]$pixels[$index]
          $green = [int]$pixels[$index + 1]
          $red = [int]$pixels[$index + 2]
          $alpha = [int]$pixels[$index + 3]
          if ($alpha -eq 0 -or $green -le 70 -or $green -le ($red * 1.2) -or $green -le ($blue * 1.1)) { continue }
          $nearTransparent = $false
          for ($dy = -1; $dy -le 1 -and -not $nearTransparent; $dy++) {
            for ($dx = -1; $dx -le 1; $dx++) {
              $nx = $x + $dx
              $ny = $y + $dy
              if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $output.Width -or $ny -ge $output.Height) { continue }
              $neighborIndex = ($ny * $stride) + ($nx * 4)
              if ([int]$pixels[$neighborIndex + 3] -lt 220) { $nearTransparent = $true; break }
            }
          }
          if ($nearTransparent) {
            $neutralGreen = [Math]::Min($green, [Math]::Round([Math]::Max($red, $blue) * 1.04))
            if ($neutralGreen -lt $green) {
              $pixels[$index + 1] = [byte]$neutralGreen
              $edgeDespill++
            }
          }
        }
      }
      [Runtime.InteropServices.Marshal]::Copy($pixels, 0, $bitmapData.Scan0, $byteCount)
    }
    finally {
      $output.UnlockBits($bitmapData)
    }

    $temporaryPath = "$($file.FullName).alpha-repair.tmp.png"
    $output.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $source.Dispose()
    $output.Dispose()
  }

  Move-Item -LiteralPath $temporaryPath -Destination $file.FullName -Force
  $summary += [pscustomobject]@{
    Asset = $file.Name
    TransparentRgbCleared = $transparentRgbCleared
    EdgePixelsDespilled = $edgeDespill
  }
}

$summary
