export type ProcessDefinition = {
  fileName: string,
  encoding: string,
  tableName: string,
  keys: string[],
  remapDef: Record<string, string>;
};
