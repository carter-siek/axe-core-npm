import WebDriver from 'selenium-webdriver';
import AxeBuilder from '@axe-core/webdriverjs';
import { AxeResults } from 'axe-core';
import { EventResponse, ConfigParams } from '../types';

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const testPages = async (
  urls: string | string[],
  config: ConfigParams,
  events?: EventResponse
): Promise<AxeResults[] | AxeResults> => {
  const normalizedUrls = Array.isArray(urls) ? urls : [urls];
  const driver: WebDriver.WebDriver = await config.driver;

  if (!normalizedUrls.length) {
    await driver.quit();
    return [];
  }

  const currentUrl = normalizedUrls[0].replace(/[,;]$/, '');

  try {
    if (events?.onTestStart) {
      events.onTestStart(currentUrl);
    }

    if (config.timer) {
      events?.startTimer('axe page load time');
    }

    await driver.get(currentUrl);

    if (config.timer) {
      events?.endTimer('axe page load time');
    }

    if (config.loadDelay) {
      events?.waitingMessage(config.loadDelay);
      await delay(config.loadDelay);
    }

    const axe = new AxeBuilder(driver, config.axeSource);

    if (Array.isArray(config.include)) {
      config.include.forEach((include: string) => axe.include(include));
    }

    if (Array.isArray(config.exclude)) {
      config.exclude.forEach((exclude: string) => axe.exclude(exclude));
    }

    if (config.tags) {
      axe.withTags(config.tags);
    } else if (config.rules) {
      axe.withRules(config.rules);
    }

    /* istanbul ignore if */
    if (config.disable) {
      axe.disableRules(config.disable);
    }

    if (config.timer) {
      events?.startTimer('axe-core execution time');
    }

    const results: AxeResults = await new Promise((resolve, reject) => {
      axe.analyze((err: Error | null, r: AxeResults) => {
        if (config.timer) {
          events?.endTimer('axe-core execution time');
        }

        if (err) {
          return reject(err);
        }

        resolve(r);
      });
    });

    if (events?.onTestComplete) {
      events.onTestComplete(results);
    }

    const res = await testPages(normalizedUrls.slice(1), config, events);
    if (Array.isArray(res)) {
      return [results, ...res];
    }
    return [results, rest];
  } catch (err) {
    await driver.quit();
    throw err;
  }
};

export default testPages;
