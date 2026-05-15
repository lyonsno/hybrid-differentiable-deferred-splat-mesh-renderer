export declare const PIXEL_CONTRIBUTOR_TRACE_SCHEMA: Readonly<{
  schemaVersion: 1;
  traceRecord: {
    requiredFields: readonly string[];
    fields: readonly { name: string }[];
  };
  anchors: readonly {
    id: string;
    kind: string;
    x: number;
    y: number;
    description: string;
    canonicalTileAddress: null | {
      tileX: number;
      tileY: number;
      tileIndex: number;
      localX: number;
      localY: number;
    };
  }[];
  tileAddress: {
    requiredFields: readonly string[];
    compatibility: string;
  };
  contributorLists: Readonly<Record<string, { requiredFields: readonly string[]; purpose: string }>>;
  dispatchCache: {
    requiredFields: readonly string[];
    optionalFields: readonly string[];
  };
  rendererMetadata: {
    requiredFields: readonly string[];
    optionalFields: readonly string[];
  };
  deferredFields: {
    requiredFields: readonly string[];
    preservedFieldNames: readonly string[];
  };
  compatibilityRules: readonly string[];
}>;

export declare function summarizePixelContributorTraceSchema(schema?: typeof PIXEL_CONTRIBUTOR_TRACE_SCHEMA): {
  version: number;
  traceRecordFields: readonly string[];
  anchorPixelIds: string[];
  contributorIdentityFields: Record<string, string[]>;
  tileAddressFields: readonly string[];
  dispatchCacheFields: readonly string[];
  rendererMetadataFields: readonly string[];
  deferredFields: readonly string[];
  compatibilityRules: readonly string[];
};

export declare function validatePixelContributorTraceSchema(schema?: typeof PIXEL_CONTRIBUTOR_TRACE_SCHEMA): string[];

export declare function validatePixelContributorTraceRecord(
  record: Record<string, unknown>,
  schema?: typeof PIXEL_CONTRIBUTOR_TRACE_SCHEMA,
): string[];
