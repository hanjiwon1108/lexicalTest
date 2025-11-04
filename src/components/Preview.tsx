import React from "react";

type Preview = null | { type: "embed" | "iframe" | "link"; src: string };

export default function PreviewComponent({
  preview,
  lastDetectedUrl,
}: {
  preview: Preview;
  lastDetectedUrl: string | null;
}): JSX.Element | null {
  if (!preview && !lastDetectedUrl) return null;

  if (preview) {
    return (
      <div className="iframe-preview">
        {preview.type === "embed" || preview.type === "iframe" ? (
          <iframe
            src={preview.src}
            title="URL Preview"
            loading="lazy"
            sandbox="allow-forms allow-scripts allow-same-origin"
          />
        ) : (
          <div style={{ padding: 12 }}>
            <p>이 URL은 iframe으로 표시할 수 없습니다. 새 탭에서 열기:</p>
            <a href={preview.src} target="_blank" rel="noopener noreferrer">
              {preview.src}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="iframe-preview">
      <div style={{ padding: 12 }}>
        <p>감지된 URL: {lastDetectedUrl}</p>
        <p>이 URL은 자동 미리보기를 생성할 수 없습니다. 새 탭에서 열기:</p>
        <a
          href={lastDetectedUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          {lastDetectedUrl}
        </a>
      </div>
    </div>
  );
}
