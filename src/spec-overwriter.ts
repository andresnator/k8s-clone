function isPlainObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeKey(key: string): boolean {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Deep merges overwrite into target, protecting against prototype pollution.
 */
export function deepMerge(target: any, overwrite: any): void {
    for (const key in overwrite) {
        if (Object.hasOwn(overwrite, key) && isSafeKey(key)) {
            const overwriteValue = overwrite[key];
            const targetValue = target[key];

            if (isPlainObject(overwriteValue) && isPlainObject(targetValue)) {
                deepMerge(targetValue, overwriteValue);
            } else {
                target[key] = overwriteValue;
            }
        }
    }
}

/**
 * Applies overwrite-spec to a Kubernetes resource.
 */
export function applyOverwriteSpec(resource: any, overwriteSpec: Record<string, any>): any {
    if (!resource.spec) {
        resource.spec = {};
    }
    deepMerge(resource.spec, overwriteSpec);
    return resource;
}
