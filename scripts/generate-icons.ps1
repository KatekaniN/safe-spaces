# Generates Safe Spaces PWA icons from the Haven arch logo geometry (32-unit viewBox)
Add-Type -AssemblyName System.Drawing

$plum = [System.Drawing.Color]::FromArgb(255, 0x87, 0x64, 0xC1)
$white = [System.Drawing.Color]::FromArgb(255, 0xFF, 0xFF, 0xFF)

function New-Icon([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded-square plum background
  $r = [float]($size * 0.22)
  $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bgPath.AddArc(0, 0, 2 * $r, 2 * $r, 180, 90)
  $bgPath.AddArc($size - 2 * $r, 0, 2 * $r, 2 * $r, 270, 90)
  $bgPath.AddArc($size - 2 * $r, $size - 2 * $r, 2 * $r, 2 * $r, 0, 90)
  $bgPath.AddArc(0, $size - 2 * $r, 2 * $r, 2 * $r, 90, 90)
  $bgPath.CloseFigure()
  $plumBrush = New-Object System.Drawing.SolidBrush($plum)
  $g.FillPath($plumBrush, $bgPath)

  # Glyph transform: 32-unit design centered at 66% of canvas
  $s = [float]($size * 0.66 / 32.0)
  $ox = [float](($size - 32.0 * $s) / 2.0)
  $oy = [float](($size - 32.0 * $s) / 2.0)
  function X([double]$v) { return [float]($ox + $v * $s) }
  function Y([double]$v) { return [float]($oy + $v * $s) }
  function W([double]$v) { return [float]($v * $s) }

  # Outer arch: legs at x4..28, dome bbox (4,3,24,26), floor y29
  $outer = New-Object System.Drawing.Drawing2D.GraphicsPath
  $outer.AddLine((X 4), (Y 29), (X 4), (Y 16))
  $outer.AddArc((X 4), (Y 3), (W 24), (W 26), 180, 180)
  $outer.AddLine((X 28), (Y 16), (X 28), (Y 29))
  $outer.CloseFigure()
  $whiteBrush = New-Object System.Drawing.SolidBrush($white)
  $g.FillPath($whiteBrush, $outer)

  # Inner doorway cutout: bbox (11,14,10,10) dome + legs to floor
  $inner = New-Object System.Drawing.Drawing2D.GraphicsPath
  $inner.AddLine((X 11), (Y 29), (X 11), (Y 19))
  $inner.AddArc((X 11), (Y 14), (W 10), (W 10), 180, 180)
  $inner.AddLine((X 21), (Y 19), (X 21), (Y 29))
  $inner.CloseFigure()
  $g.FillPath($plumBrush, $inner)

  # Person dot (plum, on the dome above the doorway)
  $g.FillEllipse($plumBrush, (X 13.9), (Y 7.6), (W 4.2), (W 4.2))

  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$sizes = 48, 72, 96, 128, 144, 152, 192, 256, 384, 512
foreach ($sz in $sizes) {
  $out = Join-Path $PSScriptRoot "..\public\icons\icon-${sz}x${sz}.png"
  New-Icon $sz ([System.IO.Path]::GetFullPath($out))
  Write-Host "wrote icon-${sz}x${sz}.png"
}
