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
  serialNumberClinching?: string;
  serialNumberMFan?: string;
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

export type TraceabilityLogV2Parameter = {
  parameter: string;
  parameterDesc?: string | null;
  value: unknown;
  status?: boolean | null;
};

export type TraceabilityLogV2DetailGroup = {
  clinching: TraceabilityLogV2Parameter[];
  mfan: TraceabilityLogV2Parameter[];
  ecm: TraceabilityLogV2Parameter[];
  final: TraceabilityLogV2Parameter[];
};

export type TraceabilityLogItem = {
  id: number;
  code?: string;
  serialNumberClinching: string;
  serialNumberMFan?: string | null;
  serialNumberCode?: string;
  status: boolean;
  isFinish: boolean;
  issueNumbersClinching: string[];
  issueNumbersMfan: string[];
  createdAt: string;
  updatedAt?: string | null;
  detail?: TraceabilityLogV2DetailGroup | null;
};

export type ProcessLogQuery = {
  page?: number;
  limit?: number;
  search?: string;
  serialNumberCode?: string;
  issueNo?: string;
  partNumber?: string;
  isActive?: boolean | null;
  status?: boolean | null;
  isFinish?: boolean | null;
  startDate?: string;
  endDate?: string;
};

const normalizeQuery = (query: ProcessLogQuery) => ({
  page: query.page,
  limit: query.limit,
  search: query.search ?? query.serialNumberCode ?? query.issueNo,
  isActive: query.isActive ?? undefined,
  status:
    query.status !== undefined && query.status !== null
      ? query.status
      : undefined,
  isFinish:
    query.isFinish !== undefined && query.isFinish !== null
      ? query.isFinish
      : undefined,
  startDate: query.startDate || undefined,
  endDate: query.endDate || undefined,
});

const TRACEABILITY_LOG_ENDPOINT = "/api/v2/traceability-logs";

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
  OverallStatus?: boolean | string | null;
  overallStatus?: boolean | string | null;
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

export type BackendTraceabilityLogV2 = {
  id: number;
  serialNumberClinching?: string | null;
  serialNumberMFan?: string | null;
  status?: boolean;
  isFinish?: boolean;
  issueNumbersClinching?: string[];
  issueNumbersMfan?: string[];
  detail?: Record<string, BackendTraceabilityLogV2DetailParameter[]>;
  createdAt: string;
  updatedAt?: string;
};

export type BackendTraceabilityLogV2DetailParameter = {
  parameter?: string;
  value?: unknown;
  status?: boolean;
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
  CapTypePositionResult?: boolean | null;
  LeakResult?: boolean | null;
  LeakLastLeakageValue?: number | null;
  OverallStatus?: boolean | string | null;
  overallStatus?: boolean | string | null;
};

const normalizeOverallStatus = (value: boolean | string | null | undefined) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (["true", "ok", "passed"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "ng", "rejected"].includes(normalizedValue)) {
    return false;
  }

  return false;
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
  const status =
    log.overallStatus !== undefined && log.overallStatus !== null
      ? normalizeOverallStatus(log.overallStatus)
      : log.OverallStatus !== undefined && log.OverallStatus !== null
        ? normalizeOverallStatus(log.OverallStatus)
        : log.status;

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
        : Boolean(status),
    status,
    isFinished: log.isFinished,
    isParent: log.isParent,
    serialNumberCode: log.serialNumberCode,
    type: log.type,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    details: sourceProcesses.map(mapProcessLogProcess),
  };
};

