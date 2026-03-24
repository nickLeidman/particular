import {
  buildProjectParamsExportObject,
  PARTICULAR_DEMO_PROJECT_VERSION,
  PARTICULAR_DEMO_PROJECT_VERSION_KEY,
  type Params,
} from './persistParams';

export function buildProjectParamsExportJson(params: Params, pretty = true): string {
  const payload = buildProjectParamsExportObject(params);
  return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}

export function downloadProjectParamsJson(params: Params, filename = 'particular-demo-params.json'): void {
  const text = buildProjectParamsExportJson(params);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type { Params };
export { PARTICULAR_DEMO_PROJECT_VERSION, PARTICULAR_DEMO_PROJECT_VERSION_KEY };
