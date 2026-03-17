import React from 'react';
import { XIcon } from './Icons';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onOverride?: () => void; // Optional for override scenarios
    overrideText?: string; // Optional text for the override button
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onOverride,
    overrideText,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    aria-label="Close"
                >
                    <XIcon className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <p className="text-sm text-gray-700 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    {onOverride && overrideText && (
                        <button
                            onClick={onOverride}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-md hover:bg-amber-600 transition-colors"
                        >
                            {overrideText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                        {confirmText}
                    </button>
                    {cancelText && (
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs font-medium rounded-md hover:bg-gray-300 transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
