import { LinkExpression, LinkQuery } from "@perspect3vism/ad4m";
import getAppDataPath from "appdata-path";
import { execSync } from "child_process";
import path from "path";
import { cleanOutput } from "../utils.js";

// * Link Language
export function addLink(link: LinkExpression) {
  const { relativePath, perspective } = global;
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective addLink --uuid "${perspective}" --link "${JSON.stringify(link).replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );

  return cleanOutput(response);
}

export function removeLink(link: LinkExpression) {
  const { relativePath, perspective } = global;
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective removeLink --uuid "${perspective}" --link "${JSON.stringify(link).replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );

  return cleanOutput(response);
}

export function updateLink(oldLink: LinkExpression, newLink: LinkExpression) {
  const { relativePath, perspective } = global;
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective updateLink --uuid "${perspective}" --link "${JSON.stringify(oldLink).replace(/"/g, '\\"')}" --newLink "${JSON.stringify(newLink).replace(/"/g, '\\"')}"`,
    { encoding: 'utf-8' }
  );

  return cleanOutput(response);
}

export function queryLinks(query: LinkQuery) {
  const { relativePath, perspective } = global;

  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} perspective queryLinks --uuid "${perspective}" --query '${JSON.stringify(query)}'`,
    { encoding: 'utf-8' }
  );

  return cleanOutput(response);
}

export function addCallback() {}

// * Expression Language
export function createExpression(content: any) {
  const { relativePath, languageAddress } = global;
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} expression create --address ${languageAddress} --content '${content}'`,
    { encoding: 'utf-8' }
  );

  const lines = response.split('\n')
  lines.splice(0, 1);
  const cleaned = lines.join('\n')

  return cleaned.replace(/'/gm, "").trim();
}

export function getExpression(url: string) {
  const { relativePath } = global;
  const binaryPath = path.join(getAppDataPath(relativePath), 'binary', 'ad4m-host');

  const response = execSync(
    `${binaryPath} expression get --url "${url}"`,
    { encoding: 'utf-8' }
  );

  return cleanOutput(response);
}

export function getByAuthor() {}

// * Direct Message Language
export function sendPrivate() {}

export function inbox() {}