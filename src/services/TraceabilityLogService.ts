import api, { ApiRequestOptions } from "@/utils/api";
import { ApiListResponse } from "./ParameterService";

export type ProcessLogParameter = {
  parameterId: number;
  parameterCode?: string;
  parameterName?: string;
  dataType?: "boolean" | "number" | "text" | string;
  status?: boolean;
  displayValue?: string | number | boolean;
  values: Array<string | number | boolean>;
};

export type ProcessLogDetail = {
  serialNumberCode?: string;
  type?: string;
  processCode?: string;
  processName?: string;
  result?: boolean;
  parameters: ProcessLogParameter[];
  children: ProcessLogDetail[];
};

export type ProcessLogIssue = {
  issueType?: string;
  issueNumber?: string;
  partNumber?: string;
  partName?: string;
};

export type ProcessLog = {
  id: number;
  issueNo: string;
  issues: ProcessLogIssue[];
  partNumber?: string;
  partName?: string;
  isActive: boolean;
  status?: boolean;
  isFinished?: boolean;
  isParent?: boolean;
  serialNumberCode?: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  details: ProcessLogDetail[];
};

export type ProcessLogFullValueDetail = {
  processCode?: string;
  processName?: string;
  parameterCode?: string;
  parameterName?: string;
  value?: string | number | boolean | null;
  values?: Array<string | number | boolean>;
};

export type ProcessLogFullValueSection = {
  serialNumberCode?: string;
  details: ProcessLogFullValueDetail[];
};

export type ProcessLogFullValues = {
  id: number;
  serialNumberCode?: string;
  clinching: ProcessLogFullValueSection;
  mFan: ProcessLogFullValueSection;
  overall: ProcessLogFullValueDetail[];
  status?: boolean;
  isFinished?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type ProcessLogQuery = {
  page?: number;
  limit?: number;
  serialNumberCode?: string;
  issueNo?: string;
  partNumber?: string;
  isActive?: boolean | null;
};

const normalizeQuery = (query: ProcessLogQuery) => ({
  page: query.page,
  limit: query.limit,
  serialNumberCode: query.serialNumberCode ?? query.issueNo,
  isActive: query.isActive ?? undefined,
});

const TRACEABILITY_LOG_ENDPOINT = "/api/traceability-logs";

export type BackendProcessLogParameter = {
  parameterCode?: string;
  parameterId?: number;
  parameterName?: string;
  dataType?: string;
  status?: boolean;
  value?: unknown;
  values?: unknown[];
};

export type BackendProcessLogProcess = {
  serialNumberCode?: string;
  type?: string;
  parameters?: BackendProcessLogParameter[];
  processCode?: string;
  processName?: string;
  result?: boolean;
  children?: BackendProcessLogProcess[];
};

export type BackendProcessLog = {
  createdAt: string;
  details?: BackendProcessLogProcess[];
  id: number;
  isActive?: boolean;
  isParent?: boolean;
  issueNo?: string;
  issues?: ProcessLogIssue[];
  partName?: string;
  partNumber?: string;
  processes?: BackendProcessLogProcess[];
  serialNumberCode?: string;
  status?: boolean;
  isFinished?: boolean;
  type?: string;
  updatedAt?: string;
};

export type BackendProcessLogFullValueSection = {
  serialNumberCode?: string;
  details?: ProcessLogFullValueDetail[];
};

export type BackendProcessLogFullValues = {
  id: number;
  serialNumberCode?: string;
  clinching?: BackendProcessLogFullValueSection;
  mFan?: BackendProcessLogFullValueSection;
  overall?: ProcessLogFullValueDetail[];
  status?: boolean;
  isFinished?: boolean;
  createdAt: string;
  updatedAt?: string;
};

type BackendProcessLogMock = {
  Id: number;
  Timestamp: string;
  SerialNumberClinching: string;
  SerialNumberMFan?: string | null;
  CoreAsmValue: string;
  UpperTankAsmValue: string;
  LowerTankAsmValue: string;
  ORingSetResult: boolean;
  NgBoxSensorShortSideValue: string;
  ClinchingHeightAverage: number;
  ClinchingHeightValues?: number[] | null;
  EndPlateWidthResults: boolean[];
  EndPlateWidthStatus: boolean;
  NgBoxSensorLongSideValue: string;
  LotFanAsmResult?: string | null;
  LotMotorAsmResult?: string | null;
  LotGuideAsmResult?: string | null;
  BoltTightenValue?: string | null;
  BoltTightenQtyValue?: string | null;
  NutTightenValue?: boolean | null;
  MFanInspectionRotationSpeedMaxValue?: number | null;
  MFanInspectionRotationSpeedMinValue?: number | null;
  MFanInspectionAmpereMaxValue?: number | null;
  MFanInspectionAmpereMinValue?: number | null;
  MFanInspectionWindDirectionValue?: string | null;
  MFanTestResult?: boolean | null;
  RadCoreAsmNameLabelResult?: boolean | null;
  MotorFanAssyLabelResult?: boolean | null;
  EcmAssyBoltTightenValue?: number | null;
  EcmAssyBoltTightenQtyValue?: number | null;
  FinalInspectionRadCoreAsmNameLabelResult?: boolean | null;
  CheckPoints?: boolean[] | null;
  CheckPointStatus?: boolean | null;
  OverallStatus: "PASSED" | "REJECTED";
};

const normalizeLogValue = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return String(value);
};

