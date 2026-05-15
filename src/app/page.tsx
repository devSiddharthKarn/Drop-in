"use client";

import Image from "next/image";
import { FormEvent, ChangeEvent, DragEvent, useRef, useState } from "react";
import styles from "./page.module.css";

type UploadedTokenResponse = {
  token: number;
};

type FileEntry = {
  _id: string;
  token: number;
  name: string;
  sizeInBytes: string;
  url: string;
  uploadedAt: string;
  expiresAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  error: unknown | null;
};

function formatBytes(value: string) {
  const size = Number(value);

  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const converted = size / 1024 ** power;

  return `${converted.toFixed(converted >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function sanitizeFileName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    return "dropin-file";
  }

  return normalized.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
}

function getFileTag(file: File) {
  const parts = file.name.split(".");
  if (parts.length > 1) {
    return parts.pop()?.toUpperCase() ?? "FILE";
  }

  if (file.type) {
    return file.type.split("/").pop()?.toUpperCase() ?? "FILE";
  }

  return "FILE";
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [shareToken, setShareToken] = useState<number | null>(null);
  const [receiveToken, setReceiveToken] = useState("");
  const [receiveMessage, setReceiveMessage] = useState("");
  const [receiving, setReceiving] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState<FileEntry[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const [isDragging, setIsDragging] = useState(false);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files ?? []));
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
    }
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
  };

  const clearSelectedFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadMessage("Selected files cleared.");
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!files.length) {
      setUploadMessage("Pick at least one file to create a token.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setUploading(true);
    setUploadMessage("Uploading files...");
    setShareToken(null);

    try {
      const response = await fetch("/api/package", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ApiResponse<UploadedTokenResponse>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Upload failed");
      }

      setShareToken(payload.data.token);
      setUploadMessage(payload.message || "Files uploaded successfully.");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const pasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        setReceiveMessage("Clipboard is empty. Paste a token manually.");
        return;
      }
      setReceiveToken(trimmed);
      setReceiveMessage("Token pasted from clipboard.");
    } catch {
      setReceiveMessage("Clipboard access blocked. Paste the token manually.");
    }
  };

  const clearReceiveResults = () => {
    setReceivedFiles([]);
    setReceiveMessage("");
  };

  const handleReceive = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = Number(receiveToken.trim());
    if (!Number.isFinite(token)) {
      setReceiveMessage("Enter a valid token number.");
      setReceivedFiles([]);
      return;
    }

    setReceiving(true);
    setReceiveMessage("Looking up files...");
    setReceivedFiles([]);

    try {
      const response = await fetch(`/api/package?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = (await response.json()) as ApiResponse<FileEntry[]>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Token not found");
      }

      setReceivedFiles(payload.data);
      setReceiveMessage(payload.message || "Files found.");
    } catch (error) {
      setReceiveMessage(error instanceof Error ? error.message : "Could not load files.");
    } finally {
      setReceiving(false);
    }
  };

  const copyToken = async () => {
    if (!shareToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(shareToken));
      setUploadMessage("Token copied to clipboard.");
    } catch {
      setUploadMessage(`Copy failed. Share this token manually: ${shareToken}`);
    }
  };

  const downloadFromCloudinary = async (file: FileEntry) => {
    const response = await fetch(file.url, {
      method: "GET",
      headers: {
        Accept: "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error("Could not download file");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = sanitizeFileName(file.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
  };

  const handleSingleDownload = async (file: FileEntry) => {
    setDownloadingId(file._id);
    try {
      await downloadFromCloudinary(file);
      setReceiveMessage(`Downloaded ${file.name}`);
    } catch {
      setReceiveMessage(`Could not download ${file.name}. Please try again.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!receivedFiles.length) {
      return;
    }

    setDownloadingAll(true);
    let failed = 0;

    for (const file of receivedFiles) {
      try {
        await downloadFromCloudinary(file);
      } catch {
        failed += 1;
      }
    }

    if (failed > 0) {
      setReceiveMessage(`Downloaded ${receivedFiles.length - failed} file(s). ${failed} failed.`);
    } else {
      setReceiveMessage(`Downloaded all ${receivedFiles.length} file(s).`);
    }

    setDownloadingAll(false);
  };

  return (
    <main className={styles.page}>
      <section className={styles.top}>
        <p className={styles.wordmark} aria-hidden="true">
          Drop-in
        </p>

        <div className={styles.heroCard}>
          <div className={styles.brandBlast} aria-hidden="true">DROP-IN</div>
          <div className={styles.heroContent}>
            <div className={styles.brandRow}>
              <Image src="/logo.png" alt="Dropin logo" width={64} height={64} priority className={styles.logo} />
              <div>
                <span className={styles.badge}>Dropin</span>
                <p className={styles.themeLine}>Drop It, Store it and Access it</p>
              </div>
            </div>

            <h1>Share files quickly with token-based access and direct downloads.</h1>
            <p>
              Upload files, generate one share token, and let recipients instantly receive each file
              or download all files at once. Built for quick share, clean access, and a simple flow.
            </p>
            <p>
              Drop-in is a quick file sharing tool for teams and individuals who need to share files
              fast, send large files, and access downloads from any device. If you searched for quick
              share, file sharing, or simple file transfer, this is the workflow you want.
            </p>

            <div className={styles.heroPoints} aria-label="Highlights">
              <span>Quick upload</span>
              <span>Share token</span>
              <span>Single or bulk download</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.workflow} aria-label="Dropin upload and receive">
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Choose files and create a share token</h2>
            <p className={styles.panelCopy}>Select files, create the token, and share it with anyone who needs access.</p>
          </div>

          <form className={styles.form} onSubmit={handleUpload}>
            <div className={styles.uploadGrid}>
              <div className={styles.uploadMain}>
                <label
                  className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneActive : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input ref={fileInputRef} type="file" multiple onChange={onFileChange} />
                  <strong>Select one or more files</strong>
                  <span>All selected files are grouped into one token package.</span>
                  <div className={styles.dropHint}>
                    <div className={styles.dropIcon}>⇣</div>
                    <p>Drag and drop files here</p>
                    <span>Or click to browse from your device</span>
                  </div>
                </label>

                {files.length > 0 ? (
                  <div className={styles.selectionBlock} aria-label="Selected files">
                    <div className={styles.selectionHead}>
                      <p>Selected files</p>
                      <span>{formatBytes(String(totalBytes))}</span>
                    </div>

                    <div className={styles.fileList}>
                      {files.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}`} className={styles.fileItem}>
                          <div className={styles.fileMeta}>
                            <strong>{file.name}</strong>
                            <p>{formatBytes(String(file.size))}</p>
                          </div>
                          <div className={styles.fileActions}>
                            <span className={styles.filePill}>{getFileTag(file)}</span>
                            <button
                              type="button"
                              className={styles.fileRemoveButton}
                              onClick={() => removeSelectedFile(index)}
                              aria-label={`Remove ${file.name}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className={styles.uploadSide}>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Selection</p>
                  <div className={styles.summaryRow}>
                    <span>Files</span>
                    <strong>{files.length}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Total size</span>
                    <strong>{formatBytes(String(totalBytes))}</strong>
                  </div>
                  <div className={styles.summaryActions}>
                    <button className={styles.primaryButton} type="submit" disabled={uploading}>
                      {uploading ? "Sharing..." : "Share"}
                    </button>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={clearSelectedFiles}
                      disabled={!files.length}
                    >
                      Clear selection
                    </button>
                  </div>
                  {uploadMessage ? <p className={styles.helperText}>{uploadMessage}</p> : null}
                </div>

                {shareToken ? (
                  <div className={styles.tokenPanel}>
                    <div>
                      <p className={styles.tokenLabel}>Share token</p>
                      <strong>{shareToken}</strong>
                    </div>
                    <button type="button" className={styles.secondaryButton} onClick={copyToken}>
                      Copy token
                    </button>
                  </div>
                ) : (
                  <div className={styles.tokenPlaceholder}>Token appears here after upload.</div>
                )}
              </aside>
            </div>
          </form>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Use token to view and download files</h2>
            <p className={styles.panelCopy}>Paste the token below to see every shared file, then download one file or all at once.</p>
          </div>

          <form className={styles.form} onSubmit={handleReceive}>
            <div className={styles.receiveGrid}>
              <div className={styles.receiveMain}>
                <label className={styles.field}>
                  <span>Token</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter token shared by sender"
                    value={receiveToken}
                    onChange={(event) => setReceiveToken(event.target.value)}
                  />
                </label>

                <div className={styles.receiveActions}>
                  <button type="button" className={styles.ghostButton} onClick={pasteToken}>
                    Paste token
                  </button>
                  <button className={styles.primaryButton} type="submit" disabled={receiving}>
                    {receiving ? "Checking token..." : "Find files"}
                  </button>
                </div>

                {receiveMessage ? <p className={styles.helperText}>{receiveMessage}</p> : null}
              </div>

              <div className={styles.receiveSide}>
                {receivedFiles.length > 0 ? (
                  <div className={styles.resultsWrap}>
                    <div className={styles.resultHead}>
                      <p>{receivedFiles.length} file(s) available</p>
                      <div className={styles.resultButtons}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={handleDownloadAll}
                          disabled={downloadingAll}
                        >
                          {downloadingAll ? "Downloading all..." : "Download all"}
                        </button>
                        <button type="button" className={styles.ghostButton} onClick={clearReceiveResults}>
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className={styles.results}>
                      {receivedFiles.map((file) => (
                        <article key={file._id} className={styles.resultItem}>
                          <div className={styles.resultMeta}>
                            <strong>{file.name}</strong>
                            <div className={styles.resultStats}>
                              <span>{formatBytes(file.sizeInBytes)}</span>
                              <span>Expires {formatDate(file.expiresAt)}</span>
                            </div>
                            <a className={styles.resultLink} href={file.url} target="_blank" rel="noreferrer">
                              Open source file
                            </a>
                          </div>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => handleSingleDownload(file)}
                            disabled={downloadingId === file._id || downloadingAll}
                          >
                            {downloadingId === file._id ? "Downloading..." : "Download"}
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No files loaded yet.</p>
                    <span>Paste a token to reveal downloadable files.</span>
                  </div>
                )}
              </div>
            </div>
          </form>
        </article>
      </section>

      <section className={styles.contentBlock} aria-label="How Dropin quick share works">
        <h2>How quick sharing works in Dropin</h2>
        <div className={styles.steps}>
          <article className={styles.step}>
            <span>1</span>
            <p>Drop files into upload and generate a package token.</p>
          </article>
          <article className={styles.step}>
            <span>2</span>
            <p>Send the token to teammates, clients, or collaborators.</p>
          </article>
          <article className={styles.step}>
            <span>3</span>
            <p>Recipients use token receive, then download one file or all files.</p>
          </article>
        </div>
      </section>

      <section className={styles.contentBlock} aria-label="Why use Dropin for quick share">
        <h2>Why teams and individuals use Dropin for quick sharing</h2>
        <p>
          Dropin is designed for people who want quick file sharing without complex setup.
          If you need to send project assets, reports, media, or documents, you can upload once,
          share a token, and let others access files from any device.
        </p>
        <p>
          It is a simple file transfer option for fast file sharing, quick access, and easy
          downloads. Share files securely, send a token, and keep collaboration moving.
        </p>
        <p>
          The token model is great for short-lived collaboration. It helps keep sharing direct,
          discoverable, and easy to manage.
        </p>
      </section>

      <section className={styles.contentBlock} aria-label="Secure and fast file sharing">
        <h2>Secure, simple, and fast file sharing</h2>
        <p>
          Drop-in is built for secure file sharing without the noise. Upload your files, receive a
          share token, and let the recipient download securely. If you are searching for secure file
          transfer, private file sharing, or a quick way to send files online, this flow is designed
          to match that intent.
        </p>
        <p>
          Use Drop-in for sending large files, sharing documents with a team, moving assets between
          devices, or delivering files to a client. It is a practical answer to searches like
          “share files fast,” “send files quickly,” “simple file transfer,” and “quick share link.”
        </p>
        <p>
          You can share one file or many, keep the process lightweight, and avoid complicated setup.
          The goal is clear: secure uploads, fast access, and reliable downloads.
        </p>
      </section>

      <section className={styles.contentBlock} aria-label="Frequently asked questions">
        <h2>Quick Share FAQ</h2>
        <div className={styles.faqGrid}>
          <article className={styles.faqItem}>
            <h3>How do I share files fast?</h3>
            <p>
              Use the upload section, select your files, and generate a token. Share that token
              with the recipient.
            </p>
          </article>
          <article className={styles.faqItem}>
            <h3>How do recipients get files?</h3>
            <p>
              They enter the token in the receive section. Dropin shows available files and
              download links.
            </p>
          </article>
          <article className={styles.faqItem}>
            <h3>Can I upload multiple files?</h3>
            <p>
              Yes. Multiple file upload is supported. A single token can map to the full package.
            </p>
          </article>
          <article className={styles.faqItem}>
            <h3>What is the Dropin theme?</h3>
            <p>
              Drop It, Store it and Access it. That is the exact workflow this UI is designed for.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
