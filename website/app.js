/* ==========================================================================
   CoDriver Landing Page Interactive Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- Sticky Header Scroll Controller ---
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });


  // --- Ambient Cursor Halo Background Spotlight ---
  window.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
  });


  // --- Speed & Layouts Filter Mock Input Typing ---
  let typingFilterInterval = null;
  const animateFilterTyping = () => {
    const filterInput = document.querySelector('#tab-speed span[style*="color: var(--text-white)"]');
    const matchRows = document.querySelectorAll('#tab-speed .speed-item-row');
    if (!filterInput || !matchRows) return;

    // Reset states
    filterInput.textContent = "";
    matchRows.forEach(row => {
      row.style.opacity = "0.3";
      row.style.borderColor = "rgba(255,255,255,0.04)";
      row.style.background = "rgba(255,255,255,0.02)";
      const statusSpan = row.querySelector('span[style*="font-weight"]');
      if (statusSpan) {
        statusSpan.textContent = "";
        statusSpan.style.color = "var(--text-secondary)";
      }
    });
    clearInterval(typingFilterInterval);

    const textToType = "tauri";
    let charIndex = 0;

    const typeFilter = () => {
      if (charIndex < textToType.length) {
        filterInput.textContent += textToType[charIndex];
        charIndex++;
      } else {
        clearInterval(typingFilterInterval);
        // Highlight matching rows
        setTimeout(() => {
          matchRows.forEach(row => {
            row.style.opacity = "1";
            row.style.borderColor = "rgba(139,92,246,0.3)";
            row.style.background = "rgba(139,92,246,0.05)";
            const statusSpan = row.querySelector('span[style*="font-weight"]');
            if (statusSpan) {
              statusSpan.textContent = "Match";
              statusSpan.style.color = "var(--primary)";
            }
          });
        }, 200);
      }
    };

    typingFilterInterval = setInterval(typeFilter, 150);
  };


  // --- SFTP Terminal Typing Simulation ---
  let typingInterval = null;
  const terminalLines = [
    { text: "[CoDriver SFTP] Connecting to sftp://rickydane@daneserver.org:22...", type: "out" },
    { text: "[CoDriver SFTP] Handshake completed successfully.", type: "in" },
    { text: "[CoDriver SFTP] Active cipher: chacha20-poly1305@openssh.com", type: "in" },
    { text: "[CoDriver SFTP] Connection established natively.", type: "in" },
    { text: "[CoDriver SFTP] Reading remote folder structure /var/www...", type: "out" },
    { text: "[CoDriver SFTP] Indexing completed: 15,249 items indexed natively. Remote sidebar populated.", type: "in", highlight: true }
  ];

  const animateTerminal = () => {
    const terminal = document.querySelector('.ftp-terminal');
    if (!terminal) return;

    // Reset terminal content
    terminal.innerHTML = "";
    clearInterval(typingInterval);

    let lineIndex = 0;
    let charIndex = 0;
    let currentLineDiv = null;

    const typeChar = () => {
      if (lineIndex >= terminalLines.length) {
        clearInterval(typingInterval);
        return;
      }

      const lineData = terminalLines[lineIndex];

      // If we are starting a new line
      if (charIndex === 0) {
        currentLineDiv = document.createElement('div');
        currentLineDiv.className = `ftp-line ${lineData.type}`;
        if (lineData.highlight) {
          currentLineDiv.style.color = "var(--accent)";
        }
        terminal.appendChild(currentLineDiv);
        terminal.scrollTop = terminal.scrollHeight;
      }

      // Add character
      const targetText = lineData.text;
      currentLineDiv.textContent += targetText[charIndex];
      charIndex++;

      // If line is finished
      if (charIndex >= targetText.length) {
        lineIndex++;
        charIndex = 0;
        // Pause slightly between lines
        clearInterval(typingInterval);
        setTimeout(() => {
          typingInterval = setInterval(typeChar, 15);
        }, 300);
      }
    };

    typingInterval = setInterval(typeChar, 10);
  };


  // --- Archive Compression Animation Loop ---
  let archiveInterval = null;
  const animateArchive = () => {
    const progressFill = document.querySelector('.archive-progress-fill');
    const pctLabel = document.querySelector('.archive-pct');
    const successBanner = document.querySelector('.archive-success-banner');
    if (!progressFill || !pctLabel || !successBanner) return;

    // Reset states
    progressFill.style.width = "0%";
    pctLabel.textContent = "0%";
    successBanner.style.opacity = "0";
    successBanner.style.transform = "translateY(10px)";
    clearInterval(archiveInterval);

    let progress = 0;
    const run = () => {
      progress += Math.floor(Math.random() * 4) + 1; // random increment
      if (progress >= 100) {
        progress = 100;
        progressFill.style.width = "100%";
        pctLabel.textContent = "100%";
        successBanner.style.opacity = "1";
        successBanner.style.transform = "translateY(0)";
        clearInterval(archiveInterval);
      } else {
        progressFill.style.width = `${progress}%`;
        pctLabel.textContent = `${progress}%`;
      }
    };

    archiveInterval = setInterval(run, 40);
  };


  // --- Showroom Interactive Tab Swapper ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.showroom-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');

      // Remove active from buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Remove active from panels
      panels.forEach(panel => panel.classList.remove('active'));

      // Add active to current button
      button.classList.add('active');

      // Get target panel ID
      const targetId = `tab-${tabName}`;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');

        // Trigger dynamic tab widgets animations on enter
        if (tabName === 'speed') {
          animateFilterTyping();
        } else if (tabName === 'remote') {
          animateTerminal();
        } else if (tabName === 'archive') {
          animateArchive();
        }
      }
    });
  });

  // Initial triggers
  setTimeout(animateFilterTyping, 800);


  // --- 3D Parallax Mouse-Tilt Mockup Effect ---
  const mockupWrapper = document.querySelector('.hero-mockup-wrapper');
  const mockup = document.getElementById('heroMockup');

  if (mockupWrapper && mockup) {
    mockupWrapper.addEventListener('mousemove', (e) => {
      const rect = mockupWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within element
      const y = e.clientY - rect.top;  // y position within element

      // Calculate normalized positions (-0.5 to 0.5)
      const normalizedX = (x / rect.width) - 0.5;
      const normalizedY = (y / rect.height) - 0.5;

      // Max angles of rotation
      const maxRotateX = 7; // degrees
      const maxRotateY = 7; // degrees

      const rotateX = -normalizedY * maxRotateX;
      const rotateY = normalizedX * maxRotateY;

      // Smooth transform update
      mockup.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    mockupWrapper.addEventListener('mouseleave', () => {
      // Reset tilt smooth
      mockup.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }


  // --- Scroll Reveal Animations ---
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Stop observing once revealed to maintain performance
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1, // triggers when 10% of the element is visible
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });


  // --- Architecture Flow Interactive Sandbox ---
  const archNodes = document.querySelectorAll('.arch-node');
  const consoleOutput = document.getElementById('archConsoleOutput');
  const consolePrompt = document.querySelector('.console-prompt');

  const nodeLogs = {
    ui: {
      prompt: "CoDriver-AppView // DOM Event Handler:",
      text: "[UI] User clicked 'src-tauri/' directory item. App UI captures click event. ArrSelectedItems updated. Emitting tauri.invoke('open_dir', { path: '/Users/ricky/Coding/CoDriver/src-tauri' }) package via bridge..."
    },
    ipc: {
      prompt: "Tauri-IPC // Message Bridge Broker:",
      text: "[IPC] Serializing parameters: { path: '/Users/ricky/Coding/CoDriver/src-tauri' } to JSON payload [size: 84 bytes]. Dispatched thread-safe message across rust-webview IPC bridge queue. Awaiting backend return..."
    },
    rust: {
      prompt: "Rust-Backend // rayon Core Multi-Threader:",
      text: "[Rust] Invoked command 'open_dir'. Spawned Rayon thread pool walk job. Initializing parallel jwalk directory walking iterators. Spanning recursive file tree traversal without path caching. Live watchers updated."
    },
    disk: {
      prompt: "OS-Kernel // raw System block I/O Calls:",
      text: "[Disk] Issued OS kernel sys-call: SYS_READDIR on directory /Users/ricky/Coding/CoDriver/src-tauri. Walked 8 items in 0.15ms. Returning entries vector to Tauri core. Transferring file stream down bridge."
    }
  };

  const defaultText = "Hover over any architectural card above to trace end-to-end system calls and real-time operations inside CoDriver...";
  const defaultPrompt = "rickyperlick@MacBook-Pro ~ %";

  archNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      const nodeType = node.getAttribute('data-node');
      if (nodeLogs[nodeType]) {
        consolePrompt.style.color = "var(--primary)";
        consolePrompt.textContent = nodeLogs[nodeType].prompt + " ";
        consoleOutput.style.color = "#34d399"; // emerald green
        consoleOutput.textContent = nodeLogs[nodeType].text;
      }
    });

    node.addEventListener('mouseleave', () => {
      consolePrompt.style.color = "var(--primary)";
      consolePrompt.textContent = defaultPrompt + " ";
      consoleOutput.style.color = "var(--text-secondary)";
      consoleOutput.textContent = defaultText;
    });
  });


  // --- GitHub API dynamic Stars Fetch (Optional & Graceful fallback) ---
  const fetchGitHubStars = async () => {
    const starElement = document.getElementById('githubStarBtn');
    if (!starElement) return;

    try {
      // Fetch stats from GitHub API
      const response = await fetch('https://api.github.com/repos/RickyDane/CoDriver');
      if (response.ok) {
        const data = await response.json();
        const stars = data.stargazers_count;
        if (stars) {
          // Update button content with stars count
          starElement.innerHTML = `<i class="fa-brands fa-github"></i> Star on GitHub <span style="margin-left: 0.5rem; background: rgba(255,255,255,0.12); padding: 0.15rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-family: monospace;">${stars}</span>`;
        }
      }
    } catch (error) {
      console.log('GitHub API stars fetch bypassed gracefully:', error);
    }
  };

  fetchGitHubStars();

});
