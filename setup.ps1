#Requires -RunAsAdministrator

Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private

New-NetFirewallRule -DisplayName "DNS" -Protocol UDP -LocalPort 53 -Action Allow -Profile Private

# C:\Windows\System32\LogFiles\Firewall\pfirewall.log
Set-NetFirewallProfile -Profile Domain,Private,Public -LogBlocked True 

Get-NetAdapter | ? Status -eq "Up" | % {
    Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses 127.0.0.1
}