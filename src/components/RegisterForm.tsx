import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { basename, extname } from "path";
import { useState } from "react";
import { registerZzal } from "../lib/api";
import { isImageFile } from "../lib/image";

interface FormValues {
  files: string[];
  name: string;
  keywords: string;
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

    const result = await registerZzal(filePath, values.name, values.keywords.split(","));
    if (result.status === "duplicate") {
      await showToast({ style: Toast.Style.Failure, title: "이미 등록된 짤방입니다" });
      return;
    }

    await showToast({ style: Toast.Style.Success, title: "등록 완료" });
    onRegistered?.();
    pop();
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
