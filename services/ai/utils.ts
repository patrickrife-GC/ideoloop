export const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean
      .replace(/^```json\s?/, "")
      .replace(/^```\s?/, "")
      .replace(/```$/, "");
  }
  return clean.trim();
};

export const getCleanMimeType = (blob: Blob) => {
  const fullMimeType = blob.type || "audio/webm";
  return fullMimeType.split(";")[0];
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (base64String) {
        resolve(base64String.split(",")[1]);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
