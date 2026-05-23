fn main() {
    println!("Testing UDP broadcast to 255.255.255.255...");
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        let _ = socket.set_broadcast(true);
        match socket.send_to(b"trigger", "255.255.255.255:9") {
            Ok(bytes) => println!("Sent {} bytes to broadcast", bytes),
            Err(e) => println!("Error sending to broadcast: {}", e),
        }
    }

    println!("Testing UDP multicast to 224.0.0.251...");
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        match socket.send_to(b"trigger", "224.0.0.251:5353") {
            Ok(bytes) => println!("Sent {} bytes to multicast", bytes),
            Err(e) => println!("Error sending to multicast: {}", e),
        }
    }
}
