export const SCAN_SESSION_GAP_MS = 5_000;

export type ScanHistoryEntry = {
  id?: number;
  parameterCode: string;
  parameterName?: string;
  value: unknown;
  status: boolean | null;
  createdAt?: string;
};

export type ProcessHistorySource = {
  processCode: string;
  processName: string;
  entries: ScanHistoryEntry[];
};

export type ScanSession = {
  number: number;
  processCode: string;
  processName: string;
  createdAt?: string;
  entries: ScanHistoryEntry[];
  okCount: number;
  ngCount: number;
};

const timestamp = (value?: string): number | null => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : null;
};

export const groupScanSessions = (
  sources: ProcessHistorySource[],
  gapMs = SCAN_SESSION_GAP_MS
): ScanSession[] => {
  const sessions: ScanSession[] = [];
  for (const source of sources) {
    // The API sends newest first. Sort chronologically before finding boundaries.
    const entries = source.entries.map((entry, index) => ({ entry, index }))
      .sort((a, b) => {
        const aTime = timestamp(a.entry.createdAt);
        const bTime = timestamp(b.entry.createdAt);
        if (aTime === null || bTime === null) {
          return aTime === bTime ? a.index - b.index : aTime === null ? -1 : 1;
        }
        return aTime - bTime || (a.entry.id ?? a.index) - (b.entry.id ?? b.index);
      });
    let session: ScanSession | undefined;
    let previousTime: number | null = null;
    let codes = new Set<string>();
    for (const { entry } of entries) {
      const time = timestamp(entry.createdAt);
      const code = entry.parameterCode.trim().toUpperCase();
      // Without a usable timestamp, keep the record separate rather than guess.
      const newSession = !session || !code || codes.has(code) || time === null ||
        previousTime === null || time - previousTime > gapMs;
      if (!session || newSession) {
        session = {
          number: 0,
          processCode: source.processCode,
          processName: source.processName,
          entries: [],
          okCount: 0,
          ngCount: 0,
        };
        sessions.push(session);
        codes = new Set<string>();
      }
      session.entries.push(entry);
      session.createdAt = time === null ? undefined : entry.createdAt;
      if (entry.status === true) session.okCount += 1;
      if (entry.status === false) session.ngCount += 1;
      codes.add(code);
      previousTime = time;
    }
  }
  sessions.sort((a, b) => (timestamp(a.createdAt) ?? -Infinity) - (timestamp(b.createdAt) ?? -Infinity));
  sessions.forEach((session, index) => { session.number = index + 1; });
  return sessions.reverse();
};