const getValueDataType = (value: string | number | boolean) => {
  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return "number";
  }

  return "text";
};

const joinUnique = (values: Array<string | undefined>) => {
  const uniqueValues = Array.from(new Set(values.filter(Boolean) as string[]));
  return uniqueValues.join(", ");
};

const mapProcessLogProcess = (
  process: BackendProcessLogProcess,
  processIndex: number
): ProcessLogDetail => ({
  serialNumberCode: process.serialNumberCode,
  type: process.type,
  processCode: process.processCode,
  processName: process.processName ?? process.processCode ?? "-",
  result: process.result,
  parameters: (process.parameters ?? []).map((parameter, index) => {
    const values =
      parameter.values && parameter.values.length > 0
        ? parameter.values.map(normalizeLogValue)
        : [normalizeLogValue(parameter.value)];
    const firstValue = values[0] ?? "-";

    return {
      parameterId: parameter.parameterId ?? processIndex * 1000 + index,
      parameterCode: parameter.parameterCode,
      parameterName: parameter.parameterName ?? parameter.parameterCode ?? "-",
      dataType: parameter.dataType ?? getValueDataType(firstValue),
      status: parameter.status,
      values,
    };
  }),
  children: (process.children ?? []).map((child, index) =>
    mapProcessLogProcess(child, index)
  ),
});

export const mapProcessLogResponse = (log: BackendProcessLog): ProcessLog => {
  const issues = log.issues ?? [];
  const issueNo =
    joinUnique(issues.map((issue) => issue.issueNumber)) ||
    log.issueNo ||
    log.serialNumberCode ||
    "-";
  const sourceProcesses = log.processes ?? log.details ?? [];

  return {
    id: log.id,
    issueNo,
    issues,
    partName: joinUnique(issues.map((issue) => issue.partName)) || log.partName,
    partNumber:
      joinUnique(issues.map((issue) => issue.partNumber)) || log.partNumber,
    isActive:
      typeof log.isActive === "boolean"
        ? log.isActive
        : Boolean(log.status),
    status: log.status,
    isFinished: log.isFinished,
    isParent: log.isParent,
    serialNumberCode: log.serialNumberCode,
    type: log.type,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    details: sourceProcesses.map(mapProcessLogProcess),
  };
};

const mockParameter = (
  parameterName: string,
  value: string | number | boolean | null | undefined,
  status?: boolean
): ProcessLogParameter => ({
  parameterId: parameterName.length,
  parameterName,
  dataType: typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "text",
  status,
  values: value === null || value === undefined ? [] : [value],
});

