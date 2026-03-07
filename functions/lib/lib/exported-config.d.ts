/**
 * Maps firebase functions:config:export JSON paths to process.env names.
 */
export declare const CONFIG_PATH_TO_ENV: Record<string, string>;
/**
 * Apply exported config (from FUNCTIONS_CONFIG_EXPORT secret) to process.env
 */
export declare function applyExportedConfigToEnv(data: Record<string, unknown>): void;
//# sourceMappingURL=exported-config.d.ts.map