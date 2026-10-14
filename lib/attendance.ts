import "server-only";

type AttendanceEmployee = {
  id: number;
  employeeId: string;
  name: string;
  designation: string;
  contact: string;
  status: string;
  assignedBranchId: string | null;
  hasPassword: boolean;
};

export type AttendanceDirectory = {
  employees: AttendanceEmployee[];
  branches: Array<{ id: number; branchId: string; branchName: string; city: string; status: boolean }>;
};

function config() {
  const baseUrl = process.env.ATTENDANCE_API_URL?.replace(/\/$/, "");
  const key = process.env.ATTENDANCE_INTEGRATION_KEY;
  if (!baseUrl || !key) throw new Error("Attendance integration is not configured.");
  return { baseUrl, key };
}

async function attendanceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, key } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Accept": "application/json", "Content-Type": "application/json", "X-Aryan-Integration-Key": key, ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = result && typeof result === "object" && "errors" in result ? (result as { errors?: Record<string, string[]> }).errors : null;
    const firstError = errors ? Object.values(errors).flat().find(Boolean) : "";
    const message = result && typeof result === "object" && "message" in result ? String(result.message || "") : "";
    const error = result && typeof result === "object" && "error" in result ? String(result.error || "") : "";
    throw new Error(firstError || message || error || "Attendance service is unavailable.");
  }
  return result as T;
}

export function getAttendanceDirectory() {
  return attendanceRequest<AttendanceDirectory>("/business/directory");
}

export function assignAttendanceEmployee(input: { employeeId: string; branchId: string; password?: string }) {
  return attendanceRequest<{ message: string }>("/business/assign", { method: "POST", body: JSON.stringify(input) });
}

export function changeAttendancePassword(input: { employeeId: string; branchId: string; currentPassword: string; newPassword: string }) {
  return attendanceRequest<{ message: string }>("/business/change-password", { method: "POST", body: JSON.stringify(input) });
}

export async function verifyAttendanceLogin(input: { employeeId: string; branchId: string; password: string }) {
  const result = await attendanceRequest<{ employee?: { employeeId?: string; name?: string; designation?: string }; branch?: { branchId?: string; branchName?: string } }>(
    "/business/login",
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!result.employee?.employeeId) throw new Error("Incorrect employee ID or password.");
  if (!result.branch?.branchId) throw new Error("This employee is not assigned to a branch. Ask an administrator to assign one.");
  return {
    employee: { employeeId: result.employee.employeeId, name: result.employee.name || result.employee.employeeId, designation: result.employee.designation || "" },
    branch: { branchId: result.branch.branchId, branchName: result.branch.branchName || result.branch.branchId },
  };
}
