use futures::stream::{self, StreamExt};
use serde::Serialize;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

#[derive(Serialize, Clone, Debug)]
pub struct DiscoveredFtpServer {
    pub name: String,
    pub hostname: String,
    pub port: u16,
}

pub fn get_local_ipv4() -> Option<Ipv4Addr> {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                if let IpAddr::V4(ipv4) = local_addr.ip() {
                    return Some(ipv4);
                }
            }
        }
    }
    None
}

fn clean_ftp_banner(banner: &str, ip: Ipv4Addr, _port: u16) -> String {
    let trimmed = banner.trim();
    if trimmed.is_empty() {
        return format!("FTP Server ({})", ip);
    }

    let content = if trimmed.starts_with("220") {
        trimmed[3..].trim()
    } else {
        trimmed
    };

    let cleaned = content.replace(['(', ')', '*', '-'], "").trim().to_string();

    if cleaned.is_empty() {
        format!("FTP Server ({})", ip)
    } else {
        let parts: Vec<&str> = cleaned.split('\n').collect();
        let first_line = parts[0].trim();
        if first_line.len() > 32 {
            format!("{}...", &first_line[..29])
        } else {
            first_line.to_string()
        }
    }
}

async fn scan_ip_port(ip: Ipv4Addr, port: u16) -> Option<DiscoveredFtpServer> {
    let addr = SocketAddr::new(IpAddr::V4(ip), port);
    match timeout(Duration::from_millis(300), TcpStream::connect(addr)).await {
        Ok(Ok(mut stream)) => {
            let mut buf = [0u8; 512];
            let banner = match timeout(
                Duration::from_millis(300),
                tokio::io::AsyncReadExt::read(&mut stream, &mut buf),
            )
            .await
            {
                Ok(Ok(n)) if n > 0 => String::from_utf8_lossy(&buf[..n]).to_string(),
                _ => String::new(),
            };
            let name = clean_ftp_banner(&banner, ip, port);
            Some(DiscoveredFtpServer {
                name,
                hostname: ip.to_string(),
                port,
            })
        }
        _ => None,
    }
}

pub async fn run_discovery() -> Vec<DiscoveredFtpServer> {
    let mut targets = Vec::new();

    // Add localhost
    targets.push((Ipv4Addr::new(127, 0, 0, 1), 21));
    targets.push((Ipv4Addr::new(127, 0, 0, 1), 2121));

    if let Some(local_ip) = get_local_ipv4() {
        let octets = local_ip.octets();
        if octets[0] != 127 {
            for i in 1..=254 {
                let ip = Ipv4Addr::new(octets[0], octets[1], octets[2], i);
                targets.push((ip, 21));
                targets.push((ip, 2121));
            }
        }
    } else {
        // Fallback common local networks
        for i in 1..=254 {
            let ip = Ipv4Addr::new(192, 168, 1, i);
            targets.push((ip, 21));
            targets.push((ip, 2121));
        }
    }

    let results = stream::iter(targets)
        .map(|(ip, port)| async move { scan_ip_port(ip, port).await })
        .buffer_unordered(100)
        .collect::<Vec<Option<DiscoveredFtpServer>>>()
        .await;

    let mut servers: Vec<DiscoveredFtpServer> = results.into_iter().flatten().collect();

    // Dedup by hostname + port
    let mut seen = std::collections::HashSet::new();
    servers.retain(|s| seen.insert(format!("{}:{}", s.hostname, s.port)));

    servers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_ftp_banner() {
        let ip = Ipv4Addr::new(127, 0, 0, 1);
        let res = clean_ftp_banner("220 (vsFTPd 3.0.3)\n", ip, 21);
        assert_eq!(res, "vsFTPd 3.0.3");

        let res = clean_ftp_banner("220-FileZilla Server 1.8.2\n", ip, 21);
        assert_eq!(res, "FileZilla Server 1.8.2");

        let res = clean_ftp_banner("", ip, 21);
        assert_eq!(res, "FTP Server (127.0.0.1)");
    }
}
