import React from "react";
import { X, Shield, FileText } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden bg-black border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {title === "Privacy Policy" ? (
              <Shield className="h-5 w-5 text-emerald-400" />
            ) : (
              <FileText className="h-5 w-5 text-blue-400" />
            )}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] text-gray-300 space-y-4 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicy: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = (props) => (
  <Modal {...props} title="Privacy Policy">
    <p>
      <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
    </p>

    <h3 className="text-white font-semibold text-base mt-4">1. Introduction</h3>
    <p>
      Lock-N-Drop ("we", "our", or "us") is committed to protecting your
      privacy. This Privacy Policy explains how we handle your information when
      you use our secure file transfer service.
    </p>

    <h3 className="text-white font-semibold text-base mt-4">
      2. Zero Tolerance Data Retention
    </h3>
    <p>
      We are a privacy-first service. We do not store your files permanently.
      All files are end-to-end encrypted on your device before they reach our
      servers. We do not have access to your encryption keys, meaning we cannot
      read your files.
    </p>
    <ul className="list-disc pl-5 space-y-1 mt-2">
      <li>Files are automatically deleted after 24 hours (or sooner).</li>
      <li>
        Encryption keys are generated on your client and never stored by us.
      </li>
    </ul>

    <h3 className="text-white font-semibold text-base mt-4">
      3. Information We Collect
    </h3>
    <p>We collect minimal data necessary to operate the service:</p>
    <ul className="list-disc pl-5 space-y-1 mt-2">
      <li>
        <strong>Technical Logs:</strong> IP addresses and timestamps for
        security monitoring and abuse prevention.
      </li>
      <li>
        <strong>Analytics:</strong> Anonymous usage data (via Google Analytics)
        to improve our service. You can opt-out via browser settings.
      </li>
    </ul>

    <h3 className="text-white font-semibold text-base mt-4">4. Cookies</h3>
    <p>
      We use essential cookies for service operation and analytics cookies to
      understand usage patterns.
    </p>
  </Modal>
);

export const TermsOfService: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = (props) => (
  <Modal {...props} title="Terms of Service">
    <p>
      <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
    </p>

    <h3 className="text-white font-semibold text-base mt-4">
      1. Acceptance of Terms
    </h3>
    <p>
      By accessing Lock-N-Drop, you agree to these Terms of Service. If you do
      not agree, do not use the service.
    </p>

    <h3 className="text-white font-semibold text-base mt-4">
      2. Usage Restrictions
    </h3>
    <p>You agree not to use Lock-N-Drop for:</p>
    <ul className="list-disc pl-5 space-y-1 mt-2">
      <li>
        Sharing illegal content, malware, or copyrighted material without
        permission.
      </li>
      <li>Any activity that violates local or international laws.</li>
      <li>Attempting to exploit or harm the service infrastructure.</li>
    </ul>

    <h3 className="text-white font-semibold text-base mt-4">
      3. Disclaimer of Warranties
    </h3>
    <p>
      The service is provided "AS IS" without warranties of any kind. We
      generally do not guarantee that the service will be error-free or
      uninterrupted. We are not liable for any data loss.
    </p>

    <h3 className="text-white font-semibold text-base mt-4">
      4. Changes to Terms
    </h3>
    <p>
      We reserve the right to modify these terms at any time. Continued use
      constitutes acceptance of changes.
    </p>
  </Modal>
);