const mockGroup = (
  processName: string,
  parameters: ProcessLogParameter[]
): ProcessLogDetail => ({
  processName,
  parameters,
  children: [],
});

const mapMockProcessLog = (log: BackendProcessLogMock): ProcessLog => {
  const isPassed = log.OverallStatus === "PASSED";
  const endPlatePassed = log.EndPlateWidthStatus;
  const checkPointPassed = log.CheckPointStatus ?? false;
  const endPlateSummary = `${log.EndPlateWidthResults.filter(Boolean).length}/${log.EndPlateWidthResults.length} OK`;
  const checkPointSummary = log.CheckPoints ? `${log.CheckPoints.filter(Boolean).length}/${log.CheckPoints.length} OK` : null;

  return {
    id: log.Id,
    issueNo: log.SerialNumberClinching,
    issues: [],
    isActive: isPassed,
    status: isPassed,
    isFinished: Boolean(log.SerialNumberMFan),
    serialNumberCode: log.SerialNumberClinching,
    createdAt: log.Timestamp,
    details: [
      mockGroup("Clinching & End Plate", [
        mockParameter("Core Asm", log.CoreAsmValue),
        mockParameter("Upper Tank Asm", log.UpperTankAsmValue),
        mockParameter("Lower Tank Asm", log.LowerTankAsmValue),
        mockParameter("O-Ring Set", log.ORingSetResult, log.ORingSetResult),
        {
          ...mockParameter("Clinching Height Avg", `${log.ClinchingHeightAverage.toFixed(2)} mm`, true),
          displayValue: `${log.ClinchingHeightAverage.toFixed(2)} mm`,
          values: log.ClinchingHeightValues ?? [],
        },
        {
          ...mockParameter("End Plate Width", endPlateSummary, endPlatePassed),
          displayValue: endPlateSummary,
          values: log.EndPlateWidthResults ?? [],
        },
        mockParameter("NG Box Short Side", log.NgBoxSensorShortSideValue, log.NgBoxSensorShortSideValue === "ON"),
        mockParameter("NG Box Long Side", log.NgBoxSensorLongSideValue, log.NgBoxSensorLongSideValue === "ON"),
      ]),
      mockGroup("M-Fan Assembly & Inspection", [
        mockParameter("Serial M-Fan", log.SerialNumberMFan),
        mockParameter("Lot Fan Asm", log.LotFanAsmResult),
        mockParameter("Lot Motor Asm", log.LotMotorAsmResult),
        mockParameter("Lot Guide Asm", log.LotGuideAsmResult),
        mockParameter("Bolt Tighten", log.BoltTightenValue, log.BoltTightenValue === "ON"),
        mockParameter("Bolt Qty", log.BoltTightenQtyValue),
        mockParameter("Nut Tighten", log.NutTightenValue, log.NutTightenValue ?? undefined),
        mockParameter("Rotation Max / Min", log.MFanInspectionRotationSpeedMaxValue != null ? `${log.MFanInspectionRotationSpeedMaxValue} / ${log.MFanInspectionRotationSpeedMinValue} RPM` : null),
        mockParameter("Ampere Max / Min", log.MFanInspectionAmpereMaxValue != null ? `${log.MFanInspectionAmpereMaxValue} / ${log.MFanInspectionAmpereMinValue} A` : null),
        mockParameter("Wind Direction", log.MFanInspectionWindDirectionValue),
        mockParameter("M-Fan Test", log.MFanTestResult, log.MFanTestResult ?? undefined),
      ]),
      mockGroup("ECM & Final Inspection", [
        mockParameter("Rad Core Label", log.RadCoreAsmNameLabelResult, log.RadCoreAsmNameLabelResult ?? undefined),
        mockParameter("Motor Fan Label", log.MotorFanAssyLabelResult, log.MotorFanAssyLabelResult ?? undefined),
        mockParameter("ECM Bolt Tighten", log.EcmAssyBoltTightenValue != null ? `${log.EcmAssyBoltTightenValue} Nm` : null),
        mockParameter("ECM Bolt Qty", log.EcmAssyBoltTightenQtyValue),
        mockParameter("Final Rad Core Label", log.FinalInspectionRadCoreAsmNameLabelResult, log.FinalInspectionRadCoreAsmNameLabelResult ?? undefined),
        {
          ...mockParameter("Check Points", checkPointSummary, checkPointPassed),
          parameterCode: "CHECK_POINTS",
          values: log.CheckPoints ?? [],
        },
      ]),
    ],
  };
};

