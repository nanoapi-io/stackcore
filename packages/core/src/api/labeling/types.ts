import { z } from "zod";

export const uploadTemporaryContentPayloadSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export type UploadTemporaryContentPayload = z.infer<
  typeof uploadTemporaryContentPayloadSchema
>;

export function prepareUploadTemporaryContent(
  payload: UploadTemporaryContentPayload,
) {
  return {
    url: "/temp",
    method: "POST",
    body: payload,
  };
}

export type UploadTemporaryContentResponse = {
  path: string;
  bucketName: string;
};

export const startLabelingPayloadSchema = z.object({
  manifestId: z.number().int().min(1),
  fileMapName: z.string(),
});

export type StartLabelingPayload = z.infer<typeof startLabelingPayloadSchema>;

export type StartLabelingResponse = {
  message: string;
};
