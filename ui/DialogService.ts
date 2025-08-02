enum DialogType {
  INFO,
  WARNING,
  ERROR,
  SUCCESS,
  CONFIRMATION,
}

class DialogService {
  show(title: string, message: string, type: DialogType): void {
    switch (type) {
      case DialogType.INFO:
        alert(`${title}\n\n${message}`);
        break;
      case DialogType.CONFIRMATION:
        const result = confirm(`${title}\n\n${message}`);
        if (result) {
          this.show(title, message, DialogType.SUCCESS);
        } else {
          this.show(title, message, DialogType.ERROR);
        }
        break;
      case DialogType.SUCCESS:
        alert(`${title}\n\n${message}`);
        break;
      case DialogType.WARNING:
        alert(`${title}\n\n${message}`);
        break;
      case DialogType.ERROR:
        alert(`${title}\n\n${message}`);
        break;
    }
  }

  showInformation(title: string, message: string): void {
    this.show(title, message, DialogType.INFO);
  }
}
