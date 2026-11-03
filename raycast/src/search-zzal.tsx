import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  environment,
  Grid,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Zzal } from "@zzal/shared";
import { join } from "path";
import EditForm from "./components/EditForm";
import RegisterForm from "./components/RegisterForm";
import { deleteZzal, fetchZzals } from "./lib/api";

// 실제 썸네일/원본 캐시가 생기기 전까지, 붙여넣기·복사 동작을 검증하기 위한 자리 표시 파일
const mockFilePath = join(environment.assetsPath, "extension-icon.png");

async function pasteZzal() {
  await Clipboard.paste({ file: mockFilePath });
  await showToast({ style: Toast.Style.Success, title: "붙여넣기 완료 (mock)" });
}

async function copyZzal() {
  await Clipboard.copy({ file: mockFilePath });
  await showToast({ style: Toast.Style.Success, title: "복사 완료 (mock)" });
}

function RegisterAction({ onRegistered }: { onRegistered: () => void }) {
  const { push } = useNavigation();
  return (
    <Action
      title="새 짤방 등록"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => push(<RegisterForm onRegistered={onRegistered} />)}
    />
  );
}

function EditAction({ zzal, onUpdated }: { zzal: Zzal; onUpdated: () => void }) {
  const { push } = useNavigation();
  return (
    <Action
      title="수정"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      onAction={() => push(<EditForm zzal={zzal} onUpdated={onUpdated} />)}
    />
  );
}

function DeleteAction({ zzal, onDeleted }: { zzal: Zzal; onDeleted: () => void }) {
  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "짤방을 삭제할까요?",
      message: zzal.name,
      primaryAction: { title: "삭제", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await deleteZzal(zzal.id);
    await showToast({ style: Toast.Style.Success, title: "삭제 완료" });
    onDeleted();
  }

  return (
    <Action
      title="삭제"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={handleDelete}
    />
  );
}

export default function SearchZzal() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchZzals);

  return (
    <Grid isLoading={isLoading} inset={Grid.Inset.Small}>
      {(data ?? []).map((zzal) => (
        <Grid.Item
          key={zzal.id}
          content={Icon.Image}
          title={zzal.name}
          keywords={zzal.keywords}
          actions={
            <ActionPanel>
              <Action title="붙여넣기" icon={Icon.TextInput} onAction={pasteZzal} />
              <Action title="복사" icon={Icon.Clipboard} onAction={copyZzal} />
              <EditAction zzal={zzal} onUpdated={revalidate} />
              <DeleteAction zzal={zzal} onDeleted={revalidate} />
              <RegisterAction onRegistered={revalidate} />
            </ActionPanel>
          }
        />
      ))}
      <Grid.EmptyView
        title="등록된 짤방이 없습니다"
        description="⌘N으로 새 짤방을 등록하세요"
        actions={
          <ActionPanel>
            <RegisterAction onRegistered={revalidate} />
          </ActionPanel>
        }
      />
    </Grid>
  );
}
