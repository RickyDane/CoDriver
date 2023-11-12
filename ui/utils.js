const { listen } = window.__TAURI__.event;

/* Drag and drop files into file explorer */
listen('tauri://file-drop', event => {
    event.payload.forEach(item => {
        console.log(item);
        CopyFilePath = item;
        let tempCopyFilePath = CopyFilePath.split("/");
        CopyFileName = tempCopyFilePath[tempCopyFilePath.length - 1].replace("'", "");
        pasteItem();
    });
})