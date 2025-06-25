export type UploadTemporaryContentPayload = {
  path: string;
  content: string;
};

export function prepareUploadTemporaryContent(
  payload: UploadTemporaryContentPayload,
): {
  url: string;
  method: "POST";
  body: UploadTemporaryContentPayload;
} {
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

export type StartLabelingPayload = {
  manifestId: number;
  fileMapName: string;
};

export type StartLabelingResponse = {
  message: string;
};
