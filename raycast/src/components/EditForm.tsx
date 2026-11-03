import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { Zzal } from "@zzal/shared/src/types";
import { useState } from "react";
import { updateZzal } from "../lib/api";
import { errorMessage, errorToastAction } from "../lib/error-message";

interface FormValues {
  name: string;
  keywords: string;
}

interface EditFormProps {
  zzal: Zzal;
  onUpdated?: () => void;
}

export default function EditForm({ zzal, onUpdated }: EditFormProps) {
  const [name, setName] = useState(zzal.name);
  const [keywords, setKeywords] = useState(zzal.keywords.join(", "));
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    try {
      await updateZzal(zzal.id, { name: values.name, keywords: values.keywords.split(",") });
      await showToast({ style: Toast.Style.Success, title: "수정 완료" });
      onUpdated?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "수정 실패",
        message: errorMessage(error),
        primaryAction: errorToastAction(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> title="수정" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="이름" value={name} onChange={setName} />
      <Form.TextField
        id="keywords"
        title="키워드"
        placeholder="쉼표로 구분 (예: 고양이, 놀람)"
        value={keywords}
        onChange={setKeywords}
      />
    </Form>
  );
}