const isMockProcessLog = (log: BackendProcessLog | BackendProcessLogMock): log is BackendProcessLogMock =>
  "SerialNumberClinching" in log;

const mockDetailsToFullValues = (details: ProcessLogDetail[]) =>
  details.flatMap((group) =>
    group.parameters.map((parameter) => ({
      processName: group.processName,
      parameterName: parameter.parameterName,
      value: parameter.values[0] ?? null,
      values: parameter.values,
    }))
  );

const mapMockFullValues = (log: BackendProcessLogMock): ProcessLogFullValues => {
  const normalized = mapMockProcessLog(log);
  const [clinching, mFan, overall] = normalized.details;

  return {
    id: normalized.id,
    serialNumberCode: normalized.serialNumberCode,
    clinching: {
      serialNumberCode: normalized.serialNumberCode,
      details: mockDetailsToFullValues(clinching ? [clinching] : []),
    },
    mFan: {
      serialNumberCode: log.SerialNumberMFan ?? undefined,
      details: mockDetailsToFullValues(mFan ? [mFan] : []),
    },
    overall: mockDetailsToFullValues(overall ? [overall] : []),
    status: normalized.status,
    isFinished: normalized.isFinished,
    createdAt: normalized.createdAt,
  };
};

const mapFullValueSection = (
  section?: BackendProcessLogFullValueSection
): ProcessLogFullValueSection => ({
  serialNumberCode: section?.serialNumberCode,
  details: section?.details ?? [],
});

export const mapProcessLogFullValuesResponse = (
  log: BackendProcessLogFullValues
): ProcessLogFullValues => ({
  id: log.id,
  serialNumberCode: log.serialNumberCode,
  clinching: mapFullValueSection(log.clinching),
  mFan: mapFullValueSection(log.mFan),
  overall: log.overall ?? [],
  status: log.status,
  isFinished: log.isFinished,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

const TraceabilityLogService = {
  getTraceabilityLogs: async (
    query: ProcessLogQuery = {},
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<ApiListResponse<BackendProcessLog | BackendProcessLogMock>>(
      TRACEABILITY_LOG_ENDPOINT,
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return {
      ...response.data,
      data: response.data.data.map((log) =>
        isMockProcessLog(log) ? mapMockProcessLog(log) : mapProcessLogResponse(log)
      ),
    };
  },

  getTraceabilityLog: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: BackendProcessLog | BackendProcessLogMock;
    }>(`${TRACEABILITY_LOG_ENDPOINT}/${id}`, options);

    return {
      ...response.data,
      data: isMockProcessLog(response.data.data)
        ? mapMockProcessLog(response.data.data)
        : mapProcessLogResponse(response.data.data),
    };
  },

  getTraceabilityLogFullValues: async (
    serialNumberCode: string,
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: BackendProcessLogFullValues | BackendProcessLogMock;
    }>(
      `${TRACEABILITY_LOG_ENDPOINT}/full-values/${encodeURIComponent(serialNumberCode)}`,
      options
    );

    return {
      ...response.data,
      data: isMockProcessLog(response.data.data)
        ? mapMockFullValues(response.data.data)
        : mapProcessLogFullValuesResponse(response.data.data),
    };
  },
};

export default TraceabilityLogService;
