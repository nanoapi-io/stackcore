import { downloadTemporaryFileFromBucket } from "@stackcore/storage";
import z from "zod";

export async function startLabeling(
  manifestId: number,
  fileMapName: string,
) {
  const fileMapContent = await downloadTemporaryFileFromBucket(fileMapName);
  const fileMapSchema = z.record(z.string(), z.string().nullable());

  const fileMapParsed = fileMapSchema.safeParse(JSON.parse(fileMapContent));

  if (!fileMapParsed.success) {
    throw new Error(`Invalid file map: ${fileMapContent}`);
  }

  const fileMap = fileMapParsed.data;

  // TODO: perform labeling
  console.log(
    "TODO start labeling manifestId:",
    manifestId,
    "fileMap:",
    fileMap,
  );
}
