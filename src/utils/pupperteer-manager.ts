import puppeteer, { Browser, Page } from 'puppeteer';

export class PupperteerManager {
  private static instance: PupperteerManager;
  private launchedBrowser?: Browser;

  private constructor() {
    puppeteer.launch().then((browser) => {
      this.launchedBrowser = browser;
    });
  }

  public static getInstance(): PupperteerManager {
    if (!PupperteerManager.instance) {
      PupperteerManager.instance = new PupperteerManager();
    }
    return PupperteerManager.instance;
  }

  private catchedPage?: Page;

  private async loadPage(): Promise<Page | undefined> {
    if (this.catchedPage) {
      return this.catchedPage;
    }
    this.catchedPage = await this.launchedBrowser?.newPage();
    this.catchedPage?.setRequestInterception(true);
    return this.catchedPage;
  }

  public async loadGeocode(address: string): Promise<{ lat: number; lon: number }> {
    const page = await this.loadPage();
    return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
      page?.on('request', async (request) => {
        if (request.url().startsWith('https://www.google.com/maps/')) {
          const url = new URL(request.url());
          const splitPbQuery = url.searchParams.get('pb')?.split('!') || [];
          const lonString = splitPbQuery.find((query) => query.startsWith('2d'));
          const latString = splitPbQuery.find((query) => query.startsWith('3d'));
          if (lonString && latString) {
            resolve({ lat: Number(latString), lon: Number(lonString) });
          }
        }
        await request.continue();
      });
      page?.goto(`https://www.google.com/maps/place/${address}`, { waitUntil: 'networkidle0' });
    });
  }

  public async release(): Promise<void> {
    return this.launchedBrowser?.close();
  }
}
