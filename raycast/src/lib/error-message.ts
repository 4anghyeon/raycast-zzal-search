import { openExtensionPreferences, Toast } from "@raycast/api";
import { ApiError } from "./api";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 401이면 토큰/URL이 잘못됐을 가능성이 높으니 토스트에 설정 열기 액션을 붙여준다.
export function errorToastAction(error: unknown): Toast.ActionOptions | undefined {
  if (error instanceof ApiError && error.status === 401) {
    return { title: "설정 열기", onAction: () => openExtensionPreferences() };
  }
  return undefined;
}
