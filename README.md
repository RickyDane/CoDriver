# rdpFX
[![publish](https://github.com/RickyDane/rdpFX/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/RickyDane/rdpFX/actions/workflows/main.yml) 

<img width="64px" height="auto" src="https://github.com/RickyDane/rdpFX/assets/82893522/880b33d3-d749-49e8-906f-fee2abc053d9" />
<br><br>
<a href='https://ko-fi.com/F1F8OL456' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
<br><br>
A simple file explorer that was born because I wanted to learn the Rust language.
<br>
It is operating system independent and trimmed for optimization.
<br><br>

| OS                              |  Support  |
|:--------------------------------|:----------|
| Linux                           | ✔️        |
| macOS (Intel / Apple Silicon)   | ✔️        |
| Windows                         | ✔️        |
<br>

The performance is provided by ["rust_search"](https://crates.io/crates/rust_search) and ["Tauri"](https://tauri.app/).
<br><br>
rdpFX does not use path caching to access files and folders, so the performance is achieved by Rust, the speed of the disk and the power of the cpu.

### Basic features
- Navigate through directories as you know it
- Copy & Paste, delete, create and rename files and folders
- Switch between "big buttons"- and list mode
- Close popups with esc
- Ctrl / Cmd + F for a quicksearch in the current directory
- Jump to a directory with Ctrl / Cmd + G by inputting a path
- Filter items in list mode by size, name and last modified

### Advanced features
- Compress files and folders
  - zip
- Unpack archives automatically into a new folder in the working directory
  - rar
  - zip
  - 7zip
- Navigate to a directory using the shortcut LAlt + 1 / 2 / 3 | (macOS option + 1 / 2 / 3)
  - Configure the paths yourself in the settings
- Create file with F6
- Create folder with F7
- Dual-Pane view
  - Search for files with F8
  - Copy current selected element to other pane with F5
- Drag and drop files into the explorer to copy them into the current directory
- Multi rename your selection with Ctrl / Cmd + LShift + M
  - Run multi rename with Ctrl / Cmd + Return

#### Language Support
- English
  - Option to choose between languages coming soon ...

#### ⚠️ Known issues:
- On windows you may have to install [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170)
- Permissions on ms-windows are a little bit strange
  - You may have to run the program as administrator if you encounter problems to copy elements or something similar
- ~~Tabs are not fully worked out yet~~

#### 📝 Todos:
- Multiple languages
- FTP-Integration
- Favorites
<br>

<img width="700" alt="Bildschirmfoto 2024-02-01 um 23 11 50" src="https://github.com/RickyDane/rdpFX/assets/82893522/0f379d41-a6a7-4647-89df-a59c6ec102d5">
<img width="700" alt="Bildschirmfoto 2024-02-01 um 23 12 25" src="https://github.com/RickyDane/rdpFX/assets/82893522/cbe99aba-5196-4677-a19e-7876fb281282">
<img width="700" alt="Bildschirmfoto 2024-02-01 um 23 12 34" src="https://github.com/RickyDane/rdpFX/assets/82893522/c91f7a51-4896-406e-9779-59ed1629b706">

## Speed comparison
![2023-08-27-08-14-02](https://github.com/RickyDane/rdpFX/assets/82893522/237b28a0-d667-4bea-91a9-a43cb9277c49)
