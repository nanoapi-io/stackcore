import { Storage } from "@google-cloud/storage";
import settings from "@stackcore/settings";
import { generateKeyPairSync } from "node:crypto";

async function getStorage() {
  // local dev uses fake-gcs-server
  if (settings.GCP_BUCKET.USE_MOCK_GCP_STORAGE) {
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
      // needed to generate a signed URL
      credentials: {
        client_email: "fake@example.com",
        private_key: privateKeyPem,
      },
    });

    const manifestBucket = storage.bucket(
      settings.GCP_BUCKET.MANIFEST_BUCKET_NAME,
    );
    const [manifestExists] = await manifestBucket.exists();
    if (!manifestExists) {
      console.info("Bucket does not exist, creating...");
      await manifestBucket.create();
      console.info("Bucket created");
    }

    const temporaryBucket = storage.bucket(
      settings.GCP_BUCKET.TEMPORARY_BUCKET_NAME,
    );
    const [temporaryExists] = await temporaryBucket.exists();
    if (!temporaryExists) {
      console.info("Bucket does not exist, creating...");
      await temporaryBucket.create();
      console.info("Bucket created");
    }

    return storage;
  }
  // production uses real GCP
  return new Storage({
    projectId: settings.GCP_BUCKET.PROJECT_ID,
  });
}

async function getManifestBucket() {
  const storage = await getStorage();
  return storage.bucket(settings.GCP_BUCKET.MANIFEST_BUCKET_NAME);
}

async function getTemporaryBucket() {
  const storage = await getStorage();
  return storage.bucket(settings.GCP_BUCKET.TEMPORARY_BUCKET_NAME);
}

export async function uploadManifestToBucket(json: object, fileName: string) {
  const bucket = await getManifestBucket();
  const file = bucket.file(fileName);
  const jsonString = JSON.stringify(json);
  await file.save(jsonString, {
    contentType: "application/json",
  });
}

export async function downloadManifestFromBucket(
  fileName: string,
): Promise<object> {
  const bucket = await getManifestBucket();
  const file = bucket.file(fileName);
  const [content] = await file.download();
  const manifest = JSON.parse(content.toString()) as object;
  return manifest;
}

export async function getManifestPublicLink(
  fileName: string,
): Promise<string> {
  const bucket = await getManifestBucket();

  const file = bucket.file(fileName);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() +
      1000 * settings.GCP_BUCKET.SIGNED_URL_EXPIRY_SECONDS,
  });

  return url;
}

export async function uploadTemporaryFileToBucket(
  fileName: string,
  content: string,
) {
  const bucket = await getTemporaryBucket();
  const file = bucket.file(fileName);
  await file.save(content);
}

export async function downloadTemporaryFileFromBucket(
  fileName: string,
): Promise<string> {
  const bucket = await getTemporaryBucket();
  const file = bucket.file(fileName);
  const [content] = await file.download();
  return content.toString();
}
