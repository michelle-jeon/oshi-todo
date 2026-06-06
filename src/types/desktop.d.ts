declare global {
  type OshiTodoDesktopWindow = {
    id: string;
    title: string;
    ownerName: string;
    ownerBundleId: string | null;
    ownerProcessId: number | null;
  };

  type OshiTodoDesktopBridge = {
    isDesktop: true;
    getActiveWindow: () => Promise<OshiTodoDesktopWindow | null>;
    getOpenWindows: () => Promise<OshiTodoDesktopWindow[]>;
    getAppInfo: () => Promise<{
      version: string;
      platform: string;
    }>;
  };

  interface Window {
    oshiTodoDesktop?: OshiTodoDesktopBridge;
  }
}

export {};
