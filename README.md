# rdpFX
[![publish](https://github.com/RickyDane/rdpFX/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/RickyDane/rdpFX/actions/workflows/main.yml)

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
- Open / close tabs with ctrl + t / ctrl + w

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

#### Language Support
- English
  - Option to choose between languages coming soon ...

#### Known issues:
- Permissions on ms windows are a little bit strange
- Tabs are not fully worked out yet

#### 📝 Todos:
- Multiple languages
- List filtering (filter by name, last modified, file size)
- Drag and drop
- [x] New logo / icon
- FTP-Integration
- [x] Dual pane view
- Favorites
<br>
<img width="1280" alt="Bildschirmfoto 2023-11-08 um 20 49 33" src="https://github.com/RickyDane/rdpFX/assets/82893522/18ee6da9-033b-4803-bd05-c524ee896def">

## Speed comparison
![2023-08-27-08-14-02](https://github.com/RickyDane/rdpFX/assets/82893522/237b28a0-d667-4bea-91a9-a43cb9277c49)

#
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F8OL456)
