import { describe, it, expect, beforeEach } from "vitest";
import { buffCV, stringAsciiCV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_SYMPTOM_HASH = 101;
const ERR_INVALID_LOCATION_HASH = 102;
const ERR_INVALID_TIMESTAMP = 103;
const ERR_REPORT_ALREADY_EXISTS = 104;
const ERR_INVALID_STATUS = 105;
const ERR_REPORTER_BANNED = 106;
const ERR_INVALID_REPORT_ID = 107;
const ERR_INVALID_PRIVACY_LEVEL = 108;
const ERR_INVALID_SEVERITY = 109;
const ERR_INVALID_CATEGORY = 110;
const ERR_MAX_REPORTS_EXCEEDED = 111;
const ERR_INVALID_UPDATE_PARAM = 112;
const ERR_UPDATE_NOT_ALLOWED = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 114;
const ERR_INVALID_ANONYMITY_LEVEL = 115;
const ERR_INVALID_AGE_GROUP = 116;
const ERR_INVALID_GENDER = 117;
const ERR_INVALID_CONTACT_INFO = 118;
const ERR_INVALID_REPORT_TYPE = 120;

interface Report {
  reporter: string;
  symptomHash: Uint8Array;
  locationHash: Uint8Array;
  timestamp: number;
  status: string;
  privacyLevel: number;
  severity: number;
  category: string;
  anonymityLevel: number;
  ageGroup: string;
  gender: string;
  contactInfo: string | null;
  verificationStatus: boolean;
  reportType: string;
}

interface ReportUpdate {
  updateSymptomHash: Uint8Array;
  updateLocationHash: Uint8Array;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ReportSubmissionMock {
  state: {
    nextReportId: number;
    maxReports: number;
    submissionFee: number;
    authorityContract: string | null;
    bannedReporters: Set<string>;
    reports: Map<number, Report>;
    reportsByReporter: Map<string, number[]>;
    reportUpdates: Map<number, ReportUpdate>;
  } = {
    nextReportId: 0,
    maxReports: 10000,
    submissionFee: 100,
    authorityContract: null,
    bannedReporters: new Set(),
    reports: new Map(),
    reportsByReporter: new Map(),
    reportUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextReportId: 0,
      maxReports: 10000,
      submissionFee: 100,
      authorityContract: null,
      bannedReporters: new Set(),
      reports: new Map(),
      reportsByReporter: new Map(),
      reportUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMaxReports(newMax: number): Result<boolean> {
    if (newMax <= 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.maxReports = newMax;
    return { ok: true, value: true };
  }

  setSubmissionFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.state.submissionFee = newFee;
    return { ok: true, value: true };
  }

  banReporter(reporter: string): Result<boolean> {
    if (this.caller !== this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.bannedReporters.add(reporter);
    return { ok: true, value: true };
  }

  submitReport(
    symptomHash: Uint8Array,
    locationHash: Uint8Array,
    privacyLevel: number,
    severity: number,
    category: string,
    anonymityLevel: number,
    ageGroup: string,
    gender: string,
    contactInfo: string | null,
    reportType: string
  ): Result<number> {
    if (this.state.nextReportId >= this.state.maxReports) return { ok: false, value: ERR_MAX_REPORTS_EXCEEDED };
    if (this.state.bannedReporters.has(this.caller)) return { ok: false, value: ERR_REPORTER_BANNED };
    if (symptomHash.length !== 32) return { ok: false, value: ERR_INVALID_SYMPTOM_HASH };
    if (locationHash.length !== 32) return { ok: false, value: ERR_INVALID_LOCATION_HASH };
    if (privacyLevel < 0 || privacyLevel > 5) return { ok: false, value: ERR_INVALID_PRIVACY_LEVEL };
    if (severity < 1 || severity > 10) return { ok: false, value: ERR_INVALID_SEVERITY };
    if (!category || category.length > 50) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (anonymityLevel < 0 || anonymityLevel > 3) return { ok: false, value: ERR_INVALID_ANONYMITY_LEVEL };
    if (!["0-18", "19-35", "36-60", "60+"].includes(ageGroup)) return { ok: false, value: ERR_INVALID_AGE_GROUP };
    if (!["male", "female", "other"].includes(gender)) return { ok: false, value: ERR_INVALID_GENDER };
    if (contactInfo && contactInfo.length > 100) return { ok: false, value: ERR_INVALID_CONTACT_INFO };
    if (!["symptom", "outbreak", "test-result"].includes(reportType)) return { ok: false, value: ERR_INVALID_REPORT_TYPE };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.submissionFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextReportId;
    const report: Report = {
      reporter: this.caller,
      symptomHash,
      locationHash,
      timestamp: this.blockHeight,
      status: "pending",
      privacyLevel,
      severity,
      category,
      anonymityLevel,
      ageGroup,
      gender,
      contactInfo,
      verificationStatus: false,
      reportType,
    };
    this.state.reports.set(id, report);
    const reporterReports = this.state.reportsByReporter.get(this.caller) || [];
    reporterReports.push(id);
    this.state.reportsByReporter.set(this.caller, reporterReports);
    this.state.nextReportId++;
    return { ok: true, value: id };
  }

  getReport(id: number): Report | null {
    return this.state.reports.get(id) || null;
  }

  updateReport(id: number, updateSymptomHash: Uint8Array, updateLocationHash: Uint8Array): Result<boolean> {
    const report = this.state.reports.get(id);
    if (!report) return { ok: false, value: ERR_INVALID_REPORT_ID };
    if (report.reporter !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (report.status !== "pending") return { ok: false, value: ERR_UPDATE_NOT_ALLOWED };
    if (updateSymptomHash.length !== 32) return { ok: false, value: ERR_INVALID_SYMPTOM_HASH };
    if (updateLocationHash.length !== 32) return { ok: false, value: ERR_INVALID_LOCATION_HASH };

    const updated: Report = {
      ...report,
      symptomHash: updateSymptomHash,
      locationHash: updateLocationHash,
      timestamp: this.blockHeight,
    };
    this.state.reports.set(id, updated);
    this.state.reportUpdates.set(id, {
      updateSymptomHash,
      updateLocationHash,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  setReportStatus(id: number, newStatus: string): Result<boolean> {
    if (this.caller !== this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!["pending", "validated", "rejected"].includes(newStatus)) return { ok: false, value: ERR_INVALID_STATUS };
    const report = this.state.reports.get(id);
    if (!report) return { ok: false, value: ERR_INVALID_REPORT_ID };
    this.state.reports.set(id, { ...report, status: newStatus });
    return { ok: true, value: true };
  }

  getReportCount(): Result<number> {
    return { ok: true, value: this.state.nextReportId };
  }
}

describe("ReportSubmission", () => {
  let contract: ReportSubmissionMock;

  beforeEach(() => {
    contract = new ReportSubmissionMock();
    contract.reset();
  });

  it("submits a report successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const result = contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const report = contract.getReport(0);
    expect(report?.reporter).toBe("ST1TEST");
    expect(report?.symptomHash).toEqual(symptomHash);
    expect(report?.locationHash).toEqual(locationHash);
    expect(report?.privacyLevel).toBe(2);
    expect(report?.severity).toBe(5);
    expect(report?.category).toBe("fever");
    expect(report?.anonymityLevel).toBe(1);
    expect(report?.ageGroup).toBe("19-35");
    expect(report?.gender).toBe("male");
    expect(report?.contactInfo).toBe("contact@example.com");
    expect(report?.reportType).toBe("symptom");
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects submission without authority contract", () => {
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const result = contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid symptom hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(31).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const result = contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SYMPTOM_HASH);
  });

  it("rejects banned reporter", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2TEST";
    contract.banReporter("ST1TEST");
    contract.caller = "ST1TEST";
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    const result = contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_REPORTER_BANNED);
  });

  it("updates a report successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    const updateSymptomHash = new Uint8Array(32).fill(3);
    const updateLocationHash = new Uint8Array(32).fill(4);
    const result = contract.updateReport(0, updateSymptomHash, updateLocationHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const report = contract.getReport(0);
    expect(report?.symptomHash).toEqual(updateSymptomHash);
    expect(report?.locationHash).toEqual(updateLocationHash);
  });

  it("rejects update for non-pending report", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    contract.caller = "ST2TEST";
    contract.setReportStatus(0, "validated");
    contract.caller = "ST1TEST";
    const updateSymptomHash = new Uint8Array(32).fill(3);
    const updateLocationHash = new Uint8Array(32).fill(4);
    const result = contract.updateReport(0, updateSymptomHash, updateLocationHash);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_UPDATE_NOT_ALLOWED);
  });

  it("sets report status successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    contract.caller = "ST2TEST";
    const result = contract.setReportStatus(0, "validated");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const report = contract.getReport(0);
    expect(report?.status).toBe("validated");
  });

  it("rejects status set by non-authority", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    const result = contract.setReportStatus(0, "validated");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("returns correct report count", () => {
    contract.setAuthorityContract("ST2TEST");
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    contract.submitReport(
      symptomHash,
      locationHash,
      3,
      6,
      "cough",
      2,
      "36-60",
      "female",
      null,
      "outbreak"
    );
    const result = contract.getReportCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("rejects submission with max reports exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxReports = 1;
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    const result = contract.submitReport(
      symptomHash,
      locationHash,
      3,
      6,
      "cough",
      2,
      "36-60",
      "female",
      null,
      "outbreak"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_REPORTS_EXCEEDED);
  });

  it("sets submission fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setSubmissionFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.submissionFee).toBe(200);
    const symptomHash = new Uint8Array(32).fill(1);
    const locationHash = new Uint8Array(32).fill(2);
    contract.submitReport(
      symptomHash,
      locationHash,
      2,
      5,
      "fever",
      1,
      "19-35",
      "male",
      "contact@example.com",
      "symptom"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 200, from: "ST1TEST", to: "ST2TEST" }]);
  });
});