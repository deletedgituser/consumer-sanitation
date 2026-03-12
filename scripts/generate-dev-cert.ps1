param(
  [string] $OutDir = "certificates",
  [int] $CertDays = 825,
  [switch] $Trust
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string] $Message) {
  Write-Host "[devcert] $Message"
}

function Convert-ToPem([string] $Type, [byte[]] $DerBytes) {
  $b64 = [System.Convert]::ToBase64String($DerBytes)
  $wrapped = ($b64 -split "(.{1,64})" | Where-Object { $_ -and $_.Trim().Length -gt 0 }) -join "`n"
  return "-----BEGIN $Type-----`n$wrapped`n-----END $Type-----`n"
}

function Write-DerLength([System.IO.Stream] $Stream, [int] $Len) {
  if ($Len -lt 128) {
    $Stream.WriteByte([byte] $Len) | Out-Null
    return
  }

  $tmp = New-Object System.Collections.Generic.List[byte]
  $v = $Len
  while ($v -gt 0) {
    $tmp.Insert(0, [byte] ($v -band 0xFF))
    $v = $v -shr 8
  }

  $Stream.WriteByte([byte] (0x80 -bor $tmp.Count)) | Out-Null
  foreach ($b in $tmp) {
    $Stream.WriteByte($b) | Out-Null
  }
}

function Write-DerInteger([System.IO.Stream] $Stream, [byte[]] $Bytes) {
  if ($Bytes -eq $null) { $Bytes = @() }
  $i = 0
  while ($i -lt $Bytes.Length -and $Bytes[$i] -eq 0) { $i++ }
  $val = if ($i -ge $Bytes.Length) { [byte[]]@(0) } else { [byte[]]@($Bytes[$i..($Bytes.Length - 1)]) }
  $val = [byte[]]$val
  if (($val[0] -band 0x80) -ne 0) { $val = [byte[]](@(0) + $val) }

  $Stream.WriteByte(0x02) | Out-Null
  Write-DerLength -Stream $Stream -Len $val.Length
  $Stream.Write($val, 0, $val.Length) | Out-Null
}

function Convert-RsaParametersToPkcs1Der([System.Security.Cryptography.RSAParameters] $P) {
  $ms = New-Object System.IO.MemoryStream
  try {
    $inner = New-Object System.IO.MemoryStream
    try {
      Write-DerInteger -Stream $inner -Bytes ([byte[]]@(0)) # version
      Write-DerInteger -Stream $inner -Bytes $P.Modulus
      Write-DerInteger -Stream $inner -Bytes $P.Exponent
      Write-DerInteger -Stream $inner -Bytes $P.D
      Write-DerInteger -Stream $inner -Bytes $P.P
      Write-DerInteger -Stream $inner -Bytes $P.Q
      Write-DerInteger -Stream $inner -Bytes $P.DP
      Write-DerInteger -Stream $inner -Bytes $P.DQ
      Write-DerInteger -Stream $inner -Bytes $P.InverseQ

      $payload = $inner.ToArray()
      $ms.WriteByte(0x30) | Out-Null
      Write-DerLength -Stream $ms -Len $payload.Length
      $ms.Write($payload, 0, $payload.Length) | Out-Null
      return $ms.ToArray()
    }
    finally {
      $inner.Dispose()
    }
  }
  finally {
    $ms.Dispose()
  }
}

function Install-TrustedCertCurrentUser([System.Security.Cryptography.X509Certificates.X509Certificate2] $Cert, [string] $FriendlyName) {
  $certToStore = $Cert

  try { $certToStore.FriendlyName = $FriendlyName } catch { }

  $myStore = [System.Security.Cryptography.X509Certificates.X509Store]::new("My", "CurrentUser")
  $rootStore = [System.Security.Cryptography.X509Certificates.X509Store]::new("Root", "CurrentUser")

  $myStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
  $rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)

  try {
    foreach ($c in @($myStore.Certificates | Where-Object { $_.FriendlyName -eq $FriendlyName })) { $myStore.Remove($c) }
    foreach ($c in @($rootStore.Certificates | Where-Object { $_.FriendlyName -eq $FriendlyName })) { $rootStore.Remove($c) }

    $myStore.Add($certToStore)
    $rootStore.Add([System.Security.Cryptography.X509Certificates.X509Certificate2]::new($certToStore.RawData))
  }
  finally {
    $myStore.Close()
    $rootStore.Close()
  }
}

Write-Info "Generating a self-signed localhost cert for Next.js dev HTTPS."
Write-Info "Tip: you can also trust it with -Trust (may prompt)."

if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$keyPath = Join-Path $OutDir "localhost-key.pem"
$certPath = Join-Path $OutDir "localhost.pem"
$cerPath = Join-Path $OutDir "localhost.cer"
Remove-Item -Force -ErrorAction SilentlyContinue $keyPath, $certPath, $cerPath

$friendlyName = "ConsumerSanitation localhost (dev)"
$subject = "CN=localhost, O=ConsumerSanitation"

$rsa = [System.Security.Cryptography.RSA]::Create(2048)
$req = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
  $subject,
  $rsa,
  [System.Security.Cryptography.HashAlgorithmName]::SHA256,
  [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)

$req.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true))
$req.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor
      [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment,
    $true
  )
)
$eku = [System.Security.Cryptography.OidCollection]::new()
$eku.Add([System.Security.Cryptography.Oid]::new("1.3.6.1.5.5.7.3.1")) | Out-Null # serverAuth
$req.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($eku, $true))
$req.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509SubjectKeyIdentifierExtension]::new($req.PublicKey, $false))

$san = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$san.AddDnsName("localhost")
$san.AddIpAddress([System.Net.IPAddress]::Parse("127.0.0.1"))
$san.AddIpAddress([System.Net.IPAddress]::Parse("::1"))
$san.AddIpAddress([System.Net.IPAddress]::Parse("0.0.0.0"))
$req.CertificateExtensions.Add($san.Build($true))

$notBefore = [DateTimeOffset]::Now.AddDays(-1)
$notAfter = $notBefore.AddDays($CertDays)
$cert = $req.CreateSelfSigned($notBefore, $notAfter)

$pfxPassword = [Guid]::NewGuid().ToString("N")
$pfxBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $pfxPassword)
$keyFlags =
  [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet -bor
  [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable
$certPersisted = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($pfxBytes, $pfxPassword, $keyFlags)

$certDer = $certPersisted.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
$keyDer = Convert-RsaParametersToPkcs1Der -P $rsa.ExportParameters($true)

Set-Content -Path $certPath -Value (Convert-ToPem -Type "CERTIFICATE" -DerBytes $certDer) -NoNewline -Encoding ascii
Set-Content -Path $keyPath -Value (Convert-ToPem -Type "RSA PRIVATE KEY" -DerBytes $keyDer) -NoNewline -Encoding ascii
Set-Content -Path $cerPath -Value $certDer -Encoding Byte

Write-Info "Wrote:"
Write-Host "  - $keyPath"
Write-Host "  - $certPath"
Write-Host "  - $cerPath"

if ($Trust) {
  Write-Info "Trusting certificate for current user (Root store)."
  Write-Info "If a Windows prompt appears, approve it then restart your browser."
  Install-TrustedCertCurrentUser -Cert $certPersisted -FriendlyName $friendlyName
}

Write-Info "Done. Start Next.js with:"
Write-Host "  npm run dev:https"
