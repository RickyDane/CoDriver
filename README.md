# rdpFX
[![publish](https://github.com/RickyDane/rdpFX/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/RickyDane/rdpFX/actions/workflows/main.yml)

<img width="64px" height="auto" src="https://github.com/RickyDane/rdpFX/assets/82893522/880b33d3-d749-49e8-906f-fee2abc053d9" />

A simple file explorer that was born because I wanted to learn the Rust language.
<br>
It is operating system independent and trimmed for optimization.

| OS                              |  Support  |
|:--------------------------------|:----------|
| Linux                           | ✔️        |
| macOS (intel / apple silicon)   | ✔️        |
| Windows                         | ✔️        |
<br>

The performance comes from ["rust_search"](https://crates.io/crates/rust_search) and ["Tauri"](https://tauri.app/)
<br>So high performance is achieved purely by Rust, the speed of the disk and the power of the cpu, without path caching (which may come later).

### Basic features
- Navigate through directories as you know it
- Copy & Paste, delete, create and rename files and folders
- Switch between "big buttons"- and list mode
- Open / close tabs with Ctrl + t / Ctrl + w

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
  - Ctrl + F for quicksearch in current directory
  - Copy current selected element to other pane with F5
- Drag and drop files into the explorer to copy them into the current directory

#### Language Support
- English
  - Option to choose between languages coming soon ...

#### Known issues:
- Permissions on ms-windows are a little bit strange
  - You may have to run the program as administrator if you encounter problems to copy elements or something similar
- Tabs are not fully worked out yet

#### 📝 Todos:
- Multiple languages
- List filtering (filter by name, last modified, file size)
- FTP-Integration
- Favorites
<br>
<img src="https://github.com/RickyDane/rdpFX/assets/82893522/89baafde-62b4-49b6-ae13-ca832e8eb2e2" />


## Speed comparison
![2023-08-27-08-14-02](https://github.com/RickyDane/rdpFX/assets/82893522/237b28a0-d667-4bea-91a9-a43cb9277c49)

#
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F8OL456)
