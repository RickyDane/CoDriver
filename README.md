<h1 align="center">rdpFX</h1>
<p align="center"><img width="200x" height="auto" src="https://github.com/RickyDane/rdpFX/assets/82893522/880b33d3-d749-49e8-906f-fee2abc053d9" /></p>
<a href='https://ko-fi.com/F1F8OL456' target='_blank'><p align="center"><img height='36px' style='border: 0px; height: 36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></p></a>
<p align="center">
  <img src="https://img.shields.io/badge/Windows-blue" />
  <img src="https://img.shields.io/badge/macOS-white" />
  <img src="https://img.shields.io/badge/Linux-red" />
</p>
<a href="https://github.com/RickyDane/rdpFX/actions/workflows/main.yml"><p align="center"><img src="https://github.com/RickyDane/rdpFX/actions/workflows/main.yml/badge.svg?branch=master"></p></a>
<p align="center">
  A simple file explorer that was born because I wanted to learn the Rust language.
  <br>
  It is operating system independent and trimmed for optimization.
</p>

<br/><br/>

The performance is provided by ["rust_search"](https://crates.io/crates/rust_search) and ["Tauri"](https://tauri.app/).
<br/><br/>
rdpFX does not use path caching to access files and folders, so the performance is achieved by Rust, the speed of the disk and the power of the cpu.

⁉️ Keep in mind that this software is still work in progress and will contain bugs!
<br/><br/>

## Basic features
- Navigate through directories as you know it
- Copy & Paste, delete, create and rename files and folders
- Switch between "big buttons"-, list and miller columns mode
- Close popups with esc
- Ctrl / Cmd + F for a quicksearch in the current directory
- Jump to a directory with Ctrl / Cmd + G by inputting a path
- Sort items in list mode by size, name or last modified
<br/>

## Advanced features
- Compress files and folders
  - zip
- Unpack archives automatically into a new folder in the working directory
  - rar
  - zip
  - 7zip
  - tar (.gz, .bz2)
- Navigate to a directory using the shortcut LAlt + 1 / 2 / 3 | (macOS option + 1 / 2 / 3)
  - Configure the paths yourself in the settings
- Create file with F6
- Create folder with F7
- Dual-Pane view
  - Search for files with F8
  - Copy current selected element to other pane with F5
  - Move current selected element to other pane with LShift + F5
- Drag and drop files into the explorer to copy them into the current directory
- Multi rename your selection with Ctrl / Cmd + LShift + M
  - Run multi rename with Ctrl / Cmd + Return
- File quick preview -> Select directory entry and tap the space bar.
  - Supported files: all image files (.jpg, .png, ...), pdf's
  - All other items will show a small tile with some information about it. (path, size, last modified)
<br/>

## 🖥️ FTP integration (sshfs)
  Dependencies (Need to be installed additionally):

  | macOS | Linux | Windows |
  | ----- | ----- | ------- |
  | fuse-t <br/> fuse-t-sshfs | libfuse | Not supported **_yet_** |
  
  ### Installation:
  #### macOS
  ```
  brew tap macos-fuse-t/homebrew-cask
  brew install fuse-t
  brew install fuse-t-sshfs
  ```
  #### Linux
  ```
  sudo apt-get install sshfs
  ```
<br/>

## 🏴‍☠️ Language Support
- English
  - Option to choose between languages coming soon ...
<br/>

## ⚠️ Known issues:
- Drag and drop out of the window is currently not working on linux
- On windows you may have to install [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170)
- Permissions on ms-windows are a little bit strange
  - You may have to run the program as administrator if you encounter problems to copy elements or something similar
- There could be a problem you need to install openssl1.1 on linux systems, when the program does not start
- ~~Tabs are not fully worked out yet~~
<br/>

## 📝 Todos:
- Multiple languages
- Favorites
- Drag to select
- Access online storage services (Google drive, etc.)
<br/>

## User interface

### List style
![Screenshot 2024-08-05 at 22 14 26](https://github.com/user-attachments/assets/88c12d18-bfce-4b0e-ab6a-1a1d06a358b1)
### Grid style
![Screenshot 2024-08-05 at 22 15 49](https://github.com/user-attachments/assets/62c35ae9-f548-4f81-ab34-f70bfc5a7ba5)
### Dual pane view
![Screenshot 2024-08-05 at 22 16 21](https://github.com/user-attachments/assets/5004af5f-9755-4fec-af88-677812ff3246)
### Miller column view
![Screenshot 2024-08-05 at 22 15 44](https://github.com/user-attachments/assets/b8da7a2a-8a5e-432e-8e07-196177ee0363)

## Speed comparison
Windows File Explorer: _39.83 sec._<br/>
rdpFX: **_0.81 sec._**

https://github.com/user-attachments/assets/17116fa5-8f43-4339-a4ff-2525e7c94ae0

Windows File Explorer: _44.91 sec._<br/>
rdpFX: **_< 0.5 sec._**

https://github.com/user-attachments/assets/169da3d0-06ac-4775-a631-5c5708ae4766

## Star History

<a href="https://star-history.com/#rickydane/rdpfx&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=rickydane/rdpfx&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=rickydane/rdpfx&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=rickydane/rdpfx&type=Date" />
 </picture>
</a>
