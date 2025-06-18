import { Storage } from "@google-cloud/storage";
import settings from "../settings.ts";
import { generateKeyPairSync } from "node:crypto";

async function getStorage() {
  // local dev uses fake-gcs-server
  if (settings.GCP_BUCKET.USE_FAKE_GCS_SERVER) {
    // generate a valid private key to generate a signed URL
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const privateKeyPem = privateKey.export({
      type: "pkcs8",
      format: "pem",
    }).toString("base64");

    const storage = new Storage({
      apiEndpoint: "http://localhost:4443",
      projectId: "fake-project-id",
      credentials: {
        client_email: "fake@example.com",
        private_key: privateKeyPem,
      },
    });

    const bucket = storage.bucket(settings.GCP_BUCKET.BUCKET_NAME);

    const [exists] = await bucket.exists();
    if (!exists) {
      console.info("Bucket does not exist, creating...");
      await bucket.create();
      console.info("Bucket created");
    }

    return storage;
  }
  // production uses real GCP
  return new Storage({
    projectId: settings.GCP_BUCKET.PROJECT_ID,
  });
}

export async function uploadJsonToBucket(json: object, fileName: string) {
  const storage = await getStorage();

  const jsonString = JSON.stringify(json);
  const bucket = storage.bucket(settings.GCP_BUCKET.BUCKET_NAME);
  const file = bucket.file(fileName);
  await file.save(jsonString, {
    contentType: "application/json",
  });
}

export async function downloadJsonFromBucket(fileName: string) {
  const storage = await getStorage();
  const file = storage.bucket(settings.GCP_BUCKET.BUCKET_NAME).file(fileName);
  const [content] = await file.download();
  return JSON.parse(content.toString());
}

export async function getPublicLink(fileName: string) {
  const storage = await getStorage();
  const bucket = storage.bucket(settings.GCP_BUCKET.BUCKET_NAME);
  const file = bucket.file(fileName);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * settings.GCP_BUCKET.SIGNED_URL_EXPIRY_SECONDS,
  });

  return url;
}
