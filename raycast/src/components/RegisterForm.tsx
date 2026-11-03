import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { isSupportedImageExt } from "@zzal/shared/src/image-formats";
import { basename, extname } from "path";
import { useState } from "react";
import { registerZzal } from "../lib/api";
import { errorMessage } from "../lib/error-message";

interface FormValues {
  files: string[];
  name: string;
  keywords: string;
}

// FilePicker가 고른 파일이 PLAN이 지원하는 이미지 확장자인지만 가볍게 확인한다.
// 실제 형식 검증(매직 바이트)은 서버가 한다.
function isImageFile(filePath: string): boolean {
  return isSupportedImageExt(extname(filePath).slice(1));
}

interface RegisterFormProps {
  onRegistered?: () => void;
}

export default function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [fileError, setFileError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function handleFilesChange(newFiles: string[]) {
    const validFiles = newFiles.filter(isImageFile);
    const hasInvalid = validFiles.length !== newFiles.length;

    setFiles(validFiles);
    setFileError(hasInvalid ? "이미지 파일만 등록할 수 있습니다" : undefined);

    const [filePath] = validFiles;
    if (filePath && name === "") {
      setName(basename(filePath, extname(filePath)));
    }
  }

  async function handleSubmit(values: FormValues) {
    const [filePath] = values.files;
    if (!filePath) {
      await showToast({ style: Toast.Style.Failure, title: "파일을 선택해주세요" });
      return;
    }
    if (!isImageFile(filePath)) {
      await showToast({ style: Toast.Style.Failure, title: "이미지 파일만 등록할 수 있습니다" });
      return;
    }

    try {
      const result = await registerZzal(filePath, values.name, values.keywords.split(","));
      if (result.status === "duplicate") {
        await showToast({ style: Toast.Style.Failure, title: "이미 등록된 짤방입니다" });
        return;
      }

      await showToast({ style: Toast.Style.Success, title: "등록 완료" });
      onRegistered?.();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "등록 실패", message: errorMessage(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> title="등록" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="짤방 파일"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={handleFilesChange}
      />
      {fileError && <Form.Description text={fileError} />}
      <Form.TextField id="name" title="이름" placeholder="짤방 이름" value={name} onChange={setName} />
      <Form.TextField id="keywords" title="키워드" placeholder="쉼표로 구분 (예: 고양이, 놀람)" />
    </Form>
  );
}
