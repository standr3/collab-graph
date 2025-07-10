import React, { useState } from 'react';

interface AddNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (label: string) => void;
  errorMessage?: string;
}

const AddNodeDialog: React.FC<AddNodeDialogProps> = ({ isOpen, onClose, onSubmit, errorMessage }) => {
  const [label, setLabel] = useState('Nod Nou');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(label);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <form onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold mb-4">Add New Node</h2>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="border p-2 w-full mb-4"
            autoFocus
          />
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNodeDialog;
