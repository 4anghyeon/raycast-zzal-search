import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Grid,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Zzal } from "@zzal/shared/src/types";
import EditForm from "./components/EditForm";
import RegisterForm from "./components/RegisterForm";
import { deleteZzal, fetchOriginal, fetchZzals } from "./lib/api";
import { errorMessage, errorToastAction } from "./lib/error-message";
import { hasCachedOriginal, hasCachedThumb, originalPath, saveOriginal, thumbPath } from "./lib/files";
import { useOriginalFallbackSync } from "./lib/use-original-fallback-sync";
import { useThumbnailSync } from "./lib/use-thumbnail-sync";

async function ensureOriginalPath(zzal: Zzal): Promise<string> {
  if (hasCachedOriginal(zzal.id, zzal.ext)) {
    return originalPath(zzal.id, zzal.ext);
  }

  await showToast({ style: Toast.Style.Animated, title: "원본 다운로드 중..." });

  let data: ArrayBuffer | null;
  try {
    data = await fetchOriginal(zzal.id);
  } catch {
    throw new Error("오프라인이라 받을 수 없습니다");
  }
  if (!data) {
    throw new Error("원본 파일을 받아올 수 없습니다");
  }

  saveOriginal(zzal.id, zzal.ext, data);
  return originalPath(zzal.id, zzal.ext);
}

async function pasteZzal(zzal: Zzal) {
  try {
    const path = await ensureOriginalPath(zzal);
    try {
      await Clipboard.paste({ file: path });
      await showToast({ style: Toast.Style.Success, title: "붙여넣기 완료" });
    } catch {
      // 붙여넣기를 지원하지 않는 앱일 수 있으니 복사로 대체한다.
      await Clipboard.copy({ file: path });
      await showToast({ style: Toast.Style.Success, title: "붙여넣기 대신 복사했습니다" });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "붙여넣기 실패",
      message: errorMessage(error),
      primaryAction: errorToastAction(error),
    });
  }
}

async function copyZzal(zzal: Zzal) {
  try {
    const path = await ensureOriginalPath(zzal);
    await Clipboard.copy({ file: path });
    await showToast({ style: Toast.Style.Success, title: "복사 완료" });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "복사 실패",
      message: errorMessage(error),
      primaryAction: errorToastAction(error),
    });
  }
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

    try {
      await deleteZzal(zzal.id);
      await showToast({ style: Toast.Style.Success, title: "삭제 완료" });
      onDeleted();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "삭제 실패",
        message: errorMessage(error),
        primaryAction: errorToastAction(error),
      });
    }
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
  const { data, isLoading, revalidate } = useCachedPromise(fetchZzals, [], {
    onError: (error) => {
      showFailureToast(error, { title: "동기화 실패", primaryAction: errorToastAction(error) });
    },
  });
  useThumbnailSync(data ?? []);
  useOriginalFallbackSync(data ?? []);

  function gridContent(zzal: Zzal) {
    if (hasCachedThumb(zzal.id)) return thumbPath(zzal.id);
    if (hasCachedOriginal(zzal.id, zzal.ext)) return originalPath(zzal.id, zzal.ext);
    return Icon.Image;
  }

  return (
    <Grid isLoading={isLoading} inset={Grid.Inset.Zero}>
      {(data ?? []).map((zzal) => (
        <Grid.Item
          key={zzal.id}
          content={gridContent(zzal)}
          title={zzal.name}
          keywords={zzal.keywords}
          actions={
            <ActionPanel>
              <Action title="붙여넣기" icon={Icon.TextInput} onAction={() => pasteZzal(zzal)} />
              <Action title="복사" icon={Icon.Clipboard} onAction={() => copyZzal(zzal)} />
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
