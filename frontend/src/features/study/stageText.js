export function detailFor(stageId, detail = {}) {
  if (stageId === "retrieving" && detail.documentCount) {
    const count = detail.documentCount;
    const noun = count === 1 ? "document" : "documents";
    return detail.scope === "selected"
      ? `Searching ${count} selected ${noun}`
      : `Searching ${count} ${noun}`;
  }
  if (stageId === "generating" && detail.passageCount) {
    const count = detail.passageCount;
    const passages = count === 1 ? "passage" : "passages";
    const from = detail.documents?.length
      ? ` from ${detail.documents.join(", ")}`
      : "";
    return `Found ${count} relevant ${passages}${from}`;
  }
  return null;
}
