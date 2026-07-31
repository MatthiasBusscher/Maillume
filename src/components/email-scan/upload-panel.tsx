import type { ChangeEvent, ReactNode } from "react";

import type { Dictionary } from "@/lib/i18n/dictionary";

type UploadPanelProps = {
  accept: string;
  description: string;
  dictionary: Dictionary;
  disabled: boolean;
  fileName: string;
  fileStatus: string;
  icon: ReactNode;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  title: string;
};

export function UploadPanel({
  accept,
  description,
  dictionary,
  disabled,
  fileName,
  fileStatus,
  icon,
  label,
  onChange,
  title,
}: UploadPanelProps) {
  return (
    <div className="mb-5 border border-dashed border-[#8c969f] bg-[#f3f6f6] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111711]">
            <span className="text-[#087b72]">{icon}</span>
            {title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[#4e5965]">{description}</p>
          <p className="mt-2 font-mono text-[10px] uppercase text-[#6a747e]">
            {dictionary.form.fileLimits}
          </p>
        </div>
        <label className={`inline-flex min-h-10 w-full items-center justify-center border border-[#111711] px-3 py-2 text-center text-sm font-semibold leading-5 transition sm:w-auto sm:max-w-48 ${
          disabled
            ? "cursor-not-allowed border-[#cbd1d6] bg-[#e9edef] text-[#77818b]"
            : "cursor-pointer bg-white text-[#111711] hover:bg-[#111711] hover:text-white"
        }`}>
          {label}
          <input className="sr-only" type="file" accept={accept} onChange={onChange} disabled={disabled} />
        </label>
      </div>

      {fileName ? (
        <div className="mt-3 border-l-4 border-[#087b72] bg-white px-3 py-2 text-sm text-[#26313b]">
          <span className="font-semibold">{dictionary.form.selectedFile}:</span> {fileName}
          {fileStatus ? <span className="mt-1 block text-[#087b72]">{fileStatus}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
