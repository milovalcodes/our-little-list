param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][int]$Size
)
# Only normalize generated artwork dimensions; leave the masters untouched.
Add-Type -AssemblyName System.Drawing
$original = [System.Drawing.Image]::FromFile($Source)
$bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($original, 0, 0, $Size, $Size)
  $bitmap.Save($Output, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  $original.Dispose()
}
