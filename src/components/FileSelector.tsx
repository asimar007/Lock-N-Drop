import React, { useCallback, useState } from "react";
import {
  Upload,
  X,
  File,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  Folder,
} from "lucide-react";
import { formatFileSize } from "../utils/fileUtils";

interface FileSelectorProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

export const FileSelector: React.FC<FileSelectorProps> = ({
  onFilesSelected,
  selectedFiles,
  maxFiles = 10,
  maxFileSize = 20 * 1024 * 1024, // 20MB default
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragOver to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const validFiles = files.filter((file) => {
        if (file.size > maxFileSize) {
          console.warn(
            `File ${file.name} is too large (${formatFileSize(
              file.size
            )}). Maximum size is ${formatFileSize(maxFileSize)}.`
          );
          return false;
        }
        return true;
      });

      const totalFiles = validFiles.length + selectedFiles.length;
      if (totalFiles > maxFiles) {
        console.warn(
          `Cannot add ${validFiles.length} files. Maximum ${maxFiles} files allowed.`
        );
        const allowedCount = maxFiles - selectedFiles.length;
        const filesToAdd = validFiles.slice(0, allowedCount);
        onFilesSelected([...selectedFiles, ...filesToAdd]);
      } else {
        onFilesSelected([...selectedFiles, ...validFiles]);
      }
    },
    [maxFileSize, maxFiles, selectedFiles, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }

      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [processFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      onFilesSelected(newFiles);
    },
    [selectedFiles, onFilesSelected]
  );

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <Image className="h-5 w-5 text-purple-500" />;
    if (mimeType.startsWith("video/"))
      return <Video className="h-5 w-5 text-red-500" />;
    if (mimeType.startsWith("audio/"))
      return <Music className="h-5 w-5 text-green-500" />;
    if (mimeType.includes("pdf") || mimeType.includes("document"))
      return <FileText className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes("zip") || mimeType.includes("archive"))
      return <Archive className="h-5 w-5 text-orange-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  if (selectedFiles.length === 0) {
    return (
      <div
        className={`relative border-2 border-dashed rounded-xl p-5 transition-all duration-300 cursor-pointer group ${
          isDragOver
            ? "border-blue-400 bg-blue-50/10 scale-[1.02] shadow-lg"
            : "border-slate-300 dark:border-white/20 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/5 dark:hover:bg-blue-500/10"
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept="*/*"
        />

        <div className="text-center space-y-2 pointer-events-none">
          <div
            className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all duration-300 ${
              isDragOver
                ? "bg-blue-100 dark:bg-blue-500/20 scale-110"
                : "bg-slate-100 dark:bg-white/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 group-hover:scale-105"
            }`}
          >
            <Upload
              className={`h-6 w-6 transition-colors duration-300 ${
                isDragOver
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
              }`}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-0.5">
              {isDragOver ? "Drop contents" : "Drop files or click"}
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-500">
              Max {formatFileSize(maxFileSize)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected Files List */}
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {selectedFiles.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/5 rounded-xl border border-slate-200 dark:border-white/10 group hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">{getFileTypeIcon(file.type)}</div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-gray-200 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-500 font-medium">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <button
              onClick={() => removeFile(index)}
              className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add More Files */}
      {selectedFiles.length < maxFiles && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-3 transition-all duration-300 cursor-pointer group ${
            isDragOver
              ? "border-blue-400 bg-blue-50/10 scale-[1.02]"
              : "border-slate-300 dark:border-white/20 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/5 dark:hover:bg-blue-500/10"
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            accept="*/*"
          />

          <div className="text-center pointer-events-none">
            <div className="flex items-center justify-center space-x-2">
              <Folder className="h-4 w-4 text-slate-500 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              <p className="text-xs font-medium text-slate-600 dark:text-gray-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                {isDragOver ? "Drop more" : "Add more files"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
