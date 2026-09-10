export function downloadBase64File(
  fileName: string,
  mimeType: string,
  contentBase64: string,
) {
  const bytes = atob(contentBase64);
  const arr = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    arr[index] = bytes.charCodeAt(index);
  }
  const blob = new Blob([arr], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
