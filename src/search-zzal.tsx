import { Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchZzals } from "./lib/api";

export default function SearchZzal() {
  const { data, isLoading } = useCachedPromise(fetchZzals);

  return (
    <Grid isLoading={isLoading} inset={Grid.Inset.Small}>
      {(data ?? []).map((zzal) => (
        <Grid.Item key={zzal.id} content={Icon.Image} title={zzal.name} keywords={zzal.keywords} />
      ))}
    </Grid>
  );
}
