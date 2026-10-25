export {}

declare global {
  interface Window {
    desktopFiles?: {
      saveFile(fileName: string, contents: string, encoding?: 'utf8' | 'base64'): Promise<string>
      openBackupFolder(): Promise<string>
      notifyDataChange(title: string, message: string): Promise<void>
    }
  }
}