export const mapTraceabilityLogV2Response = (log: BackendTraceabilityLogV2): ProcessLog => {
  const clinchingIssues = log.issueNumbersClinching ?? [];
  const mFanIssues = log.issueNumbersMfan ?? [];
  const issues: ProcessLogIssue[] = [
    ...clinchingIssues.map((issueNumber) => ({
      issueNumber,
      issueType: "Clinching",
    })),
    ...mFanIssues.map((issueNumber) => ({
      issueNumber,
      issueType: "M-Fan",
    })),
  ];
  const issueNo = joinUnique([
    log.serialNumberClinching ?? undefined,
    log.serialNumberMFan ?? undefined,
    ...clinchingIssues,
    ...mFanIssues,
  ]);
  const status = log.status ?? false;

  return {
    id: log.id,
    issueNo: issueNo || "-",
    issues,
    isActive: status,
    status,
    isFinished: log.isFinish,
    serialNumberCode: log.serialNumberClinching ?? undefined,
    serialNumberClinching: log.serialNumberClinching ?? undefined,
    serialNumberMFan: log.serialNumberMFan ?? undefined,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    details: [
      mockGroup("Traceability Summary", [
        mockParameter("Serial Clinching", log.serialNumberClinching),
        mockParameter("Serial M-Fan", log.serialNumberMFan),
        mockParameter("Issue Clinching", clinchingIssues.join(", ") || null),
        mockParameter("Issue M-Fan", mFanIssues.join(", ") || null),
      ]),
      ...mapV2DetailToProcessDetails(log.detail),
    ],
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

const parameterNameMap: Record<string, string> = {
  CHECK_POINT_ALL: "Check Points",
  ECM_ASSY_BOLT_TIGHTEN_QTY_VALUE: "ECM Bolt Qty",
  ECM_ASSY_BOLT_TIGHTEN_VALUE: "ECM Bolt Tighten",
  FINAL_INSPECTION_RAD_CORE_ASM_NAME_LABEL_RESULT: "Final Rad Core Label",
  MOTOR_FAN_ASSY_LABEL_RESULT: "Motor Fan Label",
  NG_BOX_SENSOR_ECM_ASSY_VALUE: "NG Box Long Side",
  NG_BOX_SENSOR_FINAL_INSPECTION_VALUE: "NG Box Long Side",
  RAD_CORE_ASM_NAME_LABEL_RESULT: "Rad Core Label",
};

const formatParameterName = (parameter?: string) => {
  if (!parameter) {
    return "-";
  }

  return (
    parameterNameMap[parameter] ??
    parameter
      .replace(/_/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

const normalizeV2DetailValue = (
  parameter: BackendTraceabilityLogV2DetailParameter
) => {
  if (
    parameter.parameter === "CHECK_POINT_ALL" &&
    Array.isArray(parameter.value)
  ) {
    return parameter.value.map((value) => String(value) === "1");
  }

  return normalizeLogValue(parameter.value);
};

const mapV2DetailParameter = (
  parameter: BackendTraceabilityLogV2DetailParameter,
  index: number
): ProcessLogParameter => {
  const normalizedValue = normalizeV2DetailValue(parameter);
  const values = Array.isArray(normalizedValue)
    ? normalizedValue
    : [normalizedValue];
  const firstValue = values[0] ?? "-";

  return {
    parameterId: index,
    parameterCode: parameter.parameter,
    parameterName: formatParameterName(parameter.parameter),
    dataType: getValueDataType(firstValue),
    status: parameter.status,
    values,
  };
};

const mapV2DetailToProcessDetails = (
  detail?: BackendTraceabilityLogV2["detail"]
): ProcessLogDetail[] =>
  Object.entries(detail ?? {}).map(([processName, parameters]) =>
    mockGroup(
      formatParameterName(processName),
      parameters.map((parameter, index) =>
        mapV2DetailParameter(parameter, index)
      )
    )
  );

const mapMockProcessLog = (log: BackendProcessLogMock): ProcessLog => {
  const isPassed = normalizeOverallStatus(
    log.OverallStatus ?? log.overallStatus
  );
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
        mockParameter("HE Process", log.CapTypePositionResult, log.CapTypePositionResult ?? undefined),
        mockParameter("HE Leak", log.LeakResult, log.LeakResult ?? undefined),
        mockParameter("HE Leak Last Leakage", log.LeakLastLeakageValue),
      ]),
      mockGroup("M-Fan Assembly & Inspection", [
        mockParameter("Serial M-Fan", log.SerialNumberMFan),
        mockParameter("Lot Fan Asm", log.LotFanAsmResult),
        mockParameter("Lot Motor Asm", log.LotMotorAsmResult),
        mockParameter("Lot Guide Asm", log.LotGuideAsmResult),
        mockParameter("Bolt Tighten", log.BoltTightenValue, log.BoltTightenValue === "ON"),
        mockParameter("Bolt Qty", log.BoltTightenQtyValue),
        mockParameter("Nut Tighten", log.NutTightenValue, log.NutTightenValue ?? undefined),
        mockParameter("Rotation Max", log.MFanInspectionRotationSpeedMaxValue),
        mockParameter("Rotation Min", log.MFanInspectionRotationSpeedMinValue),
        mockParameter("Ampere Max", log.MFanInspectionAmpereMaxValue),
        mockParameter("Ampere Min", log.MFanInspectionAmpereMinValue),
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

const isMockProcessLog = (
  log: BackendProcessLog | BackendProcessLogMock | BackendTraceabilityLogV2
): log is BackendProcessLogMock =>
  "SerialNumberClinching" in log;

const isTraceabilityLogV2 = (
  log: BackendProcessLog | BackendProcessLogMock | BackendTraceabilityLogV2
): log is BackendTraceabilityLogV2 =>
  "serialNumberClinching" in log || "serialNumberMFan" in log || "isFinish" in log;

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

const mapV2FullValues = (log: BackendTraceabilityLogV2): ProcessLogFullValues => {
  const detailValues = Object.entries(log.detail ?? {}).flatMap(
    ([processName, parameters]) =>
      parameters.map((parameter) => {
        const normalizedValue = normalizeV2DetailValue(parameter);

        return {
          processCode: processName,
          processName: formatParameterName(processName),
          parameterCode: parameter.parameter,
          parameterName: formatParameterName(parameter.parameter),
          value: Array.isArray(normalizedValue) ? null : normalizedValue,
          values: Array.isArray(normalizedValue)
            ? normalizedValue
            : [normalizedValue],
        };
      })
  );

  return {
    id: log.id,
    serialNumberCode: log.serialNumberClinching ?? undefined,
    clinching: {
      serialNumberCode: log.serialNumberClinching ?? undefined,
      details: [
        {
          parameterCode: "SERIAL_NUMBER_CLINCHING",
          parameterName: "Serial Clinching",
          value: log.serialNumberClinching ?? null,
        },
        {
          parameterCode: "ISSUE_NUMBERS_CLINCHING",
          parameterName: "Issue Clinching",
          value: (log.issueNumbersClinching ?? []).join(", ") || null,
        },
      ],
    },
    mFan: {
      serialNumberCode: log.serialNumberMFan ?? undefined,
      details: [
        {
          parameterCode: "SERIAL_NUMBER_MFAN",
          parameterName: "Serial M-Fan",
          value: log.serialNumberMFan ?? null,
        },
        {
          parameterCode: "ISSUE_NUMBERS_MFAN",
          parameterName: "Issue M-Fan",
          value: (log.issueNumbersMfan ?? []).join(", ") || null,
        },
      ],
    },
    overall: detailValues,
    status: log.status,
    isFinished: log.isFinish,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
};

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
    const response = await api.get<
      ApiListResponse<BackendProcessLog | BackendProcessLogMock | BackendTraceabilityLogV2>
    >(
      TRACEABILITY_LOG_ENDPOINT,
      {
        ...options,
        params: normalizeQuery(query),
      }
    );

    return {
      ...response.data,
      data: response.data.data.map((log) =>
        isMockProcessLog(log)
          ? mapMockProcessLog(log)
          : isTraceabilityLogV2(log)
            ? mapTraceabilityLogV2Response(log)
            : mapProcessLogResponse(log)
      ),
    };
  },

  getTraceabilityLog: async (id: number, options?: ApiRequestOptions) => {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: BackendProcessLog | BackendProcessLogMock | BackendTraceabilityLogV2;
    }>(`${TRACEABILITY_LOG_ENDPOINT}/${id}`, options);

    return {
      ...response.data,
      data: isMockProcessLog(response.data.data)
        ? mapMockProcessLog(response.data.data)
        : isTraceabilityLogV2(response.data.data)
          ? mapTraceabilityLogV2Response(response.data.data)
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
      data: BackendProcessLogFullValues | BackendProcessLogMock | BackendTraceabilityLogV2;
    }>(
      `${TRACEABILITY_LOG_ENDPOINT}/by-serial-number/${encodeURIComponent(serialNumberCode)}`,
      options
    );

    return {
      ...response.data,
      data: isMockProcessLog(response.data.data)
        ? mapMockFullValues(response.data.data)
        : isTraceabilityLogV2(response.data.data)
          ? mapV2FullValues(response.data.data)
        : mapProcessLogFullValuesResponse(response.data.data),
    };
  },

  getTraceabilityLogV2BySerialNumber: async (
    serialNumberCode: string,
    options?: ApiRequestOptions
  ) => {
    const response = await api.get<{
      code?: number;
      status?: string;
      success?: boolean;
      message: string;
      data: TraceabilityLogItem;
    }>(
      `${TRACEABILITY_LOG_ENDPOINT}/by-serial-number/${encodeURIComponent(serialNumberCode)}`,
      options
    );

    return response.data;
  },
};

export default TraceabilityLogService;
